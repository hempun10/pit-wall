import {isTeam, teamColor} from '@/lib/f1'
import type {Result} from '@/lib/sanity'
import {CarIcon, HelmetIcon} from './icons'

// Drivers get a helmet and teams a car, both in team colours; numbers stay plain
export function OptionArt({value, rows}: {value: string; rows: Result[]}) {
  const driver = rows.find((r) => r.driver.name === value)
  if (driver) return <HelmetIcon color={teamColor(driver.team)} />
  if (isTeam(value)) return <CarIcon color={teamColor(value)} />
  return null
}
