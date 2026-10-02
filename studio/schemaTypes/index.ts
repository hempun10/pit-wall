import {defineField, defineType} from 'sanity'

const str = (name: string, description?: string) => defineField({name, type: 'string', description})
const num = (name: string, description?: string) => defineField({name, type: 'number', description})
const bool = (name: string, description?: string) => defineField({name, type: 'boolean', description})
const ref = (name: string, to: string) => defineField({name, type: 'reference', to: [{type: to}]})

const driver = defineType({
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

const team = defineType({
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

const circuit = defineType({
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

const race = defineType({
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

const raceResult = defineType({
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

const driverStanding = defineType({
  name: 'driverStanding',
  description: 'Championship table row for a season; for the current year it is the table so far',
  type: 'document',
  fields: [num('year'), num('position'), ref('driver', 'driver'), num('points'), bool('champion')],
  preview: {select: {title: 'driver.name', subtitle: 'year'}},
})

const teamStanding = defineType({
  name: 'teamStanding',
  description: 'Team championship table row for a season; for the current year it is the table so far',
  type: 'document',
  fields: [num('year'), num('position'), ref('team', 'team'), num('points'), bool('champion')],
  preview: {select: {title: 'team.name', subtitle: 'year'}},
})

const quizQuestion = defineType({
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

const quizRun = defineType({
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

export const schemaTypes = [driver, team, circuit, race, raceResult, driverStanding, teamStanding, quizQuestion, quizRun]
