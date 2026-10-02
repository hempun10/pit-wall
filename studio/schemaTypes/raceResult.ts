import {defineType} from 'sanity'
import {str, num, bool, ref} from './fields'

export const raceResult = defineType({
  name: 'raceResult',
  description: 'One driver in one Grand Prix (main race, not the sprint)',
  type: 'document',
  fields: [
    ref('race', 'race'),
    ref('driver', 'driver'),
    ref('team', 'team'),
    num('year', 'Copied from the race for cheap filtering'),
    num('round', 'Copied from the race for cheap filtering'),
    num('positionOrder', 'Row order in the classification, 1 = first row; always set'),
    num('position', 'Finishing position; empty if not classified'),
    str('positionText', 'Position as printed: a number, or DNF, DNS, DSQ, NC'),
    num('gridPosition', 'Starting slot; empty if started from the pit lane'),
    str('gridText', 'Grid as printed: a number or PL (pit lane)'),
    num('qualifyingPosition'),
    num('positionsGained', 'Grid minus finish; negative means places lost; empty if not classified'),
    num('points', 'Points from the main race only; sprint points are not included'),
    num('laps'),
    str('time', 'Race time for the winner and lead-lap finishers'),
    str('gap', 'Gap to the winner'),
    str('reasonRetired'),
    num('pitStops'),
    bool('polePosition'),
    bool('fastestLap'),
    bool('driverOfTheDay'),
  ],
  preview: {select: {title: 'driver.name', subtitle: 'race.officialName'}},
})
