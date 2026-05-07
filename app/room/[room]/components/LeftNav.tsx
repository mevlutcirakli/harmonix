'use client'

import { useState } from 'react'
import { VOICE_ROOMS, getUserColor } from '../constants'
import { IconSpeaker, IconLogOut } from '../icons'
import type { Participant } from '../types'

interface LeftNavProps {
  voiceRoom: string
  isInVoice: boolean
  channelParticipants: Record<string, Participant[]>
  username: string
  onJoinVoice: (roomId: string) => void
  onLeaveVoice: () => void
  onLogout: () => void
}

export default function LeftNav({
  voiceRoom, isInVoice, channelParticipants, username, onJoinVoice, onLeaveVoice, onLogout
}: LeftNavProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const avatarBg = getUserColor(username)
  const initial = username.charAt(0).toUpperCase()

  return (
    <div style={{
      width: 75,
      flexShrink: 0,
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 12,
    }}>
      {/* Logo */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 900, color: '#080808',
        marginBottom: 16, flexShrink: 0, userSelect: 'none',
      }}>
        H
      </div>

      <div style={{ width: 32, height: 1, background: 'var(--border)', marginBottom: 12, flexShrink: 0 }} />

      {/* Voice channel buttons */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {VOICE_ROOMS.map(r => {
          const isActive = isInVoice && voiceRoom === r.id
          const count = (channelParticipants[r.id] ?? []).length

          return (
            <div key={r.id} style={{ position: 'relative' }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 22, borderRadius: '0 3px 3px 0',
                  background: 'var(--accent)',
                }} />
              )}
              <button
                onClick={() => isActive ? onLeaveVoice() : onJoinVoice(r.id)}
                onMouseEnter={() => setHoveredRoom(r.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                style={{
                  width: 44, height: 44,
                  borderRadius: isActive ? 14 : '50%',
                  background: isActive ? 'rgba(62,207,142,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid rgba(62,207,142,0.35)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'border-radius 200ms, background 200ms, color 200ms, border-color 200ms',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseOver={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderRadius = '14px'
                    e.currentTarget.style.background = 'rgba(62,207,142,0.08)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }
                }}
                onMouseOut={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderRadius = '50%'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'var(--text-2)'
                  }
                }}
              >
                <IconSpeaker size={18} />
                {count > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: 'var(--accent)', color: '#080808',
                    fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '2px solid var(--surface)',
                  }}>
                    {count}
                  </span>
                )}
              </button>

              {/* Tooltip */}
              {hoveredRoom === r.id && (
                <div style={{
                  position: 'absolute', left: 'calc(100% + 14px)', top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#1a1a1a',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 10px',
                  fontSize: 12, fontWeight: 600, color: 'var(--text-1)',
                  whiteSpace: 'nowrap', zIndex: 200,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                }}>
                  {r.name}
                  <div style={{
                    position: 'absolute', right: '100%', top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '6px solid #1a1a1a',
                    marginRight: 0,
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* User avatar + logout */}
      <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div
          title={username}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', userSelect: 'none',
          }}
        >
          {initial}
        </div>
        <button
          onClick={onLogout}
          title="Çıkış yap"
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)', transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--red)'
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-3)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <IconLogOut size={14} />
        </button>
      </div>
    </div>
  )
}
