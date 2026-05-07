'use client'

import { useState } from 'react'
import ParticipantAvatar from './ParticipantAvatar'
import { IconSpeaker, IconMusic } from '../icons'
import type { QueueItem, Participant } from '../types'


interface VoiceChannelCardProps {
  room: { id: string; name: string }
  isActive: boolean
  participants: Participant[]
  speaking: Set<string>
  username: string
  currentSong: QueueItem | null
  onJoin: () => void
  onLeave: () => void
}

export default function VoiceChannelCard({
  room, isActive, participants, speaking, username, currentSong, onJoin, onLeave
}: VoiceChannelCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(62,207,142,0.09) 0%, rgba(62,207,142,0.03) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: isActive ? '1px solid rgba(62,207,142,0.35)' : '1px solid var(--border)',
        borderRadius: 18,
        padding: '20px 20px 16px',
        display: 'flex', flexDirection: 'column', gap: 16,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isActive
          ? '0 0 40px rgba(62,207,142,0.07), 0 8px 32px rgba(0,0,0,0.35)'
          : hovered
            ? '0 8px 40px rgba(0,0,0,0.28)'
            : '0 4px 24px rgba(0,0,0,0.15)',
        transform: hovered && !isActive ? 'scale(1.025)' : 'scale(1)',
        transition: 'border-color 300ms, box-shadow 250ms, background 300ms, transform 200ms ease',
        cursor: isActive ? 'default' : 'pointer',
      }}
    >

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: isActive ? 'rgba(62,207,142,0.15)' : 'rgba(255,255,255,0.06)',
          border: isActive ? '1px solid rgba(62,207,142,0.3)' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isActive ? 'var(--accent)' : 'var(--text-3)',
          flexShrink: 0,
          transition: 'background 300ms, border-color 300ms, color 300ms',
        }}>
          <IconSpeaker size={16} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{room.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
            {participants.length === 0 ? 'Boş' : `${participants.length} katılımcı`}
          </div>
        </div>

        {isActive && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent)',
            animation: 'speaking-pulse 2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Participants */}
      <div style={{ minHeight: 60 }}>
        {participants.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Katılımcı yok
          </span>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(52px, 1fr))`,
            gap: 8,
          }}>
            {participants.map(p => (
              <div key={p.username} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <ParticipantAvatar
                  username={p.username}
                  size={48}
                  speaking={speaking.has(p.username)}
                />
                <span style={{
                  fontSize: 9, fontWeight: 500,
                  color: p.username === username ? 'var(--accent)' : 'var(--text-3)',
                  width: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', textAlign: 'center',
                }}>
                  {p.username === username ? 'sen' : p.username}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Now playing */}
      {isActive && currentSong && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(62,207,142,0.06)',
          border: '1px solid rgba(62,207,142,0.15)',
          borderRadius: 10, padding: '7px 10px',
        }}>
          {currentSong.thumbnail && (
            <img src={currentSong.thumbnail} alt={currentSong.title}
              style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex' }}>
            <IconMusic size={11} />
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentSong.title}
          </span>
        </div>
      )}

      {/* Join / Leave */}
      <button
        onClick={isActive ? onLeave : onJoin}
        style={{
          height: 38, borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          border: isActive ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(62,207,142,0.5)',
          color: isActive ? 'var(--red)' : 'var(--accent)',
          background: isActive ? 'rgba(239,68,68,0.06)' : 'rgba(62,207,142,0.06)',
          cursor: 'pointer',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isActive ? 'rgba(239,68,68,0.15)' : 'rgba(62,207,142,0.15)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isActive ? 'rgba(239,68,68,0.06)' : 'rgba(62,207,142,0.06)'
        }}
      >
        {isActive ? 'Ayrıl' : 'Katıl'}
      </button>
    </div>
  )
}
