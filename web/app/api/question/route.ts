import {after} from 'next/server'
import type {Tyre} from '@/lib/f1'
import {groq} from '@/lib/sanity'
import {generate, slot, TARGET, topUp, type Banked} from '@/lib/server/bank'
import {answerOptions, shuffle} from '@/lib/server/options'
import {seal} from '@/lib/server/token'

export const maxDuration = 60

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const round = Number(body.round)
  const tyre = body.tyre as Tyre
  const seen: string[] = Array.isArray(body.seen) ? body.seen.filter((s: unknown) => typeof s === 'string').slice(-20) : []
  if (!Number.isInteger(round)) return Response.json({error: 'Unknown round'}, {status: 400})
  if (!['soft', 'medium', 'hard'].includes(tyre)) return Response.json({error: 'Unknown tyre'}, {status: 400})

  // Independent lookups, so they run together
  const [race, bank] = await Promise.all([
    groq<{grandPrix: string} | null>(`*[_type == "race" && year == 2026 && round == ${round} && completed][0]{grandPrix}`),
    slot(round, tyre),
  ])
  if (!race) return Response.json({error: 'That round has not been raced yet'}, {status: 400})

  try {
    // Serve from the question bank; only call the agent live when this player has seen everything
    // in the bank and the bank is still below its cap. Otherwise repeat an old question.
    const unseen = bank.filter((q) => !seen.includes(q._id))
    let q: Banked
    if (unseen.length) q = shuffle(unseen)[0]
    else if (bank.length < TARGET) q = await generate(round, race.grandPrix, tyre, bank, req.signal)
    else q = shuffle(bank)[0]
    if (bank.length + 1 < TARGET) after(() => topUp(round, race.grandPrix, tyre))

    return Response.json({
      id: q._id,
      question: q.question,
      options: await answerOptions(q, round),
      term: q.term,
      termExplanation: q.termExplanation,
      kbEntry: q.kbEntry,
      // The answer travels encrypted; only /api/answer can open it
      token: seal({answer: q.answer, answerQuery: q.answerQuery, qid: q._id, round, tyre, issuedAt: Date.now()}),
    })
  } catch (e) {
    console.error(e)
    return Response.json({error: (e as Error).message}, {status: 502})
  }
}
