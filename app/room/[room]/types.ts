export interface Message {
  id: string
  username: string
  content: string
  created_at: string
}

export interface QueueItem {
  id: string
  room_id: string
  video_id: string
  title: string
  thumbnail: string
  added_by: string
  added_at: string
  started_at: string | null
}

export interface MusicBroadcast {
  type: 'pause' | 'resume' | 'skip'
  paused_at?: number
  seek_to?: number
}

export interface Participant {
  username: string
}
