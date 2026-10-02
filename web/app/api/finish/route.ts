import {validCode} from '@/lib/codes'
import {create} from '@/lib/sanity'
import {LAPS, POINTS} from '@/lib/f1'
import {standings, table, type Run} from '@/lib/server/standings'
import {open} from '@/lib/server/token'

const UUID = /^[0-9a-f-]{36}$/

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const run = typeof body.run === 'string' ? open<Run>(body.run) : null
  const code = typeof body.code === 'string' ? body.code.toUpperCase() : ''
  const player = typeof body.player === 'string' ? body.player : ''
  if (!run || run.laps.length !== LAPS) return Response.json({error: 'Finish all five laps first'}, {status: 400})
  if (!validCode(code)) return Response.json({error: 'Pick a different three-letter code'}, {status: 400})
  if (!UUID.test(player)) return Response.json({error: 'Invalid player'}, {status: 400})

  const correct = run.laps.filter(Boolean).length
  // runId makes this idempotent: submitting the same finished race twice saves it once
  await create(
    {
      _id: `run-${run.runId}`,
      _type: 'quizRun',
      playerId: player,
      code,
      round: run.round,
      tyre: run.tyre,
      correct,
      points: POINTS[correct],
      finishedAt: new Date().toISOString(),
    },
    'createIfNotExists',
  )
  return Response.json({points: POINTS[correct], ...table(await standings(), player)})
}
