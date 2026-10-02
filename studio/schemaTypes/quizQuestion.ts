import {defineField, defineType} from 'sanity'
import {str, num} from './fields'

// Questions in the bank: written by the agent, answer verified by the server running answerQuery
export const quizQuestion = defineType({
  name: 'quizQuestion',
  title: 'Quiz question',
  description: 'Written by the Pit Wall agent, verified by running answerQuery against this dataset',
  type: 'document',
  fields: [
    num('round'),
    defineField({name: 'tyre', type: 'string', options: {list: ['soft', 'medium', 'hard']}}),
    str('question'),
    defineField({name: 'answerQuery', type: 'text', description: 'GROQ the agent wrote; the app runs it to get the answer'}),
    str('answer', 'The value answerQuery returned when the question was saved'),
    defineField({name: 'answerKind', type: 'string', options: {list: ['driver', 'team', 'number']}}),
    str('term', 'F1 term the question teaches'),
    defineField({name: 'termExplanation', type: 'text'}),
    str('kbEntry', 'Knowledge base entry the explanation came from'),
    str('model'),
  ],
  preview: {select: {title: 'question', subtitle: 'tyre', round: 'round'}, prepare: ({title, subtitle, round}) => ({title, subtitle: `R${round} · ${subtitle}`})},
})
