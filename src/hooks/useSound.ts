import { useRef, useEffect } from 'react'

export function useSound(enabled = true) {
  const ctxRef = useRef<AudioContext | null>(null)

  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3, delay = 0) {
    if (!enabled) return
    try {
      const ac = ctx()
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.connect(g)
      g.connect(ac.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay)
      g.gain.setValueAtTime(gain, ac.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration)
      osc.start(ac.currentTime + delay)
      osc.stop(ac.currentTime + delay + duration)
    } catch { /* ignore */ }
  }

  const playCorrect = () => {
    playTone(523, 0.12, 'sine', 0.3)      // C5
    playTone(659, 0.12, 'sine', 0.3, 0.1) // E5
    playTone(784, 0.25, 'sine', 0.3, 0.2) // G5
  }

  const playWrong = () => {
    playTone(300, 0.12, 'sawtooth', 0.2)
    playTone(220, 0.25, 'sawtooth', 0.2, 0.13)
  }

  const playTick = () => {
    playTone(1000, 0.05, 'square', 0.15)
  }

  const playCountdownBeep = () => {
    playTone(880, 0.08, 'sine', 0.2)
  }

  const playStart = () => {
    [0, 0.1, 0.2, 0.35].forEach((delay, i) => {
      const notes = [392, 440, 523, 659]
      playTone(notes[i], 0.18, 'sine', 0.25, delay)
    })
  }

  const playEnd = () => {
    [0, 0.15, 0.3, 0.45, 0.65].forEach((delay, i) => {
      const notes = [523, 659, 784, 880, 1047]
      playTone(notes[i], 0.25, 'sine', 0.25, delay)
    })
  }

  useEffect(() => () => { ctxRef.current?.close() }, [])

  return { playCorrect, playWrong, playTick, playCountdownBeep, playStart, playEnd }
}
