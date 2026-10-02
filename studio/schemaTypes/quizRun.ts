import {defineField, defineType} from 'sanity'
import {str, num} from './fields'

// One finished 5-lap game, saved by /api/finish from the server-graded run
export const quizRun = defineType({
  name: 'quizRun',
  title: 'Finished race (player)',
  description: 'One finished 5-lap game. The score comes from the server-graded run, never from the browser.',
  type: 'document',
  fields: [
    str('code', 'Three-letter driver code the player chose'),
    str('playerId', 'Random id kept in the player’s browser'),
    num('round'),
    defineField({name: 'tyre', type: 'string', options: {list: ['soft', 'medium', 'hard']}}),
    num('correct', 'Correct answers out of 5'),
    num('points', 'F1 points: 25, 18, 15, 12, 10 for 5 to 1 correct'),
    defineField({name: 'finishedAt', type: 'datetime'}),
  ],
  orderings: [{title: 'Newest', name: 'newest', by: [{field: 'finishedAt', direction: 'desc'}]}],
  preview: {select: {code: 'code', points: 'points', round: 'round', tyre: 'tyre'}, prepare: ({code, points, round, tyre}) => ({title: `${code} · ${points} pts`, subtitle: `R${round} · ${tyre}`})},
})
