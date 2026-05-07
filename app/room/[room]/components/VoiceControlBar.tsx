'use client'

import { useEffect } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { IconMic, IconMicOff, IconPhoneOff } from '../icons'

interface VoiceControlBarProps {
  voiceRoom: string
  micMuted: boolean
  onMicMutedChange: (muted: boolean) => void
  onLeave: () => void
}

export default function VoiceControlBar({ voiceRoom, micMuted, onMicMutedChange, onLeave }: VoiceControlBarProps) {
  const { localParticipant } = useLocalParticipant()

  useEffect(() => {
    if (!localParticipant) return
    localParticipant.setMicrophoneEnabled(true)
  }, [localParticipant])

  const toggleMic = async () => {
    if (!localParticipant) return
    const next = !micMuted
    await localParticipant.setMicrophoneEnabled(!next)
    onMicMutedChange(next)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: 75,
      right: 300,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 50,
        padding: '8px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          # {voiceRoom}
        </span>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        <button
          onClick={toggleMic}
          title={micMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: micMuted ? 'rgba(239,68,68,0.15)' : 'var(--elevated)',
            color: micMuted ? 'var(--red)' : 'var(--accent)',
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = micMuted ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = micMuted ? 'rgba(239,68,68,0.15)' : 'var(--elevated)' }}
        >
          {micMuted ? <IconMicOff size={16} /> : <IconMic size={16} />}
        </button>

        <button
          onClick={onLeave}
          title="Kanaldan Ayrıl"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.12)',
            color: 'var(--red)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
        >
          <IconPhoneOff size={16} />
        </button>
      </div>
    </div>
  )
}
