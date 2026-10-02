import {radio} from '@/lib/server/agent'
import {groq} from '@/lib/sanity'

export const maxDuration = 60

// ponytail: per-instance memory, so the limit resets on cold starts and isn't shared across
// instances; enough to stop one browser looping on the live agent. Use a shared store if it's abused.
const WINDOW = 10 * 60_000
const LIMIT = 8
const recent = new Map<string, number[]>()

function allowed(ip: string) {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW)
  if (hits.length >= LIMIT) return false
  recent.set(ip, [...hits, now])
  return true
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const round = Number(body.round)
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 160) : ''
  const context = typeof body.context === 'string' ? body.context.slice(0, 200) : undefined
  if (!message) return Response.json({error: 'Say something on the radio first'}, {status: 400})

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  if (!allowed(ip)) return Response.json({error: 'Radio is busy. Give it a few minutes.'}, {status: 429})

  const race = await groq<{grandPrix: string} | null>(
    `*[_type == "race" && year == 2026 && round == ${Number.isInteger(round) ? round : -1} && completed][0]{grandPrix}`,
  )
  if (!race) return Response.json({error: 'That round has not been raced yet'}, {status: 400})

  try {
    return Response.json(await radio({round, grandPrix: race.grandPrix, message, context, signal: req.signal}))
  } catch (e) {
    console.error(e)
    return Response.json({error: 'Lost the radio. Try again.'}, {status: 502})
  }
}
