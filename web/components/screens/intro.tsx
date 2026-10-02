import {useKeydown} from '@/hooks/use-keydown'
import {Wordmark} from '@/components/ui/wordmark'

// Title card: the wordmark sharpens out of the paper, then a quiet enter link appears.
// The click (or Enter) that leaves it is also what lets the browser play sound.
export function Intro({onEnter}: {onEnter: () => void}) {
  useKeydown((e) => e.key === 'Enter' && onEnter())

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
