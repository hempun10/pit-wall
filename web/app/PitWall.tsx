'use client'

import {useEffect, useRef, useState, useSyncExternalStore} from 'react'
import {validCode} from '@/lib/codes'
import {isMuted, setMuted, sfx, unlockAudio} from '@/lib/sfx'
import type {Race, Result} from '@/lib/sanity'

type Tyre = 'soft' | 'medium' | 'hard'
type Question = {
  id: string
  question: string
  options: string[]
  term: string
  termExplanation: string
  kbEntry: string
  token: string
}
type Verdict = {
  correct: boolean
  answer: string
  answerQuery: string
  choice: string
  streak: number // correct answers in a row, including this one
}
type Lap = {question: string; correct: boolean; answer: string}
type Table = {
  rows: {
    position: number
    code: string
    points: number
    races: number
    you: boolean
  }[]
  you: {position: number; points: number; code: string} | null
  players: number
}

const LAPS = 5
const ROW = 26
const TYRES: {
  id: Tyre
  label: string
  color: string
  hint: string
  dot: string
}[] = [
  {
    id: 'soft',
    label: 'Soft',
    color: '#ff453a',
    hint: 'One fact from the race',
    dot: '🔴',
  },
  {
    id: 'medium',
    label: 'Medium',
    color: '#ffd60a',
    hint: 'Compare drivers in the race',
    dot: '🟡',
  },
  {
    id: 'hard',
    label: 'Hard',
    color: '#f5f5f7',
    hint: 'The season so far',
    dot: '⚪',
  },
]
const TEAM_COLORS: Record<string, string> = {
  Mercedes: '#27F4D2',
  Ferrari: '#E8002D',
  McLaren: '#FF8000',
  'Red Bull': '#3671C6',
  'Aston Martin': '#229971',
  Alpine: '#0093CC',
  Williams: '#64C4FF',
  'Racing Bulls': '#6692FF',
  Haas: '#B6BABD',
  Audi: '#F50537',
  Cadillac: '#C8A45D',
}

const tyreOf = (id: Tyre) => TYRES.find((t) => t.id === id)!
const KEYS = ['A', 'B', 'C', 'D']
// Black or white text, whichever reads better on a team colour
const ink = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#000' : '#fff'
}

// Championship identity without accounts: a random id and a driver code, kept in this browser
const storage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  },
}
// The driver code lives in localStorage; this hook re-renders when it changes. On the server
// (and during hydration) it reads undefined, so nothing flashes before we know who's playing.
const CODE_EVENT = 'pitwall-code'
function subscribeCode(onChange: () => void) {
  window.addEventListener(CODE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CODE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
function useCode() {
  return useSyncExternalStore(
    subscribeCode,
    () => storage.get('pitwall.code'),
    () => undefined,
  )
}
function saveCode(code: string) {
  storage.set('pitwall.code', code)
  window.dispatchEvent(new Event(CODE_EVENT))
}

function playerId() {
  let id = storage.get('pitwall.player')
  if (!id) {
    id = crypto.randomUUID()
    storage.set('pitwall.player', id)
  }
  return id
}
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

async function post<T>(url: string, body: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
    signal,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

export default function PitWall({races, results}: {races: Race[]; results: Result[]}) {
  const completed = races.filter((r) => r.completed)
  const [round, setRound] = useState(completed.at(-1)!.round)
  const [tyre, setTyre] = useState<Tyre>('soft')
  const [screen, setScreen] = useState<'menu' | 'race' | 'standings'>('menu')
  const [attempt, setAttempt] = useState(0)
  const [editingCode, setEditingCode] = useState(false)
  const [entered, setEntered] = useState(false) // the intro screen, shown on every visit
  const code = useCode()
  const race = races.find((r) => r.round === round)!
  const onMenu = entered && screen === 'menu' && !!code && !editingCode

  // Every menu action plays its UI sound; any click or key press also unlocks browser audio
  function startRace() {
    unlockAudio()
    sfx.confirm()
    setAttempt((a) => a + 1)
    setScreen('race')
  }
  function stepRound(dir: 1 | -1) {
    const next = completed[completed.findIndex((r) => r.round === round) + dir]
    if (!next) return
    unlockAudio()
    sfx.nav(dir)
    setRound(next.round)
  }
  function pickTyre(id: Tyre) {
    if (id === tyre) return
    unlockAudio()
    sfx.select(TYRES.findIndex((t) => t.id === id))
    setTyre(id)
  }
  function open(next: typeof screen | 'code') {
    unlockAudio()
    sfx.open()
    if (next === 'code') setEditingCode(true)
    else setScreen(next)
  }
  function back() {
    sfx.back()
    setEditingCode(false)
    setScreen('menu')
  }

  // Menu keyboard: ←/→ change race, S/M/H or 1/2/3 pick the tyre, Enter starts
  useEffect(() => {
    if (!onMenu) return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tyreKey = ['S', 'M', 'H'].indexOf(e.key.toUpperCase()) >= 0 ? ['S', 'M', 'H'].indexOf(e.key.toUpperCase()) : ['1', '2', '3'].indexOf(e.key)
      if (e.key === 'ArrowLeft') stepRound(-1)
      else if (e.key === 'ArrowRight') stepRound(1)
      else if (tyreKey >= 0) pickTyre(TYRES[tyreKey].id)
      // A focused button already handles its own Enter
      else if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) startRace()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (code === undefined) return null // still reading the saved code
  if (!entered) {
    return (
      <Intro
        onEnter={() => {
          unlockAudio() // the enter click is what lets the browser play sound from here on
          sfx.confirm()
          setEntered(true)
        }}
      />
    )
  }
  if (code === null || editingCode)
    return (
      <Onboarding
        current={code ?? ''}
        onBack={back}
        onSaved={() => {
          sfx.confirm()
          setEditingCode(false)
        }}
      />
    )
  if (screen === 'standings') return <Standings onBack={back} />
  if (screen === 'race') {
    return (
      <RaceScreen
        key={`${round}-${tyre}-${attempt}`}
        race={race}
        tyre={tyre}
        rows={results.filter((r) => r.round === round)}
        onMenu={back}
        onStandings={() => open('standings')}
        onRestart={() => {
          sfx.confirm()
          setAttempt((a) => a + 1)
        }}
      />
    )
  }

  const index = completed.findIndex((r) => r.round === round)
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-3">
          <SoundToggle />
          <button className="link-invert min-h-11 text-sm" onClick={() => open('standings')}>
            Standings
          </button>
          <button
            className="link-invert min-h-11 border border-separator px-3 text-sm"
            aria-label={`Driver code ${code}. Change it`}
            onClick={() => open('code')}
          >
            {code}
          </button>
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-10 py-10">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-2">
            <Flag code={race.countryCode} />
            Round {round} · {index === completed.length - 1 ? 'Latest race · ' : ''}
            {shortDate(race.date)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button className="icon-btn" aria-label="Previous race" disabled={index <= 0} onClick={() => stepRound(-1)}>
              <Chevron dir="left" />
            </button>
            <h1 key={round} className="display appear text-5xl sm:text-6xl">
              {race.grandPrix}
            </h1>
            <button className="icon-btn" aria-label="Next race" disabled={index >= completed.length - 1} onClick={() => stepRound(1)}>
              <Chevron dir="right" />
            </button>
          </div>
          <p className="mt-2 text-secondary">{race.circuit}</p>
        </div>

        <div>
          <div className="seg" role="radiogroup" aria-label="Difficulty">
            {TYRES.map((t) => (
              <button key={t.id} role="radio" aria-checked={tyre === t.id} onClick={() => pickTyre(t.id)}>
                <span className="size-2.5 rounded-full ring-1 ring-fg/35" style={{background: t.color}} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-secondary">{tyreOf(tyre).hint}</p>
        </div>

        <div>
          <button className="btn-primary w-full" onClick={startRace}>
            Start race
          </button>
          <p className="pixel mt-3 hidden text-center text-[0.6875rem] uppercase text-secondary [@media(hover:hover)_and_(pointer:fine)]:block">
            <kbd className="key">←</kbd> <kbd className="key">→</kbd> race · <kbd className="key">S</kbd> <kbd className="key">M</kbd>{' '}
            <kbd className="key">H</kbd> tyre · <kbd className="key">↵</kbd> start
          </p>
        </div>
      </section>

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
    </main>
  )
}

function Wordmark({large = false}: {large?: boolean}) {
  return (
    <p className={`pixel flex items-center uppercase ${large ? 'gap-4 text-4xl' : 'gap-2.5 text-sm'}`} aria-label="Pit Wall">
      <span className={`flex ${large ? 'gap-1' : 'gap-[3px]'}`} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={`block bg-accent ${large ? 'size-3' : 'size-1.5'}`} />
        ))}
      </span>
      Pit Wall
    </p>
  )
}

// Like a title card: the wordmark sharpens out of the paper, then a quiet enter link appears
function Intro({onEnter}: {onEnter: () => void}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && onEnter()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onEnter])
  return (
    <main className="relative grid min-h-dvh place-items-center px-5">
      <div className="flex flex-col items-center">
        <div className="intro-mark">
          <Wordmark large />
        </div>
        <button className="link-invert intro-enter mt-24 text-sm" onClick={onEnter}>
          Enter Pit Wall
        </button>
      </div>
      <p className="pixel chrome fixed bottom-5 left-5 text-[0.6875rem] uppercase text-secondary" style={{animationDelay: '2s'}}>
        F1 2026 · Race quiz
      </p>
      <p className="pixel chrome fixed bottom-5 right-5 text-[0.6875rem] uppercase text-secondary" style={{animationDelay: '2s'}}>
        Answers checked in Sanity
      </p>
    </main>
  )
}

function Chevron({dir}: {dir: 'left' | 'right'}) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Laps inside a run of 3+ correct answers are a purple sector, like the fastest time on a timing screen
function purpleLaps(laps: Lap[]) {
  const purple = new Set<number>()
  let start = 0
  laps.forEach((lap, i) => {
    if (!lap.correct) start = i + 1
    else if (i - start + 1 >= 3) for (let j = start; j <= i; j++) purple.add(j)
  })
  return purple
}

function Progress({laps, current}: {laps: Lap[]; current: number}) {
  const purple = purpleLaps(laps)
  return (
    <ol className="flex flex-1 gap-1.5" aria-label={`Lap ${current} of ${LAPS}`}>
      {Array.from({length: LAPS}, (_, i) => (
        <li
          key={i}
          className={`h-1.5 flex-1 transition-colors ${
            laps[i] ? (purple.has(i) ? 'bg-purple' : laps[i].correct ? 'bg-green' : 'bg-red') : i === laps.length ? 'bg-fg/60' : 'bg-surface-2'
          }`}
        />
      ))}
    </ol>
  )
}

function RaceScreen(props: {race: Race; tyre: Tyre; rows: Result[]; onMenu: () => void; onRestart: () => void; onStandings: () => void}) {
  const {race, tyre, rows, onMenu, onRestart} = props
  const [question, setQuestion] = useState<Question | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [laps, setLaps] = useState<Lap[]>([])
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(true) // the start-lights sequence before lap 1
  const seen = useRef<string[]>([])
  const nextQuestion = useRef<Promise<Question> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const [run, setRun] = useState<string | null>(null) // encrypted score so far, issued by the server
  const score = laps.filter((l) => l.correct).length
  const lastLap = laps.length === LAPS

  const fetchQuestion = () => post<Question>('/api/question', {round: race.round, tyre, seen: seen.current}, abort.current?.signal)

  // Ask for the next question while the player reads the current one; usually it comes straight
  // from the question bank, but a cold round may need the agent to write one live
  function show(q: Question) {
    seen.current.push(q.id)
    setQuestion(q)
    if (seen.current.length >= LAPS) return // last lap: nothing to prefetch
    nextQuestion.current = fetchQuestion()
    nextQuestion.current.catch(() => {})
  }

  function wait(pending: Promise<Question>) {
    pending.then(show).catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
  }

  function load(pending: Promise<Question>) {
    setQuestion(null)
    setVerdict(null)
    setPicked(null)
    setError('')
    wait(pending)
  }

  // Leaving the race cancels its in-flight agent runs (this also stops React's
  // development double-mount from running every question twice)
  useEffect(() => {
    const controller = new AbortController()
    abort.current = controller
    wait(fetchQuestion())
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function answer(choice: string) {
    if (!question || verdict) return
    const v = await post<Omit<Verdict, 'choice'> & {run: string}>('/api/answer', {token: question.token, choice, run}).catch((e: Error) => {
      setError(e.message)
      setPicked(null)
      return null
    })
    if (!v) return
    setRun(v.run)
    let streak = 0
    if (v.correct) for (streak = 1; laps.length - streak >= 0 && laps[laps.length - streak]?.correct; streak++);
    if (!v.correct) sfx.wrong()
    else if (streak >= 3) sfx.purple()
    else sfx.correct()
    setVerdict({
      correct: v.correct,
      answer: v.answer,
      answerQuery: v.answerQuery,
      choice,
      streak,
    })
    setLaps((l) => [...l, {question: question.question, correct: v.correct, answer: v.answer}])
  }

  // Like Typeform: the chosen answer blinks, then it's checked
  function pick(choice: string) {
    if (!question || verdict || picked) return
    setPicked(choice)
    sfx.select(1)
    setTimeout(() => answer(choice), 380)
  }

  // Team radio sting each time the race engineer asks a question
  const questionId = question?.id
  useEffect(() => {
    if (questionId && !starting) sfx.radio()
  }, [questionId, starting])

  function advance() {
    if (lastLap) setFinished(true)
    else load(nextQuestion.current ?? fetchQuestion())
  }

  // Keyboard: A–D or 1–4 to answer, ↑/↓ to move between answers, Enter to pick or continue
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || finished) return
      if ((e.target as HTMLElement).closest('input, textarea')) return // typing on the team radio
      const key = e.key.toUpperCase()
      const i = KEYS.includes(key) ? KEYS.indexOf(key) : ['1', '2', '3', '4'].indexOf(key)
      if (question && !verdict && i >= 0 && question.options[i]) return pick(question.options[i])
      if (question && !verdict && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-option]')]
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = at < 0 ? 0 : (at + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
        sfx.nav(e.key === 'ArrowDown' ? 1 : -1)
        return buttons[next]?.focus()
      }
      // A focused button already handles its own Enter
      if (verdict && e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function share() {
    const text = `Pit Wall 🏁 ${race.grandPrix} ${tyreOf(tyre).dot}\n${laps.map((l) => (l.correct ? '🟩' : '🟥')).join('')} ${score}/${LAPS}\n${location.origin}`
    navigator.clipboard.writeText(text).then(() => {
      sfx.select(0)
      setCopied(true)
    })
  }

  return (
    // The top bar stays put; only the content below it scrolls
    <main className="flex h-dvh flex-col">
      {starting && <StartSequence onDone={() => setStarting(false)} />}
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-4 px-5 py-5">
        <button className="icon-btn" aria-label="Quit to menu" onClick={onMenu}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <Progress laps={laps} current={Math.min(laps.length + 1, LAPS)} />
        <SoundToggle />
        <span className="pixel w-11 text-right text-lg tabular-nums" aria-label={`Score ${score}`}>
          {score}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-5 pb-12">
          {finished ? (
            <Results
              race={race}
              tyre={tyre}
              laps={laps}
              score={score}
              run={run}
              copied={copied}
              onShare={share}
              onRestart={onRestart}
              onMenu={onMenu}
              onStandings={props.onStandings}
            />
          ) : (
            // The tower column is reserved from the start so answering never shifts the question
            <div className="mx-auto mt-10 grid w-full max-w-[880px] flex-1 gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
              <section className="w-full max-w-xl" aria-live="polite">
                <p className="eyebrow flex items-center gap-2">
                  <Flag code={race.countryCode} size={16} />
                  Lap {Math.min(laps.length + (verdict ? 0 : 1), LAPS)} of {LAPS} · {race.grandPrix} · {tyreOf(tyre).label}
                </p>

                {question ? (
                  <h1 key={question.id} className="appear mt-3 text-[2.25rem] leading-[1.05] sm:text-5xl">
                    {question.question}
                  </h1>
                ) : error ? (
                  <div className="mt-3">
                    <p className="display text-3xl">Lost the radio.</p>
                    <p className="mt-1 text-secondary">{error}</p>
                    <button className="btn-secondary mt-5" onClick={() => load(fetchQuestion())}>
                      Try again
                    </button>
                  </div>
                ) : (
                  <Loading />
                )}

                {question && (
                  <ul className="mt-8 flex flex-col gap-2.5">
                    {question.options.map((o, i) => {
                      const isAnswer = verdict && o.toLowerCase() === verdict.answer.toLowerCase()
                      const isWrongPick = verdict && o === verdict.choice && !verdict.correct
                      const state = isAnswer ? 'correct' : isWrongPick ? 'wrong' : verdict || (picked && picked !== o) ? 'dim' : picked === o ? 'blink' : ''
                      return (
                        <li key={o} className="appear" style={{animationDelay: `${i * 60}ms`}}>
                          <button
                            data-option
                            onClick={() => pick(o)}
                            disabled={!!verdict || !!picked}
                            aria-keyshortcuts={KEYS[i]}
                            className={`option ${state}`}
                          >
                            <span className="flex items-center gap-3">
                              <OptionArt value={o} rows={rows} />
                              {o}
                            </span>
                            {!verdict && <kbd className="key">{KEYS[i]}</kbd>}
                            {isAnswer && (
                              <span className="text-green" aria-label="correct answer">
                                ✓
                              </span>
                            )}
                            {isWrongPick && (
                              <span className="text-red" aria-label="your answer">
                                ✕
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {verdict && question && (
                  <div className="appear mt-8 flex flex-col gap-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`display text-3xl ${!verdict.correct ? 'text-red' : verdict.streak >= 3 ? 'text-purple' : 'text-green'}`}>
                        {!verdict.correct
                          ? `Not quite. It was ${verdict.answer}.`
                          : verdict.streak >= 3
                            ? `Purple sector! ${verdict.streak} in a row.`
                            : 'Correct.'}
                      </p>
                      <button className="btn-primary shrink-0" onClick={advance}>
                        {lastLap ? 'See results' : 'Next lap'}
                      </button>
                    </div>

                    <div className="card p-4">
                      <p className="pixel text-xs uppercase text-secondary">{question.term}</p>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-fg/85">{question.termExplanation}</p>
                    </div>

                    <TeamRadio
                      key={question.id}
                      round={race.round}
                      context={question.question}
                      suggestions={[`Why was it ${verdict.answer}?`, `What does ${question.term} mean?`, `Who won the ${race.grandPrix} Grand Prix?`]}
                    />

                    <details className="group text-sm" onToggle={(e) => (e.currentTarget.open ? sfx.open() : sfx.back())}>
                      <summary className="cursor-pointer list-none text-secondary hover:text-fg">
                        <span className="group-open:hidden">How we checked this ›</span>
                        <span className="hidden group-open:inline">How we checked this ⌄</span>
                      </summary>
                      <p className="mt-2 text-secondary">
                        The AI wrote this GROQ query. Our server ran it on the Sanity dataset and graded you with the result. The explanation comes from the
                        rules Knowledge Base (“
                        {question.kbEntry}”).
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-surface p-3 font-mono text-xs text-fg/80">
                        {verdict.answerQuery}
                      </pre>
                    </details>
                  </div>
                )}
              </section>

              {verdict ? <Tower rows={rows} highlight={verdict.answer} /> : <div aria-hidden="true" />}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// Drivers get a helmet and teams a car, both in team colours; numbers stay plain.
// Drawn here rather than using photos or logos, which are copyrighted.
function OptionArt({value, rows}: {value: string; rows: Result[]}) {
  const driver = rows.find((r) => r.driver.name === value)
  const team = driver ? driver.team : TEAM_COLORS[value] ? value : null
  if (!team) return null
  const color = TEAM_COLORS[team] ?? '#777'
  return driver ? <Helmet color={color} /> : <Car color={color} />
}

function Helmet({color}: {color: string}) {
  return (
    <svg viewBox="0 0 48 40" width="40" height="34" aria-hidden="true" className="shrink-0">
      <path d="M6 26C6 13 15 5 27 5c11 0 17 7 17 17v7c0 3-2 5-5 5H13c-4 0-7-3-7-7z" fill={color} />
      <path d="M22 14h21c.6 2 1 4.5 1 7v2H24c-2 0-3.5-1.5-3.5-3.5V16c0-1 .5-2 1.5-2z" fill="#0b0b0c" />
      <path d="M26 16.5h13" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 29.5h34" stroke={ink(color)} strokeOpacity=".45" strokeWidth="2" />
    </svg>
  )
}

function Car({color}: {color: string}) {
  return (
    <svg viewBox="0 0 96 32" width="56" height="19" aria-hidden="true" className="shrink-0">
      <path d="M3 5h13v6H3z" fill={color} />
      <path d="M8 11h3v8H8z" fill="#3a3a3c" />
      <path d="M10 21l4-7 20-2 12-4h12l4 4 22 4 10 3v3H10z" fill={color} />
      <path d="M46 8l6-5h4l2 5z" fill="#0b0b0c" />
      <path d="M82 23h13v2.5H82z" fill={color} />
      <circle cx="22" cy="22" r="8" fill="#111" stroke="#3a3a3c" strokeWidth="2" />
      <circle cx="76" cy="23" r="7" fill="#111" stroke="#3a3a3c" strokeWidth="2" />
    </svg>
  )
}

function Flag({code, size = 20}: {code: string; size?: number}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local SVGs, nothing for next/image to optimise
    <img src={`/flags/${code.toLowerCase()}.svg`} alt="" width={size} height={(size * 2) / 3} className="inline-block shrink-0 rounded-[3px] align-[-2px]" />
  )
}

// F1 start lights while the question loads; after a few seconds, explain the wait
function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="mt-5" role="status">
      <div className="lights" aria-hidden="true">
        {Array.from({length: 5}, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <p className="display mt-6 text-3xl">{slow ? 'Writing a fresh question…' : 'Lights out and away we go…'}</p>
      <p className="mt-1 text-sm text-secondary">
        {slow
          ? 'Nobody has raced this one yet, so the race engineer is checking the answer against the data. Around 20 seconds.'
          : 'Getting your question from the race data.'}
      </p>
      <ul className="mt-8 flex flex-col gap-2.5" aria-hidden="true">
        {Array.from({length: 4}, (_, i) => (
          <li key={i} className="h-14 animate-pulse bg-surface" style={{animationDelay: `${i * 120}ms`}} />
        ))}
      </ul>
    </div>
  )
}

// Real F1 start: five red lights one by one, a random hold so nobody can anticipate it, then lights out
function StartSequence({onDone}: {onDone: () => void}) {
  const [lit, setLit] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    const timers = [1, 2, 3, 4, 5].map((n) =>
      setTimeout(() => {
        setLit(n)
        sfx.light()
      }, n * 450),
    )
    const hold = 2550 + Math.random() * 900
    timers.push(
      setTimeout(() => {
        setOut(true)
        sfx.lightsOut()
      }, hold),
    )
    timers.push(setTimeout(onDone, hold + 700))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-black"
      onClick={onDone}
      role="status"
      aria-label={out ? 'Lights out' : `${lit} of 5 lights on`}
    >
      <div className="text-center">
        <div className="gantry" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={!out && lit >= n ? 'on' : ''} />
          ))}
        </div>
        <p className={`display mt-10 text-4xl transition-opacity duration-200 sm:text-5xl ${out ? 'opacity-100' : 'opacity-0'}`}>Lights out!</p>
        <p className="mt-3 text-xs text-secondary">Click to skip</p>
      </div>
    </div>
  )
}

function ChequeredFlag() {
  return <div className="chequered" aria-hidden="true" />
}

// Podium champagne spray: a fan of droplets from the score
function Champagne() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {Array.from({length: 28}, (_, i) => {
        const angle = ((-165 + (i * 150) / 27) * Math.PI) / 180
        const reach = 110 + (i % 5) * 28
        return (
          <span
            key={i}
            className="spray"
            style={
              {'--dx': `${Math.cos(angle) * reach}px`, '--dy': `${Math.sin(angle) * reach}px`, animationDelay: `${700 + (i % 4) * 40}ms`} as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}

// Perfect race: tyre smoke from the winner's donuts
function Smoke() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({length: 7}, (_, i) => (
        <span key={i} className="smoke" style={{left: `${8 + i * 13}%`, animationDelay: `${i * 160}ms`}} />
      ))}
    </div>
  )
}

function SoundToggle() {
  const [muted, setMutedState] = useState(() => isMuted())
  return (
    <button
      className="icon-btn"
      aria-label={muted ? 'Turn sound on' : 'Mute sound'}
      aria-pressed={muted}
      onClick={() => {
        if (muted) {
          setMuted(false)
          unlockAudio()
          sfx.select(0)
        } else {
          sfx.back()
          setMuted(true)
        }
        setMutedState(!muted)
      }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 8v4h3l4 3.5v-11L6 8z" fill="currentColor" />
        {muted ? (
          <path d="M13.5 7.5l5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M13 7.2a4 4 0 0 1 0 5.6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}

type Checked = {kind: 'data' | 'rules'; detail: string}
type RadioLine = {from: 'you' | 'engineer'; text: string; checked?: Checked[]}
const RADIO_PER_LAP = 2

// Ask the race engineer about this race. A live agent answers from the race data and the rules
// Knowledge Base, and every reply lists what it looked up.
function TeamRadio({round, context, suggestions}: {round: number; context: string; suggestions: string[]}) {
  const [lines, setLines] = useState<RadioLine[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code] = useState(() => storage.get('pitwall.code') ?? 'YOU')
  const left = RADIO_PER_LAP - lines.filter((l) => l.from === 'you').length

  function send(message: string) {
    const text = message.trim()
    if (!text || busy || left <= 0) return
    unlockAudio()
    sfx.select(1)
    setLines((l) => [...l, {from: 'you', text}])
    setDraft('')
    setBusy(true)
    setError('')
    post<{reply: string; checked: Checked[]}>('/api/radio', {round, message: text, context})
      .then((r) => {
        sfx.radio()
        setLines((l) => [...l, {from: 'engineer', text: r.reply, checked: r.checked}])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  return (
    <section className="card p-4" aria-label="Team radio">
      <p className="pixel flex items-center gap-2 text-xs uppercase text-secondary">
        <span className={`wave text-accent ${busy ? 'on' : ''}`} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        TEAM RADIO
        <span className="ml-auto">{left > 0 ? `${left} left this lap` : 'Channel closed this lap'}</span>
      </p>

      {lines.length > 0 && (
        <ol className="mt-3 flex flex-col gap-3" aria-live="polite">
          {lines.map((l, i) => (
            <li key={i} className="text-[0.9375rem] leading-relaxed">
              <span className={`display mr-2 text-sm ${l.from === 'you' ? 'text-fg' : 'text-accent'}`}>{l.from === 'you' ? code : 'Engineer'}</span>
              {l.from === 'engineer' ? `“${l.text}”` : l.text}
              {!!l.checked?.length && (
                <details className="mt-1 text-xs text-secondary">
                  <summary className="cursor-pointer list-none hover:text-fg">What I checked ({l.checked.length}) ›</summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {l.checked.map((c, j) => (
                      <li key={j}>
                        <span className="pixel uppercase">{c.kind === 'data' ? 'Race data (GROQ)' : 'Rules knowledge base'}:</span>{' '}
                        <span className={c.kind === 'data' ? 'break-all font-mono' : ''}>{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}

      {busy && <p className="mt-3 text-sm text-secondary">Engineer is checking the data…</p>}
      {error && <p className="mt-2 text-sm text-red">{error}</p>}

      {left > 0 && !busy && (
        <>
          {lines.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="min-h-9 border border-separator px-3 text-[0.9375rem] transition-colors hover:bg-ink hover:text-bg"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 160))}
              placeholder="Ask your race engineer…"
              aria-label="Radio message"
              className="min-h-11 flex-1 border border-separator bg-transparent px-3 text-[0.9375rem] placeholder:text-secondary/60 focus:outline-2 focus:outline-ink"
            />
            <button className="btn-secondary !min-h-11 !px-4 !text-[0.9375rem]" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </section>
  )
}

function Results(props: {
  race: Race
  tyre: Tyre
  laps: Lap[]
  score: number
  run: string | null
  copied: boolean
  onShare: () => void
  onRestart: () => void
  onMenu: () => void
  onStandings: () => void
}) {
  const {race, tyre, laps, score} = props
  const headline = score === LAPS ? 'Perfect race.' : score >= 3 ? 'Points finish.' : score >= 1 ? 'Keep pushing.' : 'Back to the garage.'
  const podium = score >= 3
  useEffect(() => {
    sfx.crowd()
    const t = podium ? setTimeout(sfx.champagne, 700) : undefined
    return () => clearTimeout(t)
  }, [podium])
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
        <h1 className="display mt-3 text-4xl">{headline}</h1>

        <Championship run={props.run} onStandings={props.onStandings} />

        <div className="mt-6 flex w-full flex-col gap-2.5">
          <button className="btn-primary" onClick={props.onRestart}>
            Race again
          </button>
          <button className="btn-secondary" onClick={props.onShare}>
            {props.copied ? 'Copied' : 'Share result'}
          </button>
          <button className="link-invert mt-1 min-h-11 self-center text-xs" onClick={props.onMenu}>
            Choose another race
          </button>
        </div>
      </div>

      <div className="lg:pt-2">
        <p className="eyebrow">Your laps</p>
        <ol className="mt-3 w-full divide-y divide-separator card text-left">
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

function Championship({run, onStandings}: {run: string | null; onStandings: () => void}) {
  const [saved, setSaved] = useState<(Table & {points: number}) | null>(null)
  const [error, setError] = useState('')

  // Every finished race goes on the standings under the code picked at the start
  useEffect(() => {
    post<Table & {points: number}>('/api/finish', {
      run,
      code: storage.get('pitwall.code'),
      player: playerId(),
    })
      .then(setSaved)
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <p className="mt-8 text-sm text-red">Couldn’t save to the standings: {error}</p>
  if (!saved?.you) return <p className="mt-8 text-sm text-secondary">Adding your points to the standings…</p>
  return (
    <div className="mt-8 w-full card p-5">
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

function Onboarding({current, onBack, onSaved}: {current: string; onBack: () => void; onSaved: () => void}) {
  const [draft, setDraft] = useState(current)
  const ok = validCode(draft)
  // Esc backs out when changing an existing code
  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, onBack])
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <Wordmark />
      <form
        className="flex flex-1 flex-col justify-center gap-8 py-10"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          unlockAudio()
          saveCode(draft)
          onSaved()
        }}
      >
        <div>
          {current && (
            <button type="button" className="link-invert mb-6 flex min-h-11 items-center gap-1 text-sm" onClick={onBack}>
              <Chevron dir="left" />
              Back
            </button>
          )}
          <h1 className="display text-5xl">{current ? 'Change your code' : 'Pick your driver code'}</h1>
          <p className="mt-3 text-[0.9375rem] text-secondary">Three letters, like VER or HAM. It’s how you appear in the championship standings.</p>
        </div>
        <div>
          <label htmlFor="code" className="sr-only">
            Driver code
          </label>
          <input
            id="code"
            value={draft}
            onChange={(e) => {
              const next = e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 3)
              if (next !== draft) {
                unlockAudio()
                sfx.key()
              }
              setDraft(next)
            }}
            placeholder="ABC"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="display min-h-20 w-full border border-fg/40 bg-transparent px-6 text-center text-6xl tracking-[0.3em] placeholder:text-secondary/30 focus:outline-2 focus:outline-ink"
          />
          {draft.length === 3 && !ok && <p className="mt-2 text-sm text-red">Pick a different code.</p>}
        </div>
        <button className="btn-primary w-full" disabled={!ok}>
          {current ? 'Save' : 'Let’s race'}
        </button>
        <p className="text-center text-xs text-secondary">Saved in this browser. No account needed.</p>
      </form>
    </main>
  )
}

function Standings({onBack}: {onBack: () => void}) {
  const [table, setTable] = useState<Table | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch(`/api/standings?player=${encodeURIComponent(storage.get('pitwall.player') ?? '')}`)
      .then((r) => r.json())
      .then(setTable)
      .catch(() => setError('Could not load the standings.'))
  }, [])

  const row = (r: Table['rows'][number]) => (
    <li key={r.position} className={`flex items-center gap-4 px-4 py-3 ${r.you ? 'bg-surface-2' : ''}`}>
      <span className="pixel w-8 text-sm tabular-nums text-secondary">P{r.position}</span>
      <span className="display flex-1 text-xl">
        {r.code}
        {r.you && <span className="pixel ml-2 align-middle text-[0.625rem] not-italic uppercase text-accent">You</span>}
      </span>
      <span className="pixel text-[0.6875rem] uppercase text-secondary">
        {r.races} {r.races === 1 ? 'race' : 'races'}
      </span>
      <span className="pixel w-20 text-right tabular-nums">{r.points} pts</span>
    </li>
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <button className="icon-btn" aria-label="Back to menu" onClick={onBack}>
          <Chevron dir="left" />
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
        <div className="mt-8 h-48 animate-pulse card" aria-busy="true" />
      ) : table.rows.length === 0 ? (
        <p className="mt-8 text-secondary">No finishers yet. Finish a race to take P1.</p>
      ) : (
        <>
          <ol className="mt-8 divide-y divide-separator overflow-hidden card">{table.rows.map(row)}</ol>
          {table.you && !table.rows.some((r) => r.you) && (
            <ol className="mt-3 overflow-hidden card">
              {row({
                position: table.you.position,
                code: table.you.code,
                points: table.you.points,
                races: 0,
                you: true,
              })}
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

// Shown after the answer: the field starts in grid order, then slides into the finishing order
function Tower({rows, highlight}: {rows: Result[]; highlight: string}) {
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
          const out = r.position === null
          const gained = r.positionsGained ?? 0
          return (
            <li
              key={r.driver.name}
              className={`absolute inset-x-0 flex items-center gap-2.5 px-2 transition-transform duration-[1200ms] ease-in-out ${
                highlight === r.driver.name ? 'bg-surface-2' : ''
              }`}
              style={{
                height: ROW,
                transform: `translateY(${order.indexOf(r) * ROW}px)`,
              }}
            >
              <span className="pixel w-8 text-right text-xs tabular-nums text-secondary">{finish ? (out ? r.positionText : r.position) : (r.gridPosition ?? 'PL')}</span>
              <span className="h-3.5 w-[3px] rounded-full" style={{background: TEAM_COLORS[r.team] ?? '#777'}} aria-hidden="true" />
              <span className="pixel flex-1">{r.driver.abbreviation}</span>
              {finish && (
                <span className={`pixel text-xs tabular-nums ${out ? 'text-secondary' : gained > 0 ? 'text-green' : gained < 0 ? 'text-red' : 'text-secondary'}`}>
                  {out ? 'Out' : gained ? `${gained > 0 ? '+' : '−'}${Math.abs(gained)}` : '·'}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
