'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { QueueItem, MusicStateRow, YTPlayerInstance } from '../types'
import { extractVideoId } from '../constants'

export function useMusic(voiceRoom: string, username: string, isInVoice: boolean) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const queueRef = useRef<QueueItem[]>([])
  const [isHost, setIsHost] = useState(false)
  const isHostRef = useRef(false)
  const [hostUsername, setHostUsername] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [queueInput, setQueueInput] = useState('')
  const [ytReady, setYtReady] = useState(() =>
    typeof window !== 'undefined' && !!(window.YT && window.YT.Player)
  )
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const startedAtRef = useRef<string | null>(null)
  const initialIsPlayingRef = useRef(true)

  const currentSong = queue[0] ?? null
  const currentVideoId = currentSong?.video_id ?? null

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue
    if (queue[0]?.started_at) startedAtRef.current = queue[0].started_at
  }, [queue])

  const refetchQueue = useCallback(() => {
    if (!voiceRoom) return
    supabase.from('queue').select('*')
      .eq('room_id', voiceRoom)
      .order('added_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error(error.message); return }
        if (data) setQueue(data as QueueItem[])
      })
  }, [voiceRoom])

  // Queue subscription
  useEffect(() => {
    if (!username || !voiceRoom) return
    refetchQueue()

    const queueChannel = supabase.channel(`queue-${voiceRoom}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, (payload) => {
        refetchQueue()
        type Row = { started_at?: string | null; video_id?: string }
        const newRow = payload.new as Row
        const oldRow = payload.old as Row
        if (
          payload.eventType === 'UPDATE' &&
          newRow.started_at && !oldRow.started_at &&
          playerRef.current && newRow.video_id === queueRef.current[0]?.video_id
        ) {
          const elapsed = Math.max(0, Math.floor(
            (Date.now() - new Date(newRow.started_at).getTime()) / 1000
          ))
          playerRef.current.seekTo(elapsed, true)
          startedAtRef.current = newRow.started_at
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(queueChannel) }
  }, [voiceRoom, username, refetchQueue])

  // music_state subscription
  useEffect(() => {
    if (!voiceRoom || !username) return

    const stateChannel = supabase.channel(`music-state-${voiceRoom}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'music_state',
        filter: `room_id=eq.${voiceRoom}`,
      }, (payload) => {
        const newState = payload.new as Partial<MusicStateRow>

        const amHost = newState.host_username === username
        if (amHost !== isHostRef.current) {
          setIsHost(amHost)
          isHostRef.current = amHost
        }
        if (newState.host_username !== undefined) {
          setHostUsername(newState.host_username || '')
        }

        if (!isHostRef.current && playerRef.current) {
          if (newState.is_playing === true) {
            playerRef.current.playVideo()
            setIsPlaying(true)
          } else if (newState.is_playing === false) {
            playerRef.current.pauseVideo()
            setIsPlaying(false)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(stateChannel) }
  }, [voiceRoom, username])

  // YouTube IFrame API setup
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) return
    window.onYouTubeIframeAPIReady = () => setYtReady(true)
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  }, [])

  // Player lifecycle
  useEffect(() => {
    if (!ytReady || !isInVoice) return

    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
      setIsPlaying(false)
    }
    const container = document.getElementById('yt-player-container')
    if (container) container.innerHTML = '<div id="yt-player"></div>'

    if (!currentVideoId) return

    const capturedId = queueRef.current[0]?.id
    const capturedStartedAt = startedAtRef.current
    const capturedIsHost = isHostRef.current
    const capturedInitialIsPlaying = initialIsPlayingRef.current

    const elapsed = capturedStartedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(capturedStartedAt).getTime()) / 1000))
      : 0

    const p = new window.YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: currentVideoId,
      playerVars: { autoplay: 1, controls: 0, start: elapsed },
      events: {
        onReady: (e: { target: YTPlayerInstance }) => {
          e.target.setVolume(volume)
          if (!capturedStartedAt && capturedId && capturedIsHost) {
            supabase.from('queue')
              .update({ started_at: new Date().toISOString() })
              .eq('id', capturedId)
              .is('started_at', null)
              .then()
          }
          e.target.playVideo()
          if (!capturedIsHost && !capturedInitialIsPlaying) {
            setTimeout(() => { try { e.target.pauseVideo() } catch {} }, 300)
            setIsPlaying(false)
          } else {
            setIsPlaying(true)
          }
        },
        onStateChange: (e: { target: YTPlayerInstance; data: number }) => {
          if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true)
          if (e.data === window.YT.PlayerState.PAUSED) setIsPlaying(false)
          if (e.data === window.YT.PlayerState.ENDED) {
            const [first, ...rest] = queueRef.current
            if (first) {
              supabase.from('queue').delete().eq('id', first.id).then(() => {
                const nextStartedAt = new Date().toISOString()
                if (rest[0]) {
                  supabase.from('queue')
                    .update({ started_at: nextStartedAt })
                    .eq('id', rest[0].id)
                    .is('started_at', null)
                    .then()
                }
                supabase.from('music_state').upsert({
                  room_id: voiceRoom,
                  current_video_id: rest[0]?.video_id ?? null,
                  started_at: rest[0] ? nextStartedAt : null,
                  is_playing: !!rest[0],
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'room_id' }).then()
              })
            }
          }
        },
      },
    })
    playerRef.current = p

    return () => {
      try { p.destroy() } catch {}
      const c = document.getElementById('yt-player-container')
      if (c) c.innerHTML = '<div id="yt-player"></div>'
      if (playerRef.current === p) playerRef.current = null
    }
  }, [ytReady, currentVideoId, isInVoice]) // eslint-disable-line

  const addToQueue = async () => {
    if (!voiceRoom) return
    const url = queueInput.trim()
    if (!url) return
    const videoId = extractVideoId(url)
    if (!videoId) { toast.error('Geçersiz YouTube linki'); return }
    let title: string
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      if (!res.ok) { toast.error('Video bulunamadı veya erişilemiyor.'); return }
      const data = await res.json()
      title = data.title
    } catch {
      toast.error('Video bilgisi alınamadı. Bağlantınızı kontrol edin.')
      return
    }
    const isFirstSong = queueRef.current.length === 0
    const firstStartedAt = isFirstSong ? new Date().toISOString() : undefined

    const { error } = await supabase.from('queue').insert({
      room_id: voiceRoom, video_id: videoId, title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      added_by: username,
      ...(firstStartedAt ? { started_at: firstStartedAt } : {}),
    })
    if (error) { toast.error('Kuyruğa eklenemedi: ' + error.message); return }

    if (isFirstSong && firstStartedAt) {
      startedAtRef.current = firstStartedAt
      await supabase.from('music_state').upsert({
        room_id: voiceRoom,
        current_video_id: videoId,
        started_at: firstStartedAt,
        is_playing: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' })
    }

    setQueueInput('')
    refetchQueue()
  }

  const removeFromQueue = async (id: string) => {
    const { error } = await supabase.from('queue').delete().eq('id', id)
    if (error) toast.error('Silinemedi: ' + error.message)
    else refetchQueue()
  }

  const handleNext = async () => {
    if (!isHostRef.current) return
    const [first, ...rest] = queueRef.current
    if (!first) return
    try {
      await supabase.from('queue').delete().eq('id', first.id)
      const nextStartedAt = new Date().toISOString()
      await Promise.all([
        rest[0] && supabase.from('queue')
          .update({ started_at: nextStartedAt })
          .eq('id', rest[0].id)
          .is('started_at', null),
        voiceRoom && supabase.from('music_state').upsert({
          room_id: voiceRoom,
          current_video_id: rest[0]?.video_id ?? null,
          started_at: rest[0] ? nextStartedAt : null,
          is_playing: !!rest[0],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' }),
      ].filter(Boolean))
    } catch (error) {
      console.error('Sonraki şarkıya geçilemiyor:', error)
      toast.error('Sonraki şarkıya geçilemiyor')
    }
  }

  const togglePlay = async () => {
    if (!isHostRef.current || !playerRef.current) return
    try {
      const newPlaying = !isPlaying
      if (newPlaying) { playerRef.current.playVideo() } else { playerRef.current.pauseVideo() }
      if (voiceRoom) {
        await supabase.from('music_state').upsert({
          room_id: voiceRoom,
          is_playing: newPlaying,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' })
      }
    } catch (error) {
      console.error('Oynatma durumu değiştirilemedi:', error)
      toast.error('Oynatma durumu değiştirilemedi')
    }
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (playerRef.current) playerRef.current.setVolume(v)
  }

  const initFromJoin = (
    queueData: QueueItem[],
    musicState: MusicStateRow | null,
    becomeHost: boolean,
    joinUsername: string
  ) => {
    setQueue(queueData)
    queueRef.current = queueData
    const queueStartedAt = queueData[0]?.started_at ?? null
    startedAtRef.current = queueStartedAt ?? musicState?.started_at ?? null

    if (becomeHost) {
      initialIsPlayingRef.current = true
      setHostUsername(joinUsername)
    } else {
      initialIsPlayingRef.current = musicState?.is_playing ?? true
      setHostUsername(musicState?.host_username || '')
    }

    isHostRef.current = becomeHost
    setIsHost(becomeHost)
  }

  const resetOnLeave = () => {
    setIsHost(false)
    isHostRef.current = false
    setHostUsername('')
    setQueue([])
    queueRef.current = []
    startedAtRef.current = null
    setIsPlaying(false)
    setQueueInput('')
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }
    const c = document.getElementById('yt-player-container')
    if (c) c.innerHTML = '<div id="yt-player"></div>'
  }

  return {
    queue,
    isHost,
    isHostRef,
    hostUsername,
    isPlaying,
    volume,
    queueInput,
    setQueueInput,
    ytReady,
    playerRef,
    currentSong,
    addToQueue,
    removeFromQueue,
    handleNext,
    togglePlay,
    handleVolumeChange,
    initFromJoin,
    resetOnLeave,
  }
}
