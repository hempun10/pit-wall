import {LAPS} from '@/lib/f1'
import type {Lap} from '@/lib/types'

// Laps inside a run of 3+ correct answers are a purple sector, like the fastest time on a timing screen
function purpleLaps(laps: Lap[]) {
  const purple = new Set<number>()
  let runStart = 0
  laps.forEach((lap, i) => {
    if (!lap.correct) runStart = i + 1
    else if (i - runStart + 1 >= 3) for (let j = runStart; j <= i; j++) purple.add(j)
  })
  return purple
}

function lapColor(laps: Lap[], i: number, purple: Set<number>) {
  if (!laps[i]) return i === laps.length ? 'bg-fg/60' : 'bg-surface-2' // current lap, then laps to come
  if (purple.has(i)) return 'bg-purple'
  return laps[i].correct ? 'bg-green' : 'bg-red'
}

export function Progress({laps, current}: {laps: Lap[]; current: number}) {
  const purple = purpleLaps(laps)
  return (
    <ol className="flex flex-1 gap-1.5" aria-label={`Lap ${current} of ${LAPS}`}>
      {Array.from({length: LAPS}, (_, i) => (
        <li key={i} className={`h-1.5 flex-1 transition-colors ${lapColor(laps, i, purple)}`} />
      ))}
    </ol>
  )
}
