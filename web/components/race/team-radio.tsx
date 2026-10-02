import {useState} from 'react'
import {CODE_KEY, post, storage} from '@/lib/client'
import {sfx, unlockAudio} from '@/lib/sfx'
import type {Checked} from '@/lib/types'

type Line = {from: 'you' | 'engineer'; text: string; checked?: Checked[]}

const MESSAGES_PER_LAP = 2

// Ask the race engineer about this race. A live agent answers from the race data and the rules
// Knowledge Base, and every reply lists what it looked up.
export function TeamRadio({round, context, suggestions}: {round: number; context: string; suggestions: string[]}) {
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code] = useState(() => storage.get(CODE_KEY) ?? 'YOU')
  const left = MESSAGES_PER_LAP - lines.filter((l) => l.from === 'you').length

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
        Team radio
        <span className="ml-auto">{left > 0 ? `${left} left this lap` : 'Channel closed this lap'}</span>
      </p>

      {lines.length > 0 && (
        <ol className="mt-3 flex flex-col gap-3" aria-live="polite">
          {lines.map((line, i) => (
            <RadioLine key={i} line={line} code={code} />
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

function RadioLine({line, code}: {line: Line; code: string}) {
  const fromEngineer = line.from === 'engineer'
  return (
    <li className="text-[0.9375rem] leading-relaxed">
      <span className={`display mr-2 text-sm ${fromEngineer ? 'text-accent' : 'text-fg'}`}>{fromEngineer ? 'Engineer' : code}</span>
      {fromEngineer ? `“${line.text}”` : line.text}
      {!!line.checked?.length && (
        <details className="mt-1 text-xs text-secondary">
          <summary className="cursor-pointer list-none hover:text-fg">What I checked ({line.checked.length}) ›</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {line.checked.map((c, i) => (
              <li key={i}>
                <span className="pixel uppercase">{c.kind === 'data' ? 'Race data (GROQ)' : 'Rules knowledge base'}:</span>{' '}
                <span className={c.kind === 'data' ? 'break-all font-mono' : ''}>{c.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}
