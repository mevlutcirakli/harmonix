function playFile(src: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src)
      audio.volume = 0.6
      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      audio.play().catch(() => resolve())
    } catch {
      resolve()
    }
  })
}

async function playTone(freqs: [number, number], ascending: boolean) {
  try {
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    const now = ctx.currentTime
    const [f1, f2] = ascending ? freqs : ([freqs[1], freqs[0]] as [number, number])

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(f1, now)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc1.start(now)
    osc1.stop(now + 0.18)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(f2, now + 0.14)
    gain2.gain.setValueAtTime(0.3, now + 0.14)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.start(now + 0.14)
    osc2.stop(now + 0.45)

    setTimeout(() => ctx.close(), 600)
  } catch {}
}

export async function playJoinSound() {
  try {
    const res = await fetch('/sounds/join.mp3', { method: 'HEAD' })
    if (res.ok) { await playFile('/sounds/join.mp3'); return }
  } catch {}
  await playTone([523.25, 659.25], true)
}

export async function playLeaveSound() {
  try {
    const res = await fetch('/sounds/leave.mp3', { method: 'HEAD' })
    if (res.ok) { await playFile('/sounds/leave.mp3'); return }
  } catch {}
  await playTone([523.25, 659.25], false)
}
