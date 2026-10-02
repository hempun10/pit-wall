import {defineType} from 'sanity'
import {num, bool, ref} from './fields'

// Championship tables per season. For the current season they hold the table as of the latest round.
export const driverStanding = defineType({
  name: 'driverStanding',
  description: 'Championship table row for a season; for the current year it is the table so far',
  type: 'document',
  fields: [num('year'), num('position'), ref('driver', 'driver'), num('points'), bool('champion')],
  preview: {select: {title: 'driver.name', subtitle: 'year'}},
})

export const teamStanding = defineType({
  name: 'teamStanding',
  description: 'Team championship table row for a season; for the current year it is the table so far',
  type: 'document',
  fields: [num('year'), num('position'), ref('team', 'team'), num('points'), bool('champion')],
  preview: {select: {title: 'team.name', subtitle: 'year'}},
})
