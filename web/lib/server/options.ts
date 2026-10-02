import {groq} from '@/lib/sanity'
import type {Banked} from './bank'

export const shuffle = <T>(xs: T[]) =>
  xs
    .map((x) => [Math.random(), x] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, x]) => x)

// Four choices: the verified answer plus three plausible wrong ones from the same race (or season)
export async function answerOptions(q: Banked, round: number) {
  if (q.answerKind === 'number' && !Number.isNaN(Number(q.answer))) {
    const answer = Number(q.answer)
    const near = [1, -1, 2, -2, 3, 4].map((d) => answer + d).filter((n) => n >= 0)
    return [answer, ...shuffle(near).slice(0, 3)].sort((a, b) => a - b).map(String) // numbers read best in order
  }
  const pool = await groq<string[]>(
    q.answerKind === 'team'
      ? `array::unique(*[_type == "raceResult" && year == 2026].team->name)`
      : `array::unique(*[_type == "raceResult" && year == 2026 && round == ${round}].driver->name)`,
  )
  return shuffle([q.answer, ...shuffle(pool.filter((n) => n !== q.answer)).slice(0, 3)])
}
