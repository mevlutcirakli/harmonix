'use client'

import { VOICE_ROOMS } from '../constants'
import VoiceChannelCard from './VoiceChannelCard'
import type { QueueItem, Participant } from '../types'

interface VoiceChannelGridProps {
  voiceRoom: string
  isInVoice: boolean
  channelParticipants: Record<string, Participant[]>
  speaking: Set<string>
  username: string
  currentSong: QueueItem | null
  onJoinVoice: (roomId: string) => void
  onLeaveVoice: () => void
}

export default function VoiceChannelGrid({
  voiceRoom, isInVoice, channelParticipants, speaking, username, currentSong,
  onJoinVoice, onLeaveVoice,
}: VoiceChannelGridProps) {
  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      background: 'var(--bg)',
      padding: '32px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          Ses Kanalları
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Bir kanala katıl ve birlikte müzik dinle
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        alignContent: 'start',
      }}>
        {VOICE_ROOMS.map(r => (
          <VoiceChannelCard
            key={r.id}
            room={r}
            isActive={isInVoice && voiceRoom === r.id}
            participants={channelParticipants[r.id] ?? []}
            speaking={speaking}
            username={username}
            currentSong={isInVoice && voiceRoom === r.id ? currentSong : null}
            onJoin={() => onJoinVoice(r.id)}
            onLeave={onLeaveVoice}
          />
        ))}
      </div>
    </div>
  )
}
