import {isFromButton, useKeydown} from '@/hooks/use-keydown'
import {shortDate, tyreOf, TYRES, type Tyre} from '@/lib/f1'
import type {Race} from '@/lib/sanity'
import {Flag} from '@/components/ui/flag'
import {ChevronIcon} from '@/components/ui/icons'
import {SoundToggle} from '@/components/ui/sound-toggle'
import {Wordmark} from '@/components/ui/wordmark'

type Props = {
  race: Race
  isFirst: boolean
  isLatest: boolean
  tyre: Tyre
  code: string
  onStep: (dir: 1 | -1) => void
  onPickTyre: (tyre: Tyre) => void
  onStart: () => void
  onStandings: () => void
  onChangeCode: () => void
}

// Choose a Grand Prix and a tyre, then start. Keys: ←/→ race, S/M/H (or 1/2/3) tyre, Enter start.
export function Menu({race, isFirst, isLatest, tyre, code, onStep, onPickTyre, onStart, onStandings, onChangeCode}: Props) {
  useKeydown((e) => {
    const tyreIndex = ['S', 'M', 'H'].includes(e.key.toUpperCase()) ? ['S', 'M', 'H'].indexOf(e.key.toUpperCase()) : ['1', '2', '3'].indexOf(e.key)
    if (e.key === 'ArrowLeft' && !isFirst) onStep(-1)
    else if (e.key === 'ArrowRight' && !isLatest) onStep(1)
    else if (tyreIndex >= 0) onPickTyre(TYRES[tyreIndex].id)
    else if (e.key === 'Enter' && !isFromButton(e)) onStart()
  })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-3">
          <SoundToggle />
          <button className="link-invert min-h-11 text-sm" onClick={onStandings}>
            Standings
          </button>
          <button className="link-invert min-h-11 border border-separator px-3 text-sm" aria-label={`Driver code ${code}. Change it`} onClick={onChangeCode}>
            {code}
          </button>
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-10 py-10">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-2">
            <Flag code={race.countryCode} />
            Round {race.round} · {isLatest ? 'Latest race · ' : ''}
            {shortDate(race.date)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button className="icon-btn" aria-label="Previous race" disabled={isFirst} onClick={() => onStep(-1)}>
              <ChevronIcon dir="left" />
            </button>
            <h1 key={race.round} className="display appear text-5xl sm:text-6xl">
              {race.grandPrix}
            </h1>
            <button className="icon-btn" aria-label="Next race" disabled={isLatest} onClick={() => onStep(1)}>
              <ChevronIcon dir="right" />
            </button>
          </div>
          <p className="mt-2 text-secondary">{race.circuit}</p>
        </div>

        <div>
          <div className="seg" role="radiogroup" aria-label="Difficulty">
            {TYRES.map((t) => (
              <button key={t.id} role="radio" aria-checked={tyre === t.id} onClick={() => onPickTyre(t.id)}>
                <span className="size-2.5 rounded-full ring-1 ring-fg/35" style={{background: t.color}} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-secondary">{tyreOf(tyre).hint}</p>
        </div>

        <div>
          <button className="btn-primary w-full" onClick={onStart}>
            Start race
          </button>
          <KeyHints />
        </div>
      </section>

      <Credits />
    </main>
  )
}

// Only shown on devices with a keyboard and mouse
function KeyHints() {
  return (
    <p className="pixel mt-3 hidden text-center text-[0.6875rem] uppercase text-secondary [@media(hover:hover)_and_(pointer:fine)]:block">
      <kbd className="key">←</kbd> <kbd className="key">→</kbd> race · <kbd className="key">S</kbd> <kbd className="key">M</kbd> <kbd className="key">H</kbd>{' '}
      tyre · <kbd className="key">↵</kbd> start
    </p>
  )
}

function Credits() {
  return (
    <p className="pixel text-center text-[0.6875rem] uppercase leading-relaxed text-secondary/80">
      Answers checked against{' '}
      <a className="underline" href="https://github.com/f1db/f1db">
        F1DB
      </a>{' '}
      (CC BY 4.0) in Sanity · Rules from Wikipedia (CC BY-SA 4.0) · F1 sounds by{' '}
      <a className="underline" href="https://freesound.org/people/Geoff-Bremner-Audio/">
        Geoff-Bremner-Audio
      </a>{' '}
      (CC BY 4.0) · Not affiliated with Formula 1
    </p>
  )
}
