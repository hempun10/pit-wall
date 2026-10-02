import {defineType} from 'sanity'
import {str, num} from './fields'

export const team = defineType({
  name: 'team',
  title: 'Team (constructor)',
  type: 'document',
  fields: [
    str('name'),
    str('fullName'),
    str('country'),
    num('totalRaceWins', 'All-time total'),
    num('totalChampionshipWins', 'All-time total'),
  ],
})
