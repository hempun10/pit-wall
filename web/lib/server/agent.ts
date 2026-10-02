import {openai} from '@ai-sdk/openai'
import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'
import {generateText, hasToolCall, stepCountIs, tool, type ToolSet} from 'ai'
import {z} from 'zod'
import type {Tyre} from '@/lib/f1'
import {groq} from '@/lib/sanity'
import type {Checked} from '@/lib/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'

// What each tyre asks the agent for
const DIFFICULTY: Record<Tyre, string> = {
  soft: 'one fact from a single result row of this race (winner, pole sitter, a driver’s finishing position, the winner’s team, pit stops).',
  medium: 'comparing rows within this race (most places gained, teammate battles, number of retirements, best-placed team, who started where).',
  hard: 'aggregating across every completed 2026 race up to and including this round (wins, podiums, retirements, Grand Prix points so far).',
}

const SYSTEM = `You are the race engineer behind Pit Wall, an F1 quiz for people who are new to Formula 1.
Write ONE multiple-choice question about the 2026 season, verify its answer against the race data, then call submit_question.

Tools:
- data_* tools query the race dataset with GROQ (types: race, raceResult, driver, team, circuit, driverStanding, teamStanding).
- rules_* tools read a knowledge base of beginner F1 rules. Use it to explain one F1 term your question uses (grid, pole, DNF, pit stop, points, sprint...).

Rules:
1. Run your answerQuery with data_groq_query before submitting. It must return a single string or number, never an object, array or null.
2. answerQuery is self-contained GROQ with literal values, no $parameters. Driver answers return driver->name; team answers return team->name.
3. The answer must be unambiguous. Check for ties (look at the top two rows) and pick another question if there is one.
4. Use the precise fields: pole position is polePosition == true (not gridPosition 1, which differs after grid penalties); a podium is position <= 3; a retirement has no position.
   raceResult.points counts Grand Prix points only; sprint points are not included. If you ask about points, say "Grand Prix points".
   Never say "championship" or "standings" for a sum of raceResult.points: the championship also counts sprints. driverStanding/teamStanding hold the championship table as of the latest round only, so use them only for questions about the latest completed round.
5. Only use races where race.completed == true, and only rounds up to the one you are given.
6. Question: plain English, under 25 words, no answer hints, and never list choices in it: the app adds the options. It must contain one F1 term a newcomer may not know (grid, pole position, podium, pit stop, retirement/DNF, Grand Prix points, fastest lap, sprint...).
7. term is that exact phrase from your question. termExplanation: one or two sentences for a newcomer, based only on what you read in the knowledge base. kbEntry is the entry path you read.
8. Be quick: use the data reference below instead of exploring the schema, and read one knowledge base entry.
9. pitStops of 0 for a finisher usually means the stop data is missing, not a no-stop race: never base a question on a zero pit-stop count.
10. Skip questions whose answer is fixed by the rules rather than the race (e.g. the winner's points are always 25).`

const Submission = z.object({
  question: z.string(),
  answerQuery: z.string().describe('GROQ query that returns the single correct answer'),
  answerKind: z.enum(['driver', 'team', 'number']),
  term: z.string().describe('The F1 term the question uses, e.g. "grid position"'),
  termExplanation: z.string(),
  kbEntry: z.string().describe('Knowledge base entry path the explanation came from'),
})
export type Submission = z.infer<typeof Submission>

const endpoint = (name: string) => `https://api.sanity.io/v1/context/organizations/${process.env.SANITY_ORG_ID}/mcp/${name}`
const auth = () => ({Authorization: `Bearer ${process.env.SANITY_ORG_TOKEN}`})

// ponytail: in-memory cache per server instance; fine for a demo, refetch is cheap if it is cold
const initialContexts = new Map<string, string>()
async function initialContext(name: string) {
  if (!initialContexts.has(name)) {
    const res = await fetch(`${endpoint(name)}/initial-context`, {headers: auth()})
    initialContexts.set(name, res.ok ? await res.text() : '')
  }
  return initialContexts.get(name)!
}

const MAX_TOOL_TEXT = 4000
// initial_context is already in the system prompt; schema_explorer and array_field_reader cost
// ~1.7k tokens of definitions on every step and this schema is small enough not to need them
const KEEP = new Set(['groq_query', 'knowledge_base_read', 'knowledge_base_search'])

// Both endpoints expose a tool called initial_context, so prefix each set to keep them apart.
// Tool output is resent to the model on every step, so a broad query is cut short instead of
// burning the token budget; the model is told to narrow it.
type ToolCall = {tool: string; input: unknown}

async function prefixedTools(client: MCPClient, prefix: string, onCall?: (call: ToolCall) => void): Promise<ToolSet> {
  return Object.fromEntries(
    Object.entries(await client.tools())
      .filter(([name]) => KEEP.has(name))
      .map(([name, t]) => [
        `${prefix}_${name}`,
        {
          ...t,
          execute: async (input: unknown, options: Parameters<NonNullable<typeof t.execute>>[1]) => {
            onCall?.({tool: `${prefix}_${name}`, input})
            const out = (await t.execute!(input as never, options)) as {content?: {type: string; text?: string}[]}
            for (const c of out.content ?? []) {
              if (c.text && c.text.length > MAX_TOOL_TEXT) c.text = `${c.text.slice(0, MAX_TOOL_TEXT)}\n[truncated: narrow the query or project fewer fields]`
            }
            return out
          },
        },
      ]),
  )
}

// Opens both Sanity Context endpoints: GROQ over the race dataset, and the rules Knowledge Base
async function connect(onCall?: (call: ToolCall) => void) {
  const dataName = process.env.SANITY_MCP_DATA!
  const rulesName = process.env.SANITY_MCP_RULES!
  const [data, rules, dataCtx, rulesCtx] = await Promise.all([
    createMCPClient({transport: {type: 'http', url: endpoint(dataName), headers: auth()}}),
    createMCPClient({transport: {type: 'http', url: endpoint(rulesName), headers: auth()}}),
    initialContext(dataName),
    initialContext(rulesName),
  ])
  const close = () => Promise.all([data.close(), rules.close()])
  try {
    const tools = {...(await prefixedTools(data, 'data', onCall)), ...(await prefixedTools(rules, 'rules', onCall))}
    return {tools, references: `# Race data reference\n${dataCtx}\n\n# Rules knowledge base reference\n${rulesCtx}`, close}
  } catch (e) {
    await close()
    throw e
  }
}

export async function writeQuestion(opts: {round: number; grandPrix: string; tyre: Tyre; asked: string[]; signal?: AbortSignal}) {
  const {tools, references, close} = await connect()
  try {
    let feedback = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      let submitted: Submission | undefined
      const submit = tool({
        description: 'Submit the finished question once its answerQuery has been tested.',
        inputSchema: Submission,
        execute: async (input) => {
          submitted = input
          return 'received'
        },
      })
      const run = await generateText({
        model: openai(MODEL),
        system: `${SYSTEM}\n\n${references}`,
        prompt: [
          `Round ${opts.round} of 2026: the ${opts.grandPrix} Grand Prix.`,
          `Difficulty "${opts.tyre}": ${DIFFICULTY[opts.tyre]}`,
          opts.asked.length ? `Do not repeat these questions:\n- ${opts.asked.join('\n- ')}` : '',
          feedback,
        ].join('\n'),
        tools: {...tools, submit_question: submit},
        stopWhen: [hasToolCall('submit_question'), stepCountIs(14)],
        providerOptions: {openai: {reasoningEffort: 'low'}},
        abortSignal: opts.signal,
        maxRetries: 6, // backs off through OpenAI tokens-per-minute limits instead of failing
      })
      console.log(
        `[agent] round ${opts.round} ${opts.tyre}: ${run.steps.length} steps, ${run.totalUsage.inputTokens} in / ${run.totalUsage.outputTokens} out tokens`,
      )
      if (!submitted) {
        feedback = 'Your last attempt never called submit_question. Call it this time.'
        continue
      }
      // The model never grades: we run its query ourselves and keep the value the data returns
      const answer = await groq<unknown>(submitted.answerQuery).catch((e: Error) => e)
      if (typeof answer === 'string' || typeof answer === 'number') return {...submitted, answer}
      feedback = `Your last answerQuery (${submitted.answerQuery}) returned ${answer instanceof Error ? `an error: ${answer.message}` : JSON.stringify(answer)}. It must return one string or number. Write a different question.`
    }
    throw new Error('The race engineer could not produce a verified question')
  } finally {
    await close()
  }
}

const RADIO = `You are the race engineer on the Pit Wall team radio, talking to someone who is new to Formula 1.
Reply to their radio message about the 2026 season in at most three short sentences, calm and plain, like an engineer on the radio. No markdown, no lists.

- Look it up first: data_* tools for results and numbers (GROQ over the race dataset), rules_* tools for how F1 works (the rules knowledge base).
- Every fact and number in your reply must come from a tool result in this conversation. If the data cannot answer it, say so. Never guess.
- Field rules: pole position is polePosition == true; a podium is position <= 3; raceResult.points is Grand Prix points only (no sprints); a pitStops of 0 for a finisher means the stop data is missing.
- Only talk about F1. For anything else, say you can only talk racing on this channel.`

export async function radio(opts: {round: number; grandPrix: string; message: string; context?: string; signal?: AbortSignal}) {
  const calls: ToolCall[] = []
  const {tools, references, close} = await connect((call) => calls.push(call))
  try {
    const run = await generateText({
      model: openai(MODEL),
      system: `${RADIO}\n\n${references}`,
      prompt: [
        `The player is looking at round ${opts.round} of 2026, the ${opts.grandPrix} Grand Prix.`,
        opts.context ? `The quiz question they just answered: "${opts.context}"` : '',
        `Their radio message: "${opts.message}"`,
      ].join('\n'),
      tools,
      stopWhen: stepCountIs(8),
      providerOptions: {openai: {reasoningEffort: 'low'}},
      abortSignal: opts.signal,
      maxRetries: 4,
    })
    console.log(`[radio] round ${opts.round}: ${run.steps.length} steps, ${run.totalUsage.inputTokens} in / ${run.totalUsage.outputTokens} out tokens`)
    // What the engineer looked at, so the reply can show its working
    const checked: Checked[] = calls.map(({tool, input}) => {
      const i = input as {query?: string; paths?: string[]}
      return tool.startsWith('data_') ? {kind: 'data', detail: i.query ?? ''} : {kind: 'rules', detail: i.paths?.join(', ') ?? i.query ?? ''}
    })
    return {reply: run.text.trim(), checked}
  } finally {
    await close()
  }
}
