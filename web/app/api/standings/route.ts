import {standings, table} from '@/lib/standings'

export async function GET(req: Request) {
  const player = new URL(req.url).searchParams.get('player') ?? undefined
  return Response.json(table(await standings(), player))
}
