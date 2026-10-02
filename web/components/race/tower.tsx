import {useEffect, useState} from 'react'
import {teamColor} from '@/lib/f1'
import type {Result} from '@/lib/sanity'

const ROW = 26

function gainLabel(r: Result) {
  if (r.position === null) return {text: 'Out', tone: 'text-secondary'}
  const gained = r.positionsGained ?? 0
  if (gained > 0) return {text: `+${gained}`, tone: 'text-green'}
  if (gained < 0) return {text: `−${-gained}`, tone: 'text-red'}
  return {text: '·', tone: 'text-secondary'}
}

// Shown after the answer: the field starts in grid order, then slides into the finishing order
export function Tower({rows, highlight}: {rows: Result[]; highlight: string}) {
  const [finish, setFinish] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setFinish(true), 250)
    return () => clearTimeout(t)
  }, [])

  const grid = [...rows].sort((a, b) => (a.gridPosition ?? 99) - (b.gridPosition ?? 99))
  const order = finish ? rows : grid

  return (
    <aside className="appear h-fit" aria-label="Race classification">
      <p className="eyebrow">{finish ? 'Race result' : 'Starting grid'}</p>
      <p className="pixel mt-1 text-[0.625rem] uppercase leading-relaxed text-secondary">+/− places vs the start · DNF did not finish</p>
      <ol className="tower relative mt-3 text-sm" style={{height: rows.length * ROW}}>
        {rows.map((r) => {
          const gain = gainLabel(r)
          return (
            <li
              key={r.driver.name}
              className={`absolute inset-x-0 flex items-center gap-2.5 px-2 transition-transform duration-[1200ms] ease-in-out ${highlight === r.driver.name ? 'bg-surface-2' : ''}`}
              style={{height: ROW, transform: `translateY(${order.indexOf(r) * ROW}px)`}}
            >
              <span className="pixel w-8 text-right text-xs tabular-nums text-secondary">
                {finish ? (r.position ?? r.positionText) : (r.gridPosition ?? 'PL')}
              </span>
              <span className="h-3.5 w-[3px] rounded-full" style={{background: teamColor(r.team)}} aria-hidden="true" />
              <span className="pixel flex-1">{r.driver.abbreviation}</span>
              {finish && <span className={`pixel text-xs tabular-nums ${gain.tone}`}>{gain.text}</span>}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
