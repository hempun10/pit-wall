import {useEffect, useState} from 'react'
import {CODE_KEY, playerId, post, storage} from '@/lib/client'
import type {StandingsTable} from '@/lib/types'

type Saved = StandingsTable & {points: number}

// Every finished race goes on the standings under the player's driver code. The server reads the
// score from the encrypted run token, never from the browser.
export function Championship({run, onStandings}: {run: string | null; onStandings: () => void}) {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    post<Saved>('/api/finish', {run, code: storage.get(CODE_KEY), player: playerId()})
      .then(setSaved)
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <p className="mt-8 text-sm text-red">Couldn’t save to the standings: {error}</p>
  if (!saved?.you) return <p className="mt-8 text-sm text-secondary">Adding your points to the standings…</p>

  return (
    <div className="card mt-8 w-full p-5">
      <p className={`display text-4xl ${saved.points ? 'text-accent' : 'text-secondary'}`}>+{saved.points} pts</p>
      <p className="mt-2 text-[0.9375rem]">
        <span className="pixel">{saved.you.code}</span> is P{saved.you.position} of {saved.players} · {saved.you.points} pts in total
      </p>
      <p className="mt-1 text-xs text-secondary">5 correct scores 25 pts, then 18, 15, 12 and 10, like F1’s top five.</p>
      <button className="btn-secondary mt-4 w-full" onClick={onStandings}>
        View standings
      </button>
    </div>
  )
}
