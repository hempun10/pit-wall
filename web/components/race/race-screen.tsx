import {useEffect, useState} from 'react'
import {isFromButton, useKeydown} from '@/hooks/use-keydown'
import {useRace} from '@/hooks/use-race'
import {LAPS, tyreOf, type Tyre} from '@/lib/f1'
import type {Race, Result} from '@/lib/sanity'
import {sfx} from '@/lib/sfx'
import {Results} from '@/components/results/results'
import {Flag} from '@/components/ui/flag'
import {CloseIcon} from '@/components/ui/icons'
import {SoundToggle} from '@/components/ui/sound-toggle'
import {ANSWER_KEYS, AnswerList} from './answer-list'
import {Loading} from './loading'
import {Progress} from './progress'
import {StartSequence} from './start-sequence'
import {Tower} from './tower'
import {VerdictPanel} from './verdict-panel'

type Props = {race: Race; tyre: Tyre; rows: Result[]; onMenu: () => void; onRestart: () => void; onStandings: () => void}

export function RaceScreen({race, tyre, rows, onMenu, onRestart, onStandings}: Props) {
  const r = useRace(race.round, tyre)
  const [starting, setStarting] = useState(true) // the start lights before lap 1

  // A soft click whenever a new question arrives (after the start lights)
  const questionId = r.question?.id
  useEffect(() => {
    if (questionId && !starting) sfx.radio()
  }, [questionId, starting])

  // A–D or 1–4 to answer, ↑/↓ to move between answers, Enter to continue
  useKeydown((e) => {
    const key = e.key.toUpperCase()
    const i = ANSWER_KEYS.includes(key) ? ANSWER_KEYS.indexOf(key) : ['1', '2', '3', '4'].indexOf(key)
    if (r.question && !r.verdict && i >= 0 && r.question.options[i]) return r.pick(r.question.options[i])
    if (r.question && !r.verdict && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      return moveFocus(e.key === 'ArrowDown' ? 1 : -1)
    }
    if (r.verdict && e.key === 'Enter' && !isFromButton(e)) r.advance()
  }, !r.finished)

  return (
    // The top bar stays put; only the content below it scrolls
    <main className="flex h-dvh flex-col">
      {starting && <StartSequence onDone={() => setStarting(false)} />}
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-4 px-5 py-5">
        <button className="icon-btn" aria-label="Quit to menu" onClick={onMenu}>
          <CloseIcon />
        </button>
        <Progress laps={r.laps} current={Math.min(r.laps.length + 1, LAPS)} />
        <SoundToggle />
        <span className="pixel w-11 text-right text-lg tabular-nums" aria-label={`Score ${r.score}`}>
          {r.score}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-5 pb-12">
          {r.finished ? (
            <Results race={race} tyre={tyre} laps={r.laps} score={r.score} run={r.run} onRestart={onRestart} onMenu={onMenu} onStandings={onStandings} />
          ) : (
            // The tower column is reserved from the start so answering never shifts the question
            <div className="mx-auto mt-10 grid w-full max-w-[880px] flex-1 gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
              <section className="w-full max-w-xl" aria-live="polite">
                <p className="eyebrow flex items-center gap-2">
                  <Flag code={race.countryCode} size={16} />
                  Lap {Math.min(r.laps.length + (r.verdict ? 0 : 1), LAPS)} of {LAPS} · {race.grandPrix} · {tyreOf(tyre).label}
                </p>

                {r.question ? (
                  <h1 key={r.question.id} className="appear mt-3 text-[2.25rem] leading-[1.05] sm:text-5xl">
                    {r.question.question}
                  </h1>
                ) : r.error ? (
                  <div className="mt-3">
                    <p className="display text-3xl">Lost the radio.</p>
                    <p className="mt-1 text-secondary">{r.error}</p>
                    <button className="btn-secondary mt-5" onClick={r.retry}>
                      Try again
                    </button>
                  </div>
                ) : (
                  <Loading />
                )}

                {r.question && <AnswerList options={r.question.options} verdict={r.verdict} picked={r.picked} rows={rows} onPick={r.pick} />}

                {r.question && r.verdict && <VerdictPanel question={r.question} verdict={r.verdict} race={race} lastLap={r.lastLap} onAdvance={r.advance} />}
              </section>

              {r.verdict ? <Tower rows={rows} highlight={r.verdict.answer} /> : <div aria-hidden="true" />}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function moveFocus(dir: 1 | -1) {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-option]')]
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = at < 0 ? 0 : (at + dir + buttons.length) % buttons.length
  sfx.nav(dir)
  buttons[next]?.focus()
}
