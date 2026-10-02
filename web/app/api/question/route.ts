import {after} from 'next/server'
import type {Tyre} from '@/lib/agent'
import {generate, slot, TARGET, topUp, type Banked} from '@/lib/bank'
import {groq} from '@/lib/sanity'
import {seal} from '@/lib/token'

export const maxDuration = 60

const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x)

function numberOptions(answer: number) {
  const near = [1, -1, 2, -2, 3, 4].map((d) => answer + d).filter((n) => n >= 0)
  return [answer, ...shuffle(near).slice(0, 3)]
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const round = Number(body.round)
  const tyre = body.tyre as Tyre
  const seen: string[] = Array.isArray(body.seen) ? body.seen.filter((s: unknown) => typeof s === 'string').slice(-20) : []
  if (!['soft', 'medium', 'hard'].includes(tyre)) return Response.json({error: 'Unknown tyre'}, {status: 400})

  const race = await groq<{grandPrix: string} | null>(`*[_type == "race" && year == 2026 && round == ${Number.isInteger(round) ? round : -1} && completed][0]{grandPrix}`)
  if (!race) return Response.json({error: 'That round has not been raced yet'}, {status: 400})

  try {
    // Serve from the question bank; only call the agent live when this player has seen everything
    // in the bank and the bank is still below its cap. Otherwise repeat an old question.
    const bank = await slot(round, tyre)
    const unseen = bank.filter((q) => !seen.includes(q._id))
    let q: Banked
    if (unseen.length) q = shuffle(unseen)[0]
    else if (bank.length < TARGET) q = await generate(round, race.grandPrix, tyre, bank, req.signal)
    else q = shuffle(bank)[0]
    if (bank.length + 1 < TARGET) after(() => topUp(round, race.grandPrix, tyre))

    let options: (string | number)[]
    const numeric = q.answerKind === 'number' && !Number.isNaN(Number(q.answer))
    if (numeric) {
      options = numberOptions(Number(q.answer))
    } else {
      const pool = await groq<string[]>(
        q.answerKind === 'team'
          ? `array::unique(*[_type == "raceResult" && year == 2026].team->name)`
          : `array::unique(*[_type == "raceResult" && year == 2026 && round == ${round}].driver->name)`,
      )
      options = [q.answer, ...shuffle(pool.filter((n) => n !== q.answer)).slice(0, 3)]
    }
    return Response.json({
      id: q._id,
      question: q.question,
      options: (numeric ? [...options].sort((x, y) => Number(x) - Number(y)) : shuffle(options)).map(String),
      term: q.term,
      termExplanation: q.termExplanation,
      kbEntry: q.kbEntry,
      token: seal({answer: q.answer, answerQuery: q.answerQuery, qid: q._id, round, tyre, issuedAt: Date.now()}),
    })
  } catch (e) {
    console.error(e)
    return Response.json({error: (e as Error).message}, {status: 502})
  }
}
