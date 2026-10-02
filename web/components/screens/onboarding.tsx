import {useState} from 'react'
import {saveDriverCode} from '@/hooks/use-driver-code'
import {useKeydown} from '@/hooks/use-keydown'
import {validCode} from '@/lib/codes'
import {sfx, unlockAudio} from '@/lib/sfx'
import {ChevronIcon} from '@/components/ui/icons'
import {Wordmark} from '@/components/ui/wordmark'

const toCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)

// Pick (or change) the three-letter code the player races under. No account: it lives in this browser.
export function Onboarding({current, onBack, onSaved}: {current: string; onBack: () => void; onSaved: () => void}) {
  const [draft, setDraft] = useState(current)
  const ok = validCode(draft)
  const changing = !!current

  useKeydown((e) => e.key === 'Escape' && onBack(), changing)

  function type(value: string) {
    const next = toCode(value)
    if (next !== draft) {
      unlockAudio()
      sfx.key()
    }
    setDraft(next)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!ok) return
    unlockAudio()
    saveDriverCode(draft)
    onSaved()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <Wordmark />
      <form className="flex flex-1 flex-col justify-center gap-8 py-10" onSubmit={save}>
        <div>
          {changing && (
            <button type="button" className="link-invert mb-6 flex min-h-11 items-center gap-1 text-sm" onClick={onBack}>
              <ChevronIcon dir="left" />
              Back
            </button>
          )}
          <h1 className="display text-5xl">{changing ? 'Change your code' : 'Pick your driver code'}</h1>
          <p className="mt-3 text-[0.9375rem] text-secondary">Three letters, like VER or HAM. It’s how you appear in the championship standings.</p>
        </div>
        <div>
          <label htmlFor="code" className="sr-only">
            Driver code
          </label>
          <input
            id="code"
            value={draft}
            onChange={(e) => type(e.target.value)}
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
          {changing ? 'Save' : 'Let’s race'}
        </button>
        <p className="text-center text-xs text-secondary">Saved in this browser. No account needed.</p>
      </form>
    </main>
  )
}
