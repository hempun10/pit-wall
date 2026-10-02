import {randomUUID} from 'node:crypto'
import type {Tyre} from '@/lib/f1'
import {create, groq} from '@/lib/sanity'
import {writeQuestion, type Submission} from './agent'

// Hard ceiling on spend: the agent only writes until each round+tyre holds this many questions.
// After that every play is served from Sanity at no model cost.
export const TARGET = 6

export type Banked = Submission & {_id: string; answer: string}

export function slot(round: number, tyre: Tyre) {
  return groq<Banked[]>(
    `*[_type == "quizQuestion" && round == ${round} && tyre == "${tyre}"]{_id, question, answerQuery, answerKind, answer, term, termExplanation, kbEntry}`,
  )
}

export async function generate(round: number, grandPrix: string, tyre: Tyre, existing: Banked[], signal?: AbortSignal) {
  const q = await writeQuestion({round, grandPrix, tyre, asked: existing.map((e) => e.question), signal})
  const banked: Banked = {...q, _id: `quiz-${round}-${tyre}-${randomUUID().slice(0, 8)}`, answer: String(q.answer)}
  const duplicate = existing.some((e) => e.question.trim().toLowerCase() === q.question.trim().toLowerCase())
  if (!duplicate) {
    const {_id, ...fields} = banked
    await create({_id, _type: 'quizQuestion', round, tyre, ...fields, model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'})
  }
  return banked
}

// ponytail: per-instance counter; keeps one server from flooding OpenAI's tokens-per-minute limit.
// A shared lock would be needed if this ran on many instances under heavy traffic.
let running = 0
export async function topUp(round: number, grandPrix: string, tyre: Tyre) {
  if (running >= 2) return
  running++
  try {
    const existing = await slot(round, tyre)
    if (existing.length < TARGET) await generate(round, grandPrix, tyre, existing)
  } catch (e) {
    console.error('[bank] top-up failed', e)
  } finally {
    running--
  }
}
