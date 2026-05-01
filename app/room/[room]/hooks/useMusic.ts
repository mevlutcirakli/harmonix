'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { QueueItem, MusicStateRow, YTPlayerInstance } from '../types'
import { extractVideoId } from '../constants'

// Compute seek position based on DB state.
// If is_playing=true : position = now - started_at (song clock keeps ticking).
// If is_playing=false: position = updated_at - started_at (frozen at pause/leave moment).
function calcSeek(startedAt: string | null, isPlaying: boolean, updatedAt: string | null): number {
  if (!startedAt) return 0
  if (isPlaying) {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  }
  if (updatedAt) {
    return Math.max(0, Math.floor((new Date(updatedAt).getTime() - new Date(startedAt).getTime()) / 1000))
  }
  return 0
}

export function useMusic(voiceRoom: string, username: string, isInVoice: boolean) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const queueRef = useRef<QueueItem[]>([])
  const [isHost, setIsHost] = useState(false)
  const isHostRef = useRef(false)
  const [hostUsername, setHostUsername] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [queueInput, setQueueInput] = useState('')
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false)
  const [ytReady, setYtReady] = useState(() =>
    typeof window !== 'undefined' && !!(window.YT && window.YT.Player)
  )
  const playerRef = useRef<YTPlayerInstance | null>(null)

  // Set once in initFromJoin, consumed by the player effect, then reset to 0.
  const initialSeekRef = useRef<number>(0)
  const initialPlayingRef = useRef<boolean>(true)

  const currentSong = queue[0] ?? null
  const currentVideoId = currentSong?.video_id ?? null

  useEffect(() => { queueRef.current = queue }, [queue])

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

  // Queue subscription — non-hosts seek whenever started_at changes (song start or host resume).
  useEffect(() => {
    if (!username || !voiceRoom) return
    refetchQueue()

    const ch = supabase.channel(`queue-${voiceRoom}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, (payload) => {
        refetchQueue()
        type Row = { started_at?: string | null; video_id?: string }
        const newRow = payload.new as Row
        if (
          payload.eventType === 'UPDATE' &&
          newRow.started_at &&
          !isHostRef.current &&
          playerRef.current &&
          newRow.video_id === queueRef.current[0]?.video_id
        ) {
          const elapsed = Math.max(0, Math.floor(
            (Date.now() - new Date(newRow.started_at).getTime()) / 1000
          ))
          playerRef.current.seekTo(elapsed, true)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [voiceRoom, username, refetchQueue])

  // music_state subscription — sync play/pause for non-hosts.
  useEffect(() => {
    if (!voiceRoom || !username) return

    const ch = supabase.channel(`music-state-${voiceRoom}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'music_state',
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

    return () => { supabase.removeChannel(ch) }
  }, [voiceRoom, username])

  // YouTube IFrame API bootstrap.
  useEffect(() => {
    if (typeof window === 'undefined' || (window.YT && window.YT.Player)) return
    window.onYouTubeIframeAPIReady = () => setYtReady(true)
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  }, [])

  // Player lifecycle — recreate player when song or voice state changes.
  useEffect(() => {
    if (!ytReady || !isInVoice || !currentVideoId) return

    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }
    const container = document.getElementById('yt-player-container')
    if (container) container.innerHTML = '<div id="yt-player"></div>'

    // Capture and immediately reset so subsequent song changes start at 0.
    const capturedSeek = initialSeekRef.current
    const capturedPlaying = initialPlayingRef.current
    const capturedIsHost = isHostRef.current
    const capturedId = queueRef.current[0]?.id
    const capturedStartedAt = queueRef.current[0]?.started_at ?? null
    initialSeekRef.current = 0

    const p = new window.YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: currentVideoId,
      playerVars: { autoplay: 1, controls: 0, start: Math.floor(capturedSeek) },
      events: {
        onReady: (e: { target: YTPlayerInstance }) => {
          e.target.setVolume(volume)

          // For playing state: recalculate from started_at at the moment the player is
          // actually ready, so the ~1-3s init delay is compensated automatically.
          const seekPos = (capturedPlaying && capturedStartedAt)
            ? Math.max(0, Math.floor((Date.now() - new Date(capturedStartedAt).getTime()) / 1000))
            : capturedSeek

          e.target.seekTo(seekPos, true)

          if (capturedPlaying) {
            e.target.playVideo()
            setIsPlaying(true)
            // New song with no started_at yet — record when it begins.
            if (capturedIsHost && capturedId && !capturedStartedAt) {
              supabase.from('queue')
                .update({ started_at: new Date().toISOString() })
                .eq('id', capturedId)
                .is('started_at', null)
                .then()
            }
            // Sync is_playing=true for non-hosts who joined while host was becoming host.
            if (capturedIsHost && voiceRoom) {
              supabase.from('music_state').update({
                is_playing: true,
                updated_at: new Date().toISOString(),
              }).eq('room_id', voiceRoom).then()
            }
          } else {
            e.target.pauseVideo()
            setIsPlaying(false)
          }
        },
        onStateChange: (e: { target: YTPlayerInstance; data: number }) => {
          if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true)
          if (e.data === window.YT.PlayerState.PAUSED) setIsPlaying(false)
          if (e.data === window.YT.PlayerState.ENDED && isHostRef.current) {
            advanceQueue()
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

  const advanceQueue = () => {
    const [first, ...rest] = queueRef.current
    if (!first) return
    supabase.from('queue').delete().eq('id', first.id).then(() => {
      const nextStartedAt = new Date().toISOString()
      if (rest[0]) {
        supabase.from('queue')
          .update({ started_at: nextStartedAt })
          .eq('id', rest[0].id)
          .then()
      }
      supabase.from('music_state').update({
        current_video_id: rest[0]?.video_id ?? null,
        started_at: rest[0] ? nextStartedAt : null,
        is_playing: !!rest[0],
        updated_at: new Date().toISOString(),
      }).eq('room_id', voiceRoom).then()
    })
  }

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

  const addPlaylistToQueue = async () => {
    if (!voiceRoom) return
    const url = queueInput.trim()
    if (!url) return

    setIsAddingPlaylist(true)
    const toastId = toast.loading('Çalma listesi yükleniyor...')

    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`)
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error ?? 'Çalma listesi alınamadı', { id: toastId })
        return
      }

      const { items, title } = body as { items: { videoId: string; title: string; thumbnail: string }[]; title: string }

      if (!items?.length) {
        toast.error('Çalma listesinde video bulunamadı', { id: toastId })
        return
      }

      toast.loading(`${items.length} şarkı ekleniyor...`, { id: toastId })

      const isFirstSong = queueRef.current.length === 0
      const firstStartedAt = isFirstSong ? new Date().toISOString() : undefined
      const baseTime = Date.now()

      const insertData = items.map((item, idx) => ({
        room_id: voiceRoom,
        video_id: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        added_by: username,
        added_at: new Date(baseTime + idx * 10).toISOString(),
        ...(isFirstSong && idx === 0 && firstStartedAt ? { started_at: firstStartedAt } : {}),
      }))

      const BATCH = 50
      for (let i = 0; i < insertData.length; i += BATCH) {
        const { error } = await supabase.from('queue').insert(insertData.slice(i, i + BATCH))
        if (error) {
          toast.error('Bazı şarkılar eklenemedi: ' + error.message, { id: toastId })
          return
        }
      }

      if (isFirstSong && firstStartedAt) {
        await supabase.from('music_state').upsert({
          room_id: voiceRoom,
          current_video_id: items[0].videoId,
          started_at: firstStartedAt,
          is_playing: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' })
      }

      toast.success(`"${title}" — ${items.length} şarkı eklendi`, { id: toastId })
      setQueueInput('')
      refetchQueue()
    } catch {
      toast.error('Bir hata oluştu', { id: toastId })
    } finally {
      setIsAddingPlaylist(false)
    }
  }

  const clearQueue = async () => {
    if (!voiceRoom) return
    const { error } = await supabase.from('queue').delete().eq('room_id', voiceRoom)
    if (error) { toast.error('Kuyruk temizlenemedi: ' + error.message); return }
    await supabase.from('music_state').update({
      current_video_id: null,
      started_at: null,
      is_playing: false,
      updated_at: new Date().toISOString(),
    }).eq('room_id', voiceRoom)
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
          .eq('id', rest[0].id),
        voiceRoom && supabase.from('music_state').update({
          current_video_id: rest[0]?.video_id ?? null,
          started_at: rest[0] ? nextStartedAt : null,
          is_playing: !!rest[0],
          updated_at: new Date().toISOString(),
        }).eq('room_id', voiceRoom),
      ].filter(Boolean))
    } catch {
      toast.error('Sonraki şarkıya geçilemiyor')
    }
  }

  const togglePlay = async () => {
    if (!isHostRef.current || !playerRef.current) return
    try {
      const newPlaying = !isPlaying
      const currentTime = playerRef.current.getCurrentTime()

      if (newPlaying) {
        playerRef.current.playVideo()
        // Update started_at so others can calculate the correct live position.
        const newStartedAt = new Date(Date.now() - currentTime * 1000).toISOString()
        const item = queueRef.current[0]
        if (voiceRoom && item) {
          await supabase.from('queue')
            .update({ started_at: newStartedAt })
            .eq('id', item.id)
          await supabase.from('music_state').update({
            is_playing: true,
            updated_at: new Date().toISOString(),
          }).eq('room_id', voiceRoom)
        }
      } else {
        playerRef.current.pauseVideo()
        // updated_at records the freeze moment; others use updated_at - started_at for position.
        if (voiceRoom) {
          await supabase.from('music_state').update({
            is_playing: false,
            updated_at: new Date().toISOString(),
          }).eq('room_id', voiceRoom)
        }
      }
    } catch {
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

    const isPlayingNow = becomeHost
      ? (queueData.length > 0 && (musicState?.is_playing ?? false))
      : (musicState?.is_playing ?? false)

    initialPlayingRef.current = isPlayingNow
    initialSeekRef.current = calcSeek(
      queueData[0]?.started_at ?? null,
      isPlayingNow,
      musicState?.updated_at ?? null
    )

    setHostUsername(becomeHost ? joinUsername : (musicState?.host_username || ''))
    isHostRef.current = becomeHost
    setIsHost(becomeHost)
  }

  const resetOnLeave = () => {
    setIsHost(false)
    isHostRef.current = false
    setHostUsername('')
    setQueue([])
    queueRef.current = []
    initialSeekRef.current = 0
    initialPlayingRef.current = true
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
    isAddingPlaylist,
    currentSong,
    addToQueue,
    addPlaylistToQueue,
    clearQueue,
    removeFromQueue,
    handleNext,
    togglePlay,
    handleVolumeChange,
    initFromJoin,
    resetOnLeave,
  }
}
