export const ROOMS = [
  { id: 'genel', name: 'Genel' },
  { id: 'muzik', name: 'Müzik' },
  { id: 'oyun', name: 'Oyun' },
]

const USER_COLORS = ['#3ecf8e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

export function getUserColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// Single compiled regex — module-level, created once
export const VIDEO_ID_RE = /(?:[?&]v=|youtu\.be\/|embed\/|shorts\/)([^?&]+)/

export const extractVideoId = (url: string): string | null => url.match(VIDEO_ID_RE)?.[1] ?? null

// Intl object created once, not recreated on every call
export const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

export const formatTime = (ts: string): string => timeFormatter.format(new Date(ts))
