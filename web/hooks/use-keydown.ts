import {useEffect, useRef} from 'react'

// One window keydown listener per screen. It ignores shortcuts with modifier keys and typing in a
// text field (except Escape), and always calls the latest handler without re-subscribing.
export function useKeydown(handler: (e: KeyboardEvent) => void, active = true) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== 'Escape' && (e.target as HTMLElement).closest('input, textarea')) return
      latest.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

// Enter on a focused button already clicks it; screen-level Enter shortcuts should skip those
export const isFromButton = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest('button')
