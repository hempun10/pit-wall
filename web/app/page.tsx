import {groq, seasonQuery, type Race, type Result} from '@/lib/sanity'
import PitWall from '@/components/pit-wall'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const season = await groq<{races: Race[]; results: Result[]}>(seasonQuery)
  return <PitWall races={season.races} results={season.results} />
}
