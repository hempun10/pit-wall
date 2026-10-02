import {groq} from './sanity'

export const LAPS = 5
// Correct answers out of 5 score like F1's top five finishers: 25, 18, 15, 12, 10
export const POINTS = [0, 10, 12, 15, 18, 25]

// Travels between /api/answer calls inside an encrypted token, so the score is the server's, not the browser's
export type Run = {runId: string; round: number; tyre: string; laps: boolean[]; qids: string[]}

type RunDoc = {playerId: string; code: string; round: number; tyre: string; points: number; finishedAt: string}
export type Standing = {playerId: string; code: string; points: number; races: number; reachedAt: string}

// Championship = sum of each player's best result per round+tyre. Ties go to whoever reached the
// total first, like identical qualifying times in F1.
// ponytail: aggregates every run on each request; fine for thousands of runs, cache it if traffic grows
export async function standings(): Promise<Standing[]> {
  const runs = await groq<RunDoc[]>(`*[_type == "quizRun"] | order(finishedAt asc){playerId, code, round, tyre, points, finishedAt}`)
  const players = new Map<string, {code: string; first: string; best: Map<string, {points: number; at: string}>}>()
  for (const r of runs) {
    const p = players.get(r.playerId) ?? {code: r.code, first: r.finishedAt, best: new Map()}
    p.code = r.code // runs are in time order, so the latest code wins
    const slot = `${r.round}-${r.tyre}`
    const prev = p.best.get(slot)
    if (!prev || r.points > prev.points) p.best.set(slot, {points: r.points, at: r.finishedAt})
    players.set(r.playerId, p)
  }
  return [...players]
    .map(([playerId, p]) => {
      const scoring = [...p.best.values()].filter((b) => b.points > 0)
      return {
        playerId,
        code: p.code,
        points: scoring.reduce((s, b) => s + b.points, 0),
        races: p.best.size,
        reachedAt: scoring.reduce((latest, b) => (b.at > latest ? b.at : latest), p.first),
      }
    })
    .sort((a, b) => b.points - a.points || a.reachedAt.localeCompare(b.reachedAt))
}

export function table(all: Standing[], player?: string) {
  const you = all.findIndex((s) => s.playerId === player)
  return {
    rows: all.slice(0, 20).map((s, i) => ({position: i + 1, code: s.code, points: s.points, races: s.races, you: i === you})),
    you: you >= 0 ? {position: you + 1, points: all[you].points, code: all[you].code} : null,
    players: all.length,
  }
}
