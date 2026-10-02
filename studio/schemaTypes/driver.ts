import {defineField, defineType} from 'sanity'
import {str, num} from './fields'

export const driver = defineType({
  name: 'driver',
  type: 'document',
  fields: [
    str('name'),
    str('fullName'),
    str('abbreviation', 'Three-letter code shown on timing screens, e.g. VER'),
    num('permanentNumber'),
    defineField({name: 'dateOfBirth', type: 'date'}),
    str('nationality'),
    num('totalRaceStarts', 'Career total, all seasons'),
    num('totalRaceWins', 'Career total, all seasons'),
    num('totalPodiums', 'Career total, all seasons'),
    num('totalPolePositions', 'Career total, all seasons'),
    num('totalChampionshipWins', 'Career total, all seasons'),
  ],
})
