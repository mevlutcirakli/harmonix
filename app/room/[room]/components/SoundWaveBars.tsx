'use client'

const WAVE_DELAYS_DEFAULT = [0, 0.15, 0.3] as const

interface SoundWaveBarsProps {
  delays?: readonly number[]
  duration?: string
}

export default function SoundWaveBars({ delays = WAVE_DELAYS_DEFAULT, duration = '0.5s' }: SoundWaveBarsProps) {
  return (
    <div className="sound-wave">
      {delays.map((d, i) => (
        <div key={i} className="sound-wave-bar" style={{ animationDelay: `${d}s`, animationDuration: duration }} />
      ))}
    </div>
  )
}
