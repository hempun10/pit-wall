import {circuit} from './circuit'
import {driver} from './driver'
import {quizQuestion} from './quizQuestion'
import {quizRun} from './quizRun'
import {race} from './race'
import {raceResult} from './raceResult'
import {driverStanding, teamStanding} from './standings'
import {team} from './team'

// F1 data imported from F1DB, then the app's own content: the question bank and finished races
export const schemaTypes = [driver, team, circuit, race, raceResult, driverStanding, teamStanding, quizQuestion, quizRun]
