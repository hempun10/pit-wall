import {sfx} from '@/lib/sfx'
import type {Race} from '@/lib/sanity'
import type {Question, Verdict} from '@/lib/types'
import {TeamRadio} from './team-radio'

type Props = {question: Question; verdict: Verdict; race: Race; lastLap: boolean; onAdvance: () => void}

function verdictText(verdict: Verdict) {
  if (!verdict.correct) return {text: `Not quite. It was ${verdict.answer}.`, tone: 'text-red'}
  if (verdict.streak >= 3) return {text: `Purple sector! ${verdict.streak} in a row.`, tone: 'text-purple'}
  return {text: 'Correct.', tone: 'text-green'}
}

// After an answer: the verdict, the F1 term explained, the team radio, and the proof
export function VerdictPanel({question, verdict, race, lastLap, onAdvance}: Props) {
  const {text, tone} = verdictText(verdict)
  return (
    <div className="appear mt-8 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className={`display text-3xl ${tone}`}>{text}</p>
        <button className="btn-primary shrink-0" onClick={onAdvance}>
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
          The AI wrote this GROQ query. Our server ran it on the Sanity dataset and graded you with the result. The explanation comes from the rules Knowledge
          Base (“{question.kbEntry}”).
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-surface p-3 font-mono text-xs text-fg/80">{verdict.answerQuery}</pre>
      </details>
    </div>
  )
}
