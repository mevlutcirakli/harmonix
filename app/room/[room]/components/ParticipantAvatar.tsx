'use client'

import { getAvatarUrl } from '@/lib/avatar'

interface ParticipantAvatarProps {
  username: string
  size: number
  speaking: boolean
  muted?: boolean
}

export default function ParticipantAvatar({ username, size, speaking, muted }: ParticipantAvatarProps) {
  const badgeSize = Math.max(12, Math.round(size * 0.32))

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        title={username}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: speaking ? '2px solid var(--accent)' : '2px solid transparent',
          animation: speaking ? 'speaking-pulse 1.5s ease-in-out infinite' : 'none',
          transition: 'border-color 200ms ease',
          userSelect: 'none',
          background: 'var(--surface)',
        }}
      >
        <img
          src={getAvatarUrl(username)}
          alt={username}
          width={size}
          height={size}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      {muted && (
        <div style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          background: '#ef4444',
          border: '1.5px solid var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg
            width={Math.round(badgeSize * 0.6)}
            height={Math.round(badgeSize * 0.6)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
            <path d="M5 10v2a7 7 0 0 0 12 4.9" />
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          </svg>
        </div>
      )}
    </div>
  )
}
