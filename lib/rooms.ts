export const TEXT_ROOMS = [
  { id: 'genel', name: 'Genel' },
]

export const VOICE_ROOMS = [
  { id: 'genel', name: 'Genel' },
  { id: 'oyun', name: 'Oyun' },
]

export const ALL_ROOMS = [
  ...TEXT_ROOMS,
  ...VOICE_ROOMS.filter(r => !TEXT_ROOMS.find(t => t.id === r.id)),
]

export const MUSIC_BOT_NAME = 'harmonix-bot'

const USER_COLORS = ['#3ecf8e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

export function getUserColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}
