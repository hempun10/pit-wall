import {useSyncExternalStore} from 'react'
import {CODE_KEY, storage} from '@/lib/client'

const CHANGE_EVENT = 'pitwall-code'

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// The player's three-letter code, saved in this browser. Reads undefined on the server and during
// hydration (so nothing flashes before we know who's playing) and null when no code is saved yet.
export function useDriverCode() {
  return useSyncExternalStore(
    subscribe,
    () => storage.get(CODE_KEY),
    () => undefined,
  )
}

export function saveDriverCode(code: string) {
  storage.set(CODE_KEY, code)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
