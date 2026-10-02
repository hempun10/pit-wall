import {randomUUID} from 'node:crypto'
import {LAPS, type Run} from '@/lib/standings'
import {open, seal} from '@/lib/token'

type Sealed = {answer: string; answerQuery: string; qid: string; round: number; tyre: string; issuedAt: number}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const q = typeof body.token === 'string' ? open<Sealed>(body.token) : null
  if (!q || typeof body.choice !== 'string') return Response.json({error: 'Invalid answer'}, {status: 400})
  if (Date.now() - q.issuedAt > 30 * 60_000) return Response.json({error: 'That question has expired'}, {status: 400})

  // The run (score so far) only exists inside this encrypted token, so a browser can't invent laps,
  // answer the same question twice, or mix questions from another race into it
  const run: Run | null = typeof body.run === 'string' ? open<Run>(body.run) : {runId: randomUUID(), round: q.round, tyre: q.tyre, laps: [], qids: []}
  if (!run || run.round !== q.round || run.tyre !== q.tyre || run.laps.length >= LAPS || run.qids.includes(q.qid)) {
    return Response.json({error: 'This lap does not belong to your race'}, {status: 400})
  }

  const norm = (s: string) => s.trim().toLowerCase()
  const correct = norm(body.choice) === norm(q.answer)
  const next: Run = {...run, laps: [...run.laps, correct], qids: [...run.qids, q.qid]}
  return Response.json({correct, answer: q.answer, answerQuery: q.answerQuery, run: seal(next)})
}
