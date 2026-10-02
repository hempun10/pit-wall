'use client'

import {useState} from 'react'
import {useDriverCode} from '@/hooks/use-driver-code'
import {TYRES, type Tyre} from '@/lib/f1'
import type {Race, Result} from '@/lib/sanity'
import {sfx, unlockAudio} from '@/lib/sfx'
import {RaceScreen} from '@/components/race/race-screen'
import {Intro} from '@/components/screens/intro'
import {Menu} from '@/components/screens/menu'
import {Onboarding} from '@/components/screens/onboarding'
import {Standings} from '@/components/screens/standings'

type Screen = 'menu' | 'race' | 'standings' | 'code'

// Decides which screen is showing and owns the choices that span screens (race, tyre, attempt).
// Flow: intro → driver code (first visit) → menu ⇄ race / standings / change code.
export default function PitWall({races, results}: {races: Race[]; results: Result[]}) {
  const completed = races.filter((r) => r.completed)
  const [round, setRound] = useState(completed.at(-1)!.round)
  const [tyre, setTyre] = useState<Tyre>('soft')
  const [screen, setScreen] = useState<Screen>('menu')
  const [attempt, setAttempt] = useState(0) // a new key restarts the race from scratch
  const [entered, setEntered] = useState(false) // the intro shows on every visit
  const code = useDriverCode()

  const index = completed.findIndex((r) => r.round === round)
  const race = completed[index]

  // Each action plays its menu sound; any click or key press also unlocks browser audio
  function go(next: Screen) {
    unlockAudio()
    sfx.open()
    setScreen(next)
  }
  function back() {
    sfx.back()
    setScreen('menu')
  }
  function startRace() {
    unlockAudio()
    sfx.confirm()
    setAttempt((a) => a + 1)
    setScreen('race')
  }
  function stepRound(dir: 1 | -1) {
    const next = completed[index + dir]
    if (!next) return
    unlockAudio()
    sfx.nav(dir)
    setRound(next.round)
  }
  function pickTyre(next: Tyre) {
    if (next === tyre) return
    unlockAudio()
    sfx.select(TYRES.findIndex((t) => t.id === next))
    setTyre(next)
  }

  if (code === undefined) return null // still reading the saved code

  if (!entered) {
    return (
      <Intro
        onEnter={() => {
          unlockAudio()
          sfx.confirm()
          setEntered(true)
        }}
      />
    )
  }

  if (code === null || screen === 'code') {
    return (
      <Onboarding
        current={code ?? ''}
        onBack={back}
        onSaved={() => {
          sfx.confirm()
          setScreen('menu')
        }}
      />
    )
  }

  if (screen === 'standings') return <Standings onBack={back} />

  if (screen === 'race') {
    return (
      <RaceScreen
        key={`${round}-${tyre}-${attempt}`}
        race={race}
        tyre={tyre}
        rows={results.filter((r) => r.round === round)}
        onMenu={back}
        onStandings={() => go('standings')}
        onRestart={() => {
          sfx.confirm()
          setAttempt((a) => a + 1)
        }}
      />
    )
  }

  return (
    <Menu
      race={race}
      isFirst={index === 0}
      isLatest={index === completed.length - 1}
      tyre={tyre}
      code={code}
      onStep={stepRound}
      onPickTyre={pickTyre}
      onStart={startRace}
      onStandings={() => go('standings')}
      onChangeCode={() => go('code')}
    />
  )
}
