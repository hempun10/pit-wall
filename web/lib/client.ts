// Browser-side helpers: API calls and this browser's saved identity

export async function post<T>(url: string, body: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal})
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

// localStorage can throw (private mode, blocked storage), so every access is guarded
export const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {}
  },
}

export const CODE_KEY = 'pitwall.code'
const PLAYER_KEY = 'pitwall.player'

// No accounts: a random id kept in this browser ties finished races together for the standings
export function playerId() {
  let id = storage.get(PLAYER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    storage.set(PLAYER_KEY, id)
  }
  return id
}

export const savedPlayerId = () => storage.get(PLAYER_KEY) ?? ''
