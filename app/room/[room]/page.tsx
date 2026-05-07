'use client'

import { useState, useEffect, useRef, useSyncExternalStore, useMemo } from 'react'
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

  const { messages, input, setInput, onlineUsers, sendMessage, bottomRef } =
    useChat('genel', username, router)

  const { voiceRoom, isInVoice, liveKitToken, speaking, setSpeaking, connectToRoom, disconnectFromRoom } =
    useVoice(username)

  const {
    queue, currentSong, volume, isMuted, pausedAt,
    queueInput, setQueueInput, isAdding,
    addToQueue, togglePlay, skip, removeFromQueue,
    clearQueue, handleVolumeChange, toggleMute, resetOnLeave,
  } = useMusic(voiceRoom || 'genel', username, isInVoice)

  // Subscribe to presence channel as observer. Only sync events feed remoteParticipants.
  useEffect(() => {
    if (!username) return

    type PresenceRow = { username: string; voiceRoom: string }
    const ch = supabase.channel('hx-voice-presence', {
      config: { presence: { key: username } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresenceRow>()
      const map: Record<string, Participant[]> = {}
      Object.values(state).flat().forEach(p => {
        if (!p.voiceRoom || p.username === username) return
        if (!map[p.voiceRoom]) map[p.voiceRoom] = []
        if (!map[p.voiceRoom].find(u => u.username === p.username))
          map[p.voiceRoom].push({ username: p.username })
      })
      setRemoteParticipants(map)
    })
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

  // Compose final map: remote users from presence + myself from local state.
  const channelParticipants = useMemo(() => {
    const map: Record<string, Participant[]> = {}
    for (const [room, ps] of Object.entries(remoteParticipants)) {
      map[room] = [...ps]
    }
    if (isInVoice && voiceRoom) {
      if (!map[voiceRoom]) map[voiceRoom] = []
      if (!map[voiceRoom].find(u => u.username === username))
        map[voiceRoom].push({ username })
    }
    return map
  }, [remoteParticipants, isInVoice, voiceRoom, username])

  const handleJoinVoice = async (targetRoom: string) => {
    if (joiningRef.current) return
    joiningRef.current = true

    try {
      if (isInVoice) {
        await disconnectFromRoom()
        resetOnLeave()
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
  }

  if (!username) return null

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

      <LeftNav
        voiceRoom={voiceRoom}
        isInVoice={isInVoice}
        channelParticipants={channelParticipants}
        username={username}
        onJoinVoice={handleJoinVoice}
        onLeaveVoice={handleLeaveVoice}
        onLogout={() => { localStorage.removeItem('username'); router.push('/') }}
      />

      <VoiceChannelGrid
        voiceRoom={voiceRoom}
        isInVoice={isInVoice}
        channelParticipants={channelParticipants}
        speaking={speaking}
        username={username}
        currentSong={currentSong}
        onJoinVoice={handleJoinVoice}
        onLeaveVoice={handleLeaveVoice}
      />

      <SidePanel
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSendMessage={sendMessage}
        bottomRef={bottomRef}
        username={username}
        onlineUsers={onlineUsers}
        channelParticipants={channelParticipants}
        speaking={speaking}
        queue={queue}
        currentSong={currentSong}
        volume={volume}
        isMuted={isMuted}
        pausedAt={pausedAt}
        queueInput={queueInput}
        setQueueInput={setQueueInput}
        isAdding={isAdding}
        isInVoice={isInVoice}
        onAddToQueue={addToQueue}
        onTogglePlay={togglePlay}
        onSkip={skip}
        onRemoveFromQueue={removeFromQueue}
        onClearQueue={clearQueue}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
      />

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
          <VoiceParticipantListener />
          <RemoteMuteApplier locallyMuted={new Set()} />
          <VoiceControlBar voiceRoom={voiceRoom} onLeave={handleLeaveVoice} />
        </LiveKitRoom>
      )}
    </div>
  )
}
