'use client'

import { useState, useEffect, useRef, useSyncExternalStore, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'

import { supabase } from '@/lib/supabase'
import { useChat } from './hooks/useChat'
import { useVoice } from './hooks/useVoice'
import { useMusic } from './hooks/useMusic'
import { playJoinSound, playLeaveSound } from './sounds'
import type { Participant } from './types'

import LeftNav from './components/LeftNav'
import VoiceChannelGrid from './components/VoiceChannelGrid'
import SidePanel from './components/SidePanel'
import VoiceControlBar from './components/VoiceControlBar'
import SpeakerListener from './components/SpeakerListener'
import VoiceParticipantListener from './components/VoiceParticipantListener'
import RemoteMuteApplier from './components/RemoteMuteApplier'
import MuteStateListener from './components/MuteStateListener'
import { IconSpeaker, IconChat, IconMusic, IconLogOut } from './icons'

const MOBILE_NAV_H = 56

export default function RoomPage() {
  const router = useRouter()

  const username = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('username') ?? '',
    () => '',
  )

  useEffect(() => {
    if (!username) router.push('/')
  }, [username, router])

  const joiningRef = useRef(false)
  const [remoteParticipants, setRemoteParticipants] = useState<Record<string, Participant[]>>({})
  const presenceChRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [presenceReady, setPresenceReady] = useState(false)
  const [remoteMuted, setRemoteMuted] = useState<Set<string>>(new Set())
  const [liveKitParticipants, setLiveKitParticipants] = useState<string[]>([])

  const { messages, input, setInput, onlineUsers, sendMessage, bottomRef } =
    useChat('genel', username, router)

  const { voiceRoom, isInVoice, liveKitToken, speaking, setSpeaking, micMuted, setMicMuted, connectToRoom, disconnectFromRoom } =
    useVoice(username)

  const {
    queue, currentSong, volume, isMuted, pausedAt,
    queueInput, setQueueInput, isAdding,
    addToQueue, addPlaylistToQueue, togglePlay, skip, removeFromQueue,
    clearQueue, handleVolumeChange, toggleMute, resetOnLeave,
  } = useMusic(voiceRoom || 'genel', username, isInVoice)

  const mutedParticipants = useMemo(() => {
    const set = new Set(remoteMuted)
    if (micMuted) set.add(username)
    return set
  }, [remoteMuted, micMuted, username])

  const handleRemoteMuteChange = useCallback((muted: Set<string>) => {
    setRemoteMuted(muted)
  }, [])

  // Subscribe to presence channel as observer. Only sync events feed remoteParticipants.
  useEffect(() => {
    if (!username) return

    type PresenceRow = { username: string; voiceRoom: string }
    const ch = supabase.channel('hx-voice-presence', {
      config: { presence: { key: username } },
    })

    const recomputeRemote = () => {
      const state = ch.presenceState<PresenceRow>()
      const map: Record<string, Participant[]> = {}
      Object.values(state).flat().forEach(p => {
        if (!p.voiceRoom || p.username === username) return
        if (!map[p.voiceRoom]) map[p.voiceRoom] = []
        if (!map[p.voiceRoom].find(u => u.username === p.username))
          map[p.voiceRoom].push({ username: p.username })
      })
      setRemoteParticipants(map)
    }

    ch.on('presence', { event: 'sync' }, recomputeRemote)
      .on('presence', { event: 'join' }, recomputeRemote)
      .on('presence', { event: 'leave' }, recomputeRemote)
      .subscribe(status => {
        setPresenceReady(status === 'SUBSCRIBED')
      })

    presenceChRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      presenceChRef.current = null
      setPresenceReady(false)
    }
  }, [username])

  // Declaratively sync my own presence with my local voice state.
  useEffect(() => {
    if (!presenceReady || !username) return
    const ch = presenceChRef.current
    if (!ch) return

    if (isInVoice && voiceRoom) {
      ch.track({ username, voiceRoom })
    } else {
      ch.untrack()
    }
  }, [presenceReady, isInVoice, voiceRoom, username])

  // Periodic presence resync. Realtime can drop a sync packet, leaving other
  // clients with a stale view (user is heard via LiveKit but missing from the
  // avatar list). Re-tracking every 15s heals these gaps.
  useEffect(() => {
    if (!presenceReady || !username || !isInVoice || !voiceRoom) return
    const ch = presenceChRef.current
    if (!ch) return
    const id = setInterval(() => {
      ch.track({ username, voiceRoom })
    }, 15000)
    return () => clearInterval(id)
  }, [presenceReady, isInVoice, voiceRoom, username])

  // Compose final map: remote users from presence + myself from local state.
  // For the currently joined voice room, prefer LiveKit's participant list as
  // source of truth (presence can miss sync packets; LiveKit reflects who can
  // actually talk in this room).
  const channelParticipants = useMemo(() => {
    const map: Record<string, Participant[]> = {}
    for (const [room, ps] of Object.entries(remoteParticipants)) {
      map[room] = [...ps]
    }
    if (isInVoice && voiceRoom) {
      const lkIncludesSelf = liveKitParticipants.includes(username)
      if (lkIncludesSelf) {
        map[voiceRoom] = liveKitParticipants.map(u => ({ username: u }))
      } else {
        if (!map[voiceRoom]) map[voiceRoom] = []
        if (!map[voiceRoom].find(u => u.username === username))
          map[voiceRoom].push({ username })
      }
    }
    return map
  }, [remoteParticipants, isInVoice, voiceRoom, username, liveKitParticipants])

  const handleJoinVoice = async (targetRoom: string) => {
    if (joiningRef.current) return
    joiningRef.current = true

    try {
      if (isInVoice) {
        await disconnectFromRoom()
        resetOnLeave()
        setLiveKitParticipants([])
      }

      const { token } = await fetch(
        `/api/livekit-token?room=${targetRoom}&username=${username}`
      ).then(r => r.json())
      await connectToRoom(targetRoom, token)
      playJoinSound()
    } catch {
      toast.error('Ses kanalına bağlanılamadı')
    } finally {
      joiningRef.current = false
    }
  }

  const handleLeaveVoice = async () => {
    playLeaveSound()
    await disconnectFromRoom()
    resetOnLeave()
    setLiveKitParticipants([])
  }

  const [isMobile, setIsMobile] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'channels' | 'chat' | 'music'>('channels')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!username) return null

  const sidePanelProps = {
    messages, input, onInputChange: setInput, onSendMessage: sendMessage,
    bottomRef, username, onlineUsers, channelParticipants, speaking, mutedParticipants,
    queue, currentSong, volume, isMuted, pausedAt,
    queueInput, setQueueInput, isAdding, isInVoice,
    onAddToQueue: addToQueue, onAddPlaylistToQueue: addPlaylistToQueue,
    onTogglePlay: togglePlay, onSkip: skip, onRemoveFromQueue: removeFromQueue,
    onClearQueue: clearQueue, onVolumeChange: handleVolumeChange, onToggleMute: toggleMute,
  }

  const voiceBarBottom = isInVoice ? MOBILE_NAV_H + 60 : MOBILE_NAV_H

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text-1)',
    }}>
      <Toaster position="bottom-right" theme="dark" richColors />
      <div id="yt-player" style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }} />

      {/* Sol nav — yalnızca masaüstü */}
      {!isMobile && (
        <LeftNav
          voiceRoom={voiceRoom}
          isInVoice={isInVoice}
          channelParticipants={channelParticipants}
          username={username}
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
          onLogout={() => { localStorage.removeItem('username'); router.push('/') }}
        />
      )}

      {/* Ses kanalları — masaüstünde her zaman, mobilde yalnızca "kanallar" sekmesinde */}
      {(!isMobile || mobilePanel === 'channels') && (
        <VoiceChannelGrid
          voiceRoom={voiceRoom}
          isInVoice={isInVoice}
          channelParticipants={channelParticipants}
          speaking={speaking}
          mutedParticipants={mutedParticipants}
          username={username}
          currentSong={currentSong}
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
          extraBottomPadding={isMobile ? (isInVoice ? MOBILE_NAV_H + 52 : MOBILE_NAV_H + 16) : 0}
        />
      )}

      {/* Yan panel — masaüstünde sabit, mobilde tam ekran kaplayan overlay */}
      {isMobile ? (
        mobilePanel !== 'channels' && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            bottom: voiceBarBottom,
            zIndex: 50, display: 'flex', flexDirection: 'column',
            background: 'var(--surface)',
          }}>
            <SidePanel
              {...sidePanelProps}
              forcedTab={mobilePanel === 'music' ? 'music' : 'chat'}
            />
          </div>
        )
      ) : (
        <SidePanel {...sidePanelProps} />
      )}

      {isInVoice && liveKitToken && (
        <LiveKitRoom
          audio={true}
          token={liveKitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          style={{ display: 'contents' }}
        >
          <RoomAudioRenderer />
          <SpeakerListener onSpeakersChange={setSpeaking} />
          <VoiceParticipantListener onParticipantsChange={setLiveKitParticipants} />
          <MuteStateListener onMuteChange={handleRemoteMuteChange} />
          <RemoteMuteApplier locallyMuted={new Set()} />
          <VoiceControlBar
            voiceRoom={voiceRoom}
            micMuted={micMuted}
            onMicMutedChange={setMicMuted}
            onLeave={handleLeaveVoice}
            isMobile={isMobile}
            mobileNavH={MOBILE_NAV_H}
          />
        </LiveKitRoom>
      )}

      {/* Mobil alt navigasyon çubuğu */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: MOBILE_NAV_H,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'stretch',
          zIndex: 200,
        }}>
          {([
            { id: 'channels' as const, label: 'Kanallar', icon: <IconSpeaker size={20} /> },
            { id: 'chat'     as const, label: 'Sohbet',   icon: <IconChat size={20} /> },
            { id: 'music'    as const, label: 'Müzik',    icon: <IconMusic size={20} /> },
          ]).map(item => (
            <button
              key={item.id}
              onClick={() => setMobilePanel(item.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, fontSize: 10, fontWeight: 600,
                color: mobilePanel === item.id ? 'var(--accent)' : 'var(--text-3)',
                transition: 'color 150ms',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <button
            onClick={() => { localStorage.removeItem('username'); router.push('/') }}
            style={{
              width: 56,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, fontSize: 10, fontWeight: 600,
              color: 'var(--text-3)',
              borderLeft: '1px solid var(--border)',
              transition: 'color 150ms',
            }}
          >
            <IconLogOut size={18} />
            Çıkış
          </button>
        </nav>
      )}
    </div>
  )
}
