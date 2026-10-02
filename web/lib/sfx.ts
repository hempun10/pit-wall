// Every sound is synthesised with the Web Audio API: no audio files, nothing copyrighted.
const MUTE_KEY = 'pitwall.muted'
let ctx: AudioContext | null = null

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {}
}

// Browsers only allow audio after a click or key press, so call this from one
export function unlockAudio() {
  if (isMuted()) return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  for (const [name, file] of Object.entries(SAMPLES)) {
    if (loaded.has(name)) continue
    const audio = new Audio(`/sfx/${file}`)
    audio.preload = 'auto'
    loaded.set(name, audio)
  }
}

function audio() {
  if (isMuted() || !ctx) return null
  return ctx
}

type ToneOptions = {type?: OscillatorType; gain?: number; to?: number; attack?: number}
function tone(freq: number, at: number, dur: number, {type = 'sine', gain = 0.15, to, attack = 0.01}: ToneOptions = {}) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const env = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

type NoiseOptions = {gain?: number; filter?: BiquadFilterType; from?: number; to?: number; attack?: number; q?: number}
function noise(at: number, dur: number, {gain = 0.1, filter = 'bandpass', from = 1000, to = from, attack = 0.02, q = 1}: NoiseOptions = {}) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buffer
  const f = c.createBiquadFilter()
  f.type = filter
  f.Q.value = q
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(env).connect(c.destination)
  src.start(t)
}

// Real recordings for the big moments (licences and credits in public/sfx/README.md); the short
// UI sounds stay synthesised. Add your own as public/sfx/<file>.mp3 and map it here.
const SAMPLES: Record<string, string> = {
  'lights-out': 'cc-lights-out.mp3', // F1 car flyby, Geoff-Bremner-Audio, CC BY 4.0
  crowd: 'cc-crowd.mp3', // CC0
  champagne: 'cc-champagne.mp3', // CC0
}
const loaded = new Map<string, HTMLAudioElement>()

function play(name: string, synth: () => void) {
  if (isMuted()) return
  const file = SAMPLES[name]
  if (!file) return synth()
  // Clone the preloaded element so overlapping plays don't cut each other off
  const audio = (loaded.get(name)?.cloneNode() as HTMLAudioElement | undefined) ?? new Audio(`/sfx/${file}`)
  audio.volume = 0.8
  audio.play().catch(synth)
}

export const sfx = {
  // Menu sounds, like a console game's UI: quiet and short so fast clicking stays pleasant
  nav: (dir: 1 | -1) => {
    tone(dir > 0 ? 1320 : 990, 0, 0.05, {type: 'triangle', gain: 0.05})
    noise(0, 0.03, {gain: 0.02, filter: 'highpass', from: 4000})
  },
  // Tyre pick, pitched by compound: soft high, hard low
  select: (compound: number) => {
    const f = [1175, 880, 659][compound] ?? 880
    tone(f, 0, 0.06, {type: 'square', gain: 0.03})
    tone(f * 1.5, 0.045, 0.08, {type: 'triangle', gain: 0.04})
  },
  key: () => tone(1600, 0, 0.025, {type: 'square', gain: 0.025}),
  open: () => noise(0, 0.18, {gain: 0.035, from: 600, to: 3200}),
  back: () => noise(0, 0.18, {gain: 0.035, from: 3200, to: 600}),
  confirm: () => {
    tone(110, 0, 0.2, {gain: 0.18, to: 65})
    tone(880, 0, 0.08, {type: 'triangle', gain: 0.05})
  },
  // One beep per start light
  light: () => play('light', () => tone(880, 0, 0.16, {type: 'square', gain: 0.06})),
  // Lights out: engines rise and the field launches
  lightsOut: () =>
    play('lights-out', () => {
      tone(70, 0, 1.4, {type: 'sawtooth', gain: 0.07, to: 340})
      tone(105, 0.05, 1.3, {type: 'sawtooth', gain: 0.04, to: 520})
      noise(0, 1.2, {gain: 0.06, from: 400, to: 3000})
    }),
  // The broadcast's two-note team radio sting
  // A soft click when a new question or an engineer's reply arrives
  radio: () =>
    play('radio', () => {
      noise(0, 0.025, {gain: 0.02, from: 2400, q: 2})
      tone(1100, 0, 0.05, {gain: 0.025, attack: 0.004})
    }),
  // Gentle sine tones rather than a game-show sting: soft rise for correct, soft fall for wrong
  correct: () =>
    play('correct', () => {
      tone(660, 0, 0.32, {gain: 0.05, attack: 0.02})
      tone(990, 0.09, 0.42, {gain: 0.045, attack: 0.02})
    }),
  // Purple sector (3+ in a row): the correct tones plus a quiet high shimmer
  purple: () => {
    sfx.correct()
    tone(1320, 0.18, 0.5, {gain: 0.03, attack: 0.03})
  },
  wrong: () => play('wrong', () => tone(330, 0, 0.38, {gain: 0.05, to: 247, attack: 0.02})),
  // Chequered flag: the grandstands roar
  crowd: () =>
    play('crowd', () => {
      noise(0, 2.8, {gain: 0.09, from: 900, to: 700, attack: 0.5, q: 0.7})
      noise(0.15, 2.4, {gain: 0.05, filter: 'highpass', from: 2500, attack: 0.4})
    }),
  // Champagne: cork pop, then fizz
  champagne: () =>
    play('champagne', () => {
      tone(500, 0, 0.07, {type: 'square', gain: 0.12, to: 90})
      noise(0.05, 1.6, {gain: 0.04, filter: 'highpass', from: 5000, attack: 0.05})
    }),
}
