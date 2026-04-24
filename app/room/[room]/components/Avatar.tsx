'use client'

import { getUserColor } from '../constants'

interface AvatarProps {
  username: string
  size?: 'xs' | 'sm' | 'md'
  speaking?: boolean
}

export default function Avatar({ username, size = 'md', speaking = false }: AvatarProps) {
  return (
    <div
      suppressHydrationWarning
      className={`avatar avatar-${size}${speaking ? ' avatar--speaking' : ''}`}
      style={{ backgroundColor: getUserColor(username) }}
    >
      {username[0]?.toUpperCase()}
    </div>
  )
}
