import {useEffect, useRef, useState} from 'react'
import {post} from '@/lib/client'
import {LAPS, type Tyre} from '@/lib/f1'
import {sfx} from '@/lib/sfx'
import type {Lap, Question, Verdict} from '@/lib/types'

type Graded = Omit<Verdict, 'choice' | 'streak'> & {run: string}

// Correct answers in a row ending with this one
function streakAfter(laps: Lap[], correct: boolean) {
  if (!correct) return 0
  let streak = 1
  while (laps[laps.length - streak]?.correct) streak++
  return streak
}

// Everything that happens during one race: fetching questions (one ahead), grading answers
// on the server, and keeping the laps, score and encrypted run token.
export function useRace(round: number, tyre: Tyre) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [laps, setLaps] = useState<Lap[]>([])
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)
  const [run, setRun] = useState<string | null>(null) // encrypted score so far, issued by the server
  const seen = useRef<string[]>([])
  const nextQuestion = useRef<Promise<Question> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const lastLap = laps.length === LAPS

  const fetchQuestion = () => post<Question>('/api/question', {round, tyre, seen: seen.current}, abort.current?.signal)

  // Usually the next question comes straight from the question bank, but a round nobody has
  // played may need the agent to write one live, so it's requested while this one is on screen
  function show(q: Question) {
    seen.current.push(q.id)
    setQuestion(q)
    if (seen.current.length >= LAPS) return
    nextQuestion.current = fetchQuestion()
    nextQuestion.current.catch(() => {})
  }

  function load(pending: Promise<Question>) {
    setQuestion(null)
    setVerdict(null)
    setPicked(null)
    setError('')
    pending.then(show).catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
  }

  // Leaving the race cancels its in-flight requests (and React's development double-mount
  // doesn't run every question twice)
  useEffect(() => {
    const controller = new AbortController()
    abort.current = controller
    fetchQuestion()
      .then(show)
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function grade(choice: string) {
    if (!question || verdict) return
    const graded = await post<Graded>('/api/answer', {token: question.token, choice, run}).catch((e: Error) => {
      setError(e.message)
      setPicked(null)
      return null
    })
    if (!graded) return
    const streak = streakAfter(laps, graded.correct)
    if (!graded.correct) sfx.wrong()
    else if (streak >= 3) sfx.purple()
    else sfx.correct()
    setRun(graded.run)
    setVerdict({correct: graded.correct, answer: graded.answer, answerQuery: graded.answerQuery, choice, streak})
    setLaps((l) => [...l, {question: question.question, correct: graded.correct, answer: graded.answer}])
  }

  // Like Typeform: the chosen answer blinks, then it's graded
  function pick(choice: string) {
    if (!question || verdict || picked) return
    setPicked(choice)
    sfx.select(1)
    setTimeout(() => grade(choice), 380)
  }

  function advance() {
    if (lastLap) setFinished(true)
    else load(nextQuestion.current ?? fetchQuestion())
  }

  return {
    question,
    verdict,
    picked,
    laps,
    score: laps.filter((l) => l.correct).length,
    lastLap,
    finished,
    error,
    run,
    pick,
    advance,
    retry: () => load(fetchQuestion()),
  }
}
