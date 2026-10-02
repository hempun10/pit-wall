// F1 facts and formatting shared by the app and the server

export type Tyre = 'soft' | 'medium' | 'hard'

export const LAPS = 5

// Correct answers out of 5 score like F1's top five finishers: 25, 18, 15, 12, 10
export const POINTS = [0, 10, 12, 15, 18, 25]

export const TYRES: {id: Tyre; label: string; color: string; hint: string; emoji: string}[] = [
  {id: 'soft', label: 'Soft', color: '#ff453a', hint: 'One fact from the race', emoji: '🔴'},
  {id: 'medium', label: 'Medium', color: '#ffd60a', hint: 'Compare drivers in the race', emoji: '🟡'},
  {id: 'hard', label: 'Hard', color: '#f5f5f7', hint: 'The season so far', emoji: '⚪'},
]

export const tyreOf = (id: Tyre) => TYRES.find((t) => t.id === id)!

const TEAM_COLORS: Record<string, string> = {
  Mercedes: '#27F4D2',
  Ferrari: '#E8002D',
  McLaren: '#FF8000',
  'Red Bull': '#3671C6',
  'Aston Martin': '#229971',
  Alpine: '#0093CC',
  Williams: '#64C4FF',
  'Racing Bulls': '#6692FF',
  Haas: '#B6BABD',
  Audi: '#F50537',
  Cadillac: '#C8A45D',
}

export const isTeam = (name: string) => name in TEAM_COLORS
export const teamColor = (team: string) => TEAM_COLORS[team] ?? '#777777'

// Black or white, whichever reads better on a team colour
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#000' : '#fff'
}

export const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'})
