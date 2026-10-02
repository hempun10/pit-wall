import {useState} from 'react'
import {isMuted, setMuted, sfx, unlockAudio} from '@/lib/sfx'
import {SpeakerIcon} from './icons'

export function SoundToggle() {
  const [muted, setMutedState] = useState(() => isMuted())

  function toggle() {
    if (muted) {
      setMuted(false)
      unlockAudio()
      sfx.select(0)
    } else {
      sfx.back() // play the off sound before going quiet
      setMuted(true)
    }
    setMutedState(!muted)
  }

  return (
    <button className="icon-btn" aria-label={muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={muted} onClick={toggle}>
      <SpeakerIcon muted={muted} />
    </button>
  )
}
