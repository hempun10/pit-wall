// Shapes the browser and the API routes exchange

export type Question = {
  id: string
  question: string
  options: string[]
  term: string
  termExplanation: string
  kbEntry: string
  token: string // encrypted answer, opened only by /api/answer
}

export type Verdict = {
  correct: boolean
  answer: string
  answerQuery: string
  choice: string
  streak: number // correct answers in a row, including this one
}

export type Lap = {question: string; correct: boolean; answer: string}

export type StandingsTable = {
  rows: {position: number; code: string; points: number; races: number; you: boolean}[]
  you: {position: number; points: number; code: string} | null
  players: number
}

// What the race engineer looked up before replying on the team radio
export type Checked = {kind: 'data' | 'rules'; detail: string}
