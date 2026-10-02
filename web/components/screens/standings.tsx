import {useEffect, useState} from 'react'
import {savedPlayerId} from '@/lib/client'
import type {StandingsTable} from '@/lib/types'
import {ChevronIcon} from '@/components/ui/icons'
import {Wordmark} from '@/components/ui/wordmark'

type Row = StandingsTable['rows'][number]

export function Standings({onBack}: {onBack: () => void}) {
  const [table, setTable] = useState<StandingsTable | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/standings?player=${encodeURIComponent(savedPlayerId())}`)
      .then((r) => r.json())
      .then(setTable)
      .catch(() => setError('Could not load the standings.'))
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <button className="icon-btn" aria-label="Back to menu" onClick={onBack}>
          <ChevronIcon dir="left" />
        </button>
        <Wordmark />
      </header>
      <h1 className="display mt-10 text-5xl">Standings</h1>
      <p className="mt-2 text-[0.9375rem] text-secondary">
        Your best result in each race and tyre counts. Ties go to whoever reached the total first, like identical lap times in F1 qualifying.
      </p>

      {error ? (
        <p className="mt-8 text-red">{error}</p>
      ) : !table ? (
        <div className="card mt-8 h-48 animate-pulse" aria-busy="true" />
      ) : table.rows.length === 0 ? (
        <p className="mt-8 text-secondary">No finishers yet. Finish a race to take P1.</p>
      ) : (
        <>
          <ol className="card mt-8 divide-y divide-separator overflow-hidden">
            {table.rows.map((r) => (
              <StandingRow key={r.position} row={r} />
            ))}
          </ol>
          {/* Outside the top 20: show the player's own row underneath */}
          {table.you && !table.rows.some((r) => r.you) && (
            <ol className="card mt-3 overflow-hidden">
              <StandingRow row={{...table.you, races: 0, you: true}} />
            </ol>
          )}
          <p className="pixel mt-3 text-center text-[0.6875rem] uppercase text-secondary">
            {table.players} {table.players === 1 ? 'driver' : 'drivers'} in the championship
          </p>
        </>
      )}
    </main>
  )
}

function StandingRow({row}: {row: Row}) {
  return (
    <li className={`flex items-center gap-4 px-4 py-3 ${row.you ? 'bg-surface-2' : ''}`}>
      <span className="pixel w-8 text-sm tabular-nums text-secondary">P{row.position}</span>
      <span className="display flex-1 text-xl">
        {row.code}
        {row.you && <span className="pixel ml-2 align-middle text-[0.625rem] not-italic uppercase text-accent">You</span>}
      </span>
      <span className="pixel text-[0.6875rem] uppercase text-secondary">
        {row.races} {row.races === 1 ? 'race' : 'races'}
      </span>
      <span className="pixel w-20 text-right tabular-nums">{row.points} pts</span>
    </li>
  )
}
