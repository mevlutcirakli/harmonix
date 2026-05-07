export { TEXT_ROOMS, VOICE_ROOMS, ALL_ROOMS, getUserColor, MUSIC_BOT_NAME } from '@/lib/rooms'

export const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })
export const formatTime = (ts: string): string => timeFormatter.format(new Date(ts))

export function extractYoutubeId(input: string): string | null {
  const patterns = [
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}
