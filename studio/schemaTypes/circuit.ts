import {defineType} from 'sanity'
import {str, num} from './fields'

export const circuit = defineType({
  name: 'circuit',
  type: 'document',
  fields: [
    str('name'),
    str('fullName'),
    str('placeName'),
    str('country'),
    str('countryCode', 'ISO 3166 alpha-2, e.g. AZ; used for the flag'),
    str('circuitType', 'RACE, ROAD or STREET'),
    num('lengthKm'),
    num('turns'),
  ],
})
