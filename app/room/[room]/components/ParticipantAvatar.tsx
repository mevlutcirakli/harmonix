'use client'

import { getUserColor } from '../constants'

interface ParticipantAvatarProps {
  username: string
  size: number
  speaking: boolean
}

export default function ParticipantAvatar({ username, size, speaking }: ParticipantAvatarProps) {
  return (
    <div
      title={username}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getUserColor(username),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        border: speaking ? '2px solid var(--accent)' : '2px solid transparent',
        animation: speaking ? 'speaking-pulse 1.5s ease-in-out infinite' : 'none',
        transition: 'border-color 200ms ease',
        userSelect: 'none',
      }}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  )
}
