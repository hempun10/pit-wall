import type {Result} from '@/lib/sanity'
import type {Verdict} from '@/lib/types'
import {OptionArt} from '@/components/ui/option-art'

export const ANSWER_KEYS = ['A', 'B', 'C', 'D']

type Props = {options: string[]; verdict: Verdict | null; picked: string | null; rows: Result[]; onPick: (option: string) => void}

function optionState(option: string, verdict: Verdict | null, picked: string | null) {
  if (verdict) {
    if (option.toLowerCase() === verdict.answer.toLowerCase()) return 'correct'
    if (option === verdict.choice && !verdict.correct) return 'wrong'
    return 'dim'
  }
  if (picked) return picked === option ? 'blink' : 'dim'
  return ''
}

export function AnswerList({options, verdict, picked, rows, onPick}: Props) {
  return (
    <ul className="mt-8 flex flex-col gap-2.5">
      {options.map((option, i) => {
        const state = optionState(option, verdict, picked)
        return (
          <li key={option} className="appear" style={{animationDelay: `${i * 60}ms`}}>
            <button
              data-option
              onClick={() => onPick(option)}
              disabled={!!verdict || !!picked}
              aria-keyshortcuts={ANSWER_KEYS[i]}
              className={`option ${state}`}
            >
              <span className="flex items-center gap-3">
                <OptionArt value={option} rows={rows} />
                {option}
              </span>
              {!verdict && <kbd className="key">{ANSWER_KEYS[i]}</kbd>}
              {state === 'correct' && (
                <span className="text-green" aria-label="correct answer">
                  ✓
                </span>
              )}
              {state === 'wrong' && (
                <span className="text-red" aria-label="your answer">
                  ✕
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
