// Read-only queries against the public Pit Wall dataset. No token: the dataset is public.
const QUERY_URL = 'https://hptt7wjq.api.sanity.io/v2025-02-19/data/query/production'

export async function groq<T>(query: string): Promise<T> {
  const url = new URL(QUERY_URL)
  url.searchParams.set('query', query)
  const res = await fetch(url, {cache: 'no-store'})
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error?.description ?? `Sanity query failed (${res.status})`)
  return body.result
}

export type Race = {round: number; grandPrix: string; date: string; completed: boolean; hasSprint: boolean; circuit: string; countryCode: string}
export type Result = {
  round: number
  positionOrder: number
  position: number | null
  positionText: string
  gridPosition: number | null
  points: number
  positionsGained: number | null
  pitStops: number | null
  fastestLap: boolean
  reasonRetired: string | null
  driver: {name: string; abbreviation: string}
  team: string
}

export const seasonQuery = `{
  "races": *[_type == "race" && year == 2026] | order(round asc) {round, grandPrix, date, completed, hasSprint, "circuit": circuit->name, "countryCode": circuit->countryCode},
  "results": *[_type == "raceResult" && year == 2026] | order(round asc, positionOrder asc) {
    round, positionOrder, position, positionText, gridPosition, points, positionsGained, pitStops, fastestLap, reasonRetired,
    "driver": driver->{name, abbreviation}, "team": team->name
  }
}`

export async function create(doc: Record<string, unknown>, op: 'create' | 'createIfNotExists' = 'create') {
  const res = await fetch(QUERY_URL.replace('/query/', '/mutate/'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SANITY_WRITE_TOKEN}`},
    body: JSON.stringify({mutations: [{[op]: doc}]}),
  })
  if (!res.ok) throw new Error(`Sanity write failed (${res.status}): ${await res.text()}`)
}
