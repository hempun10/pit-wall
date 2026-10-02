import {useEffect, useState} from 'react'
import {sfx} from '@/lib/sfx'

// Real F1 start: five red lights one by one, a random hold so nobody can anticipate it, then lights out
export function StartSequence({onDone}: {onDone: () => void}) {
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
      setTimeout(onDone, hold + 700),
    )
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
