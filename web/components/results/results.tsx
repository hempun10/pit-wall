import {useEffect, useState} from 'react'
import {LAPS, tyreOf, type Tyre} from '@/lib/f1'
import type {Race} from '@/lib/sanity'
import {sfx} from '@/lib/sfx'
import type {Lap} from '@/lib/types'
import {Flag} from '@/components/ui/flag'
import {Champagne, ChequeredFlag, Smoke} from './celebrations'
import {Championship} from './championship'

type Props = {race: Race; tyre: Tyre; laps: Lap[]; score: number; run: string | null; onRestart: () => void; onMenu: () => void; onStandings: () => void}

function headlineFor(score: number) {
  if (score === LAPS) return 'Perfect race.'
  if (score >= 3) return 'Points finish.'
  if (score >= 1) return 'Keep pushing.'
  return 'Back to the garage.'
}

// The chequered flag: score, points, what to do next, and a review of each lap
export function Results({race, tyre, laps, score, run, onRestart, onMenu, onStandings}: Props) {
  const [copied, setCopied] = useState(false)
  const podium = score >= 3

  useEffect(() => {
    sfx.crowd()
    const t = podium ? setTimeout(sfx.champagne, 700) : undefined
    return () => clearTimeout(t)
  }, [podium])

  function share() {
    const squares = laps.map((l) => (l.correct ? '🟩' : '🟥')).join('')
    const text = `Pit Wall 🏁 ${race.grandPrix} ${tyreOf(tyre).emoji}\n${squares} ${score}/${LAPS}\n${location.origin}`
    navigator.clipboard.writeText(text).then(() => {
      sfx.select(0)
      setCopied(true)
    })
  }

  return (
    <section className="appear mx-auto mt-6 grid w-full max-w-md gap-10 lg:max-w-4xl lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col items-center text-center">
        <p className="eyebrow flex items-center gap-2">
          <Flag code={race.countryCode} size={16} />
          {race.grandPrix} · {tyreOf(tyre).label}
        </p>
        <ChequeredFlag />
        <div className="relative mt-3">
          {score === LAPS && <Smoke />}
          <p className="display relative text-8xl">
            {score}
            <span className="text-secondary">/{LAPS}</span>
          </p>
          {podium && <Champagne />}
        </div>
        <h1 className="display mt-3 text-4xl">{headlineFor(score)}</h1>

        <Championship run={run} onStandings={onStandings} />

        <div className="mt-6 flex w-full flex-col gap-2.5">
          <button className="btn-primary" onClick={onRestart}>
            Race again
          </button>
          <button className="btn-secondary" onClick={share}>
            {copied ? 'Copied' : 'Share result'}
          </button>
          <button className="link-invert mt-1 min-h-11 self-center text-xs" onClick={onMenu}>
            Choose another race
          </button>
        </div>
      </div>

      <div className="lg:pt-2">
        <p className="eyebrow">Your laps</p>
        <ol className="card mt-3 w-full divide-y divide-separator text-left">
          {laps.map((l, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className={l.correct ? 'text-green' : 'text-red'} aria-label={l.correct ? 'correct' : 'wrong'}>
                {l.correct ? '✓' : '✕'}
              </span>
              <span className="flex-1">
                {l.question}
                <span className="block text-secondary">{l.answer}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
