'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { extractYoutubeId } from '../constants'
import type { QueueItem, MusicBroadcast } from '../types'

declare global {
  interface Window {
    YT: {
      Player: new (id: string, opts: YTPlayerOptions) => YTPlayerInstance
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

interface YTPlayerOptions {
  height?: string | number
  width?: string | number
  videoId?: string
  playerVars?: Record<string, unknown>
  events?: {
    onReady?: () => void
    onStateChange?: (event: { data: number }) => void
  }
}

interface YTPlayerInstance {
  loadVideoById: (opts: { videoId: string; startSeconds: number }) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  destroy: () => void
}

export function useMusic(roomId: string, username: string, isInVoice: boolean) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [queueInput, setQueueInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [pausedAt, setPausedAt] = useState<number | null>(null)

  const playerRef = useRef<YTPlayerInstance | null>(null)
  const playerReadyRef = useRef(false)
  const p = () => playerReadyRef.current ? playerRef.current : null
  const syncedRef = useRef<string>('')
  const bcRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const currentSongRef = useRef<QueueItem | null>(null)
  const queueRef = useRef<QueueItem[]>([])
  const volumeRef = useRef(80)
  const isMutedRef = useRef(false)

  const currentSong = queue.find(q => q.started_at !== null) ?? null

  useEffect(() => { currentSongRef.current = currentSong }, [currentSong])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])

  // Queue realtime
  useEffect(() => {
    if (!isInVoice) { setQueue([]); return }

    const fetchQueue = () =>
      supabase.from('queue').select('*').eq('room_id', roomId)
        .order('added_at', { ascending: true })
        .then(({ data }) => { if (data) setQueue(data) })

    fetchQueue()

    const ch = supabase.channel(`queue-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue', filter: `room_id=eq.${roomId}` }, fetchQueue)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [roomId, isInVoice])

  // Broadcast channel: pause/resume/skip
  useEffect(() => {
    if (!isInVoice) { bcRef.current = null; return }

    const bc = supabase.channel(`music-bc-${roomId}`)
      .on('broadcast', { event: 'music' }, ({ payload }: { payload: MusicBroadcast }) => {
        if (payload.type === 'pause') {
          p()?.pauseVideo()
          setPausedAt(payload.paused_at ?? Date.now())
        }
        if (payload.type === 'resume') {
          if (payload.seek_to != null) p()?.seekTo(payload.seek_to, true)
          p()?.playVideo()
          setPausedAt(null)
        }
        if (payload.type === 'skip') {
          p()?.stopVideo()
          syncedRef.current = ''
          setPausedAt(null)
        }
      })
    bc.subscribe()
    bcRef.current = bc

    return () => {
      supabase.removeChannel(bc)
      bcRef.current = null
    }
  }, [roomId, isInVoice])

  // Song-end handler via ref to avoid stale closures
  const handleSongEndRef = useRef<(() => Promise<void>) | undefined>(undefined)
  handleSongEndRef.current = async () => {
    const cs = currentSongRef.current
    const q = queueRef.current
    if (!cs) return
    await supabase.from('queue').delete().eq('id', cs.id)
    const next = q.find(qi => qi.id !== cs.id && qi.started_at === null)
    if (next) {
      await supabase.from('queue')
        .update({ started_at: new Date().toISOString() })
        .eq('id', next.id)
    }
    syncedRef.current = ''
  }

  // YouTube IFrame API init — runs once
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initPlayer = () => {
      if (playerRef.current) return
      playerRef.current = new window.YT.Player('yt-player', {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: () => {
            playerReadyRef.current = true
            playerRef.current?.setVolume(isMutedRef.current ? 0 : volumeRef.current)
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) handleSongEndRef.current?.()
          },
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        initPlayer()
      }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }

    return () => {
      playerReadyRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  // Sync player to started_at position when current song changes
  useEffect(() => {
    if (!currentSong) {
      if (syncedRef.current) {
        p()?.stopVideo()
        syncedRef.current = ''
      }
      return
    }
    if (syncedRef.current === currentSong.id) return
    syncedRef.current = currentSong.id

    const seekSeconds = Math.max(
      0,
      (Date.now() - new Date(currentSong.started_at!).getTime()) / 1000
    )

    const load = (attempts = 0) => {
      const player = p()
      if (player) {
        player.loadVideoById({ videoId: currentSong.video_id, startSeconds: seekSeconds })
        player.setVolume(isMutedRef.current ? 0 : volumeRef.current)
      } else if (attempts < 20) {
        setTimeout(() => load(attempts + 1), 300)
      }
    }
    load()
  }, [currentSong?.id, currentSong?.started_at])

  const broadcastMusic = useCallback((payload: MusicBroadcast) => {
    bcRef.current?.send({ type: 'broadcast', event: 'music', payload })
  }, [])

  const addToQueue = async (input: string) => {
    if (!input.trim()) return
    setIsAdding(true)
    try {
      const videoId = extractYoutubeId(input.trim())
      if (!videoId) { toast.error('Geçerli bir YouTube linki gir'); return }

      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      )
      if (!res.ok) { toast.error('Video bulunamadı'); return }
      const oEmbed = await res.json()

      const hasPlaying = currentSongRef.current !== null
      const hasPending = queueRef.current.some(q => q.started_at === null)

      await supabase.from('queue').insert({
        room_id: roomId,
        video_id: videoId,
        title: oEmbed.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        added_by: username,
        started_at: (!hasPlaying && !hasPending) ? new Date().toISOString() : null,
      })
      setQueueInput('')
    } catch {
      toast.error('Şarkı eklenemedi')
    } finally {
      setIsAdding(false)
    }
  }

  const togglePlay = () => {
    if (!currentSong) return
    if (pausedAt !== null) {
      const seek = Math.max(0, (pausedAt - new Date(currentSong.started_at!).getTime()) / 1000)
      broadcastMusic({ type: 'resume', seek_to: seek })
    } else {
      broadcastMusic({ type: 'pause', paused_at: Date.now() })
    }
  }

  const skip = async () => {
    if (!currentSong) return
    broadcastMusic({ type: 'skip' })
    await supabase.from('queue').delete().eq('id', currentSong.id)
    const next = queue.find(q => q.id !== currentSong.id && q.started_at === null)
    if (next) {
      await supabase.from('queue')
        .update({ started_at: new Date().toISOString() })
        .eq('id', next.id)
    }
  }

  const removeFromQueue = async (id: string) => {
    await supabase.from('queue').delete().eq('id', id)
  }

  const clearQueue = async () => {
    if (currentSong) broadcastMusic({ type: 'skip' })
    await supabase.from('queue').delete().eq('room_id', roomId)
    syncedRef.current = ''
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (!isMuted) p()?.setVolume(v)
  }

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    p()?.setVolume(next ? 0 : volume)
  }

  const resetOnLeave = () => {
    p()?.stopVideo()
    syncedRef.current = ''
    setPausedAt(null)
    setQueue([])
  }

  return {
    queue,
    currentSong,
    volume,
    isMuted,
    pausedAt,
    queueInput,
    setQueueInput,
    isAdding,
    addToQueue,
    togglePlay,
    skip,
    removeFromQueue,
    clearQueue,
    handleVolumeChange,
    toggleMute,
    resetOnLeave,
  }
}
