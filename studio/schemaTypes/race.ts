import {defineField, defineType} from 'sanity'
import {str, num, bool, ref} from './fields'

export const race = defineType({
  name: 'race',
  type: 'document',
  fields: [
    num('year'),
    num('round'),
    defineField({name: 'date', type: 'date'}),
    str('grandPrix', 'Short name, e.g. Azerbaijan'),
    str('officialName'),
    ref('circuit', 'circuit'),
    num('laps', 'Laps actually run'),
    num('distanceKm'),
    bool('hasSprint', 'True if the weekend included a sprint race'),
    bool('completed', 'False for races on the calendar that have not been run yet'),
  ],
  preview: {select: {title: 'officialName', subtitle: 'date'}},
})
