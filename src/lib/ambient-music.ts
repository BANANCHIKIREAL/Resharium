let context: AudioContext | null = null
let master: GainNode | null = null
let timer = 0
let chordIndex = 0

const chords = [
  [130.81, 164.81, 196],
  [110, 146.83, 164.81],
  [98, 130.81, 164.81],
  [116.54, 146.83, 196],
]

function playChord() {
  if (!context || !master) return
  const now = context.currentTime
  const chord = chords[chordIndex++ % chords.length]
  chord.forEach((frequency, index) => {
    const oscillator = context!.createOscillator()
    const gain = context!.createGain()
    oscillator.type = index === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    oscillator.detune.value = index === 1 ? -4 : index === 2 ? 5 : 0
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.11 : 0.045, now + 2.2)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 8)
    oscillator.connect(gain).connect(master!)
    oscillator.start(now)
    oscillator.stop(now + 8.1)
  })
  timer = window.setTimeout(playChord, 6200)
}

export async function startAmbientMusic(volume: number) {
  if (!context) {
    context = new AudioContext()
    master = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 720
    master.connect(filter).connect(context.destination)
    master.gain.value = Math.max(0, Math.min(1, volume))
    playChord()
  }
  if (context.state === 'suspended') await context.resume()
  setAmbientVolume(volume)
}

export function setAmbientVolume(volume: number) {
  if (!context || !master) return
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), context.currentTime, 0.15)
}

export function stopAmbientMusic() {
  if (timer) window.clearTimeout(timer)
  timer = 0
  const active = context
  context = null
  master = null
  if (active) void active.close()
}
