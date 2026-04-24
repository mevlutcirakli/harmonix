declare global {
  interface Window {
    YT: { Player: new (id: string, opts: object) => YTPlayerInstance; PlayerState: Record<string, number> }
    onYouTubeIframeAPIReady: () => void
  }
}

export interface YTPlayerInstance {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (v: number) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
}

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

export interface MusicStateRow {
  room_id: string
  host_username: string | null
  is_playing: boolean
  current_video_id: string | null
  started_at: string | null
}
