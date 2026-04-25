'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { toast, Toaster } from 'sonner'
import './room.css'

import { ROOMS } from './constants'
import { useChat } from './hooks/useChat'
import { useVoice } from './hooks/useVoice'
import { useMusic } from './hooks/useMusic'
import LeftSidebar from './components/LeftSidebar'
import ChatArea from './components/ChatArea'
import RightSidebar from './components/RightSidebar'
import type { MusicStateRow, QueueItem } from './types'

export default function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params)
  const router = useRouter()

  const [textRoom, setTextRoom] = useState(room)
  const textRoomData = ROOMS.find(r => r.id === textRoom)
  const textRoomName = textRoomData?.name || textRoom

  const [username] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('username') ?? '') : ''
  )

  useEffect(() => {
    if (!username) router.push('/')
  }, [username, router])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const screenContainerRef = useRef<HTMLDivElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)

  const {
    messages,
    input,
    setInput,
    onlineUsers,
    sendMessage,
    bottomRef,
    resetMessages,
  } = useChat(textRoom, username, router)

  const {
    voiceRoom,
    isInVoice,
    liveKitToken,
    speaking,
    setSpeaking,
    voiceParticipants,
    voiceParticipantsRef,
    setVoiceParticipants,
    screenTrack,
    setScreenTrack,
    connectToRoom,
    disconnectFromRoom,
  } = useVoice(username)

  const {
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
  } = useMusic(voiceRoom, username, isInVoice)

  const mergedUsers = useMemo(
    () => [...new Set([...onlineUsers, ...voiceParticipants])],
    [onlineUsers, voiceParticipants]
  )

  useEffect(() => {
    if (!screenTrack || !screenVideoRef.current) return
    const stream = new MediaStream([screenTrack])
    screenVideoRef.current.srcObject = stream
  }, [screenTrack])

  const toggleFullscreen = async () => {
    if (!screenContainerRef.current) return
    const el = screenContainerRef.current as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>
    }
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  const switchTextRoom = (id: string) => {
    setTextRoom(id)
    resetMessages()
    setSidebarOpen(false)
  }

  const handleJoinVoice = async (targetRoom: string) => {
    if (isInVoice && voiceRoom === targetRoom) { handleLeaveVoice(); return }
    try {
      const [tokenRes, { data: queueData }, { data: musicState }] = await Promise.all([
        fetch(`/api/livekit-token?room=${targetRoom}&username=${username}`).then(r => r.json()),
        supabase.from('queue').select('*').eq('room_id', targetRoom).order('added_at', { ascending: true }),
        supabase.from('music_state').select('*').eq('room_id', targetRoom).maybeSingle(),
      ])
      const { token } = tokenRes

      let becomeHost = false
      if (!musicState || !musicState.host_username) {
        await supabase.from('music_state').upsert({
          room_id: targetRoom,
          host_username: username,
          is_playing: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' })
        becomeHost = true
      }

      initFromJoin(queueData as QueueItem[] ?? [], musicState as MusicStateRow | null, becomeHost, username)
      await connectToRoom(targetRoom, token)
      setSidebarOpen(false)
    } catch {
      toast.error('Ses kanalına bağlanılamadı')
    }
  }

  const handleLeaveVoice = async () => {
    if (isHostRef.current && voiceRoom) {
      const others = voiceParticipantsRef.current.filter((p: string) => p !== username)
      const nextHost = others[0] || null
      await supabase.from('music_state').upsert({
        room_id: voiceRoom,
        host_username: nextHost,
        is_playing: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' })
    }
    await disconnectFromRoom()
    resetOnLeave()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#080808', color: '#f0f0f0' }}>
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Hidden YouTube player */}
      <div id="yt-player-container" style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <div id="yt-player" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <LeftSidebar
        sidebarOpen={sidebarOpen}
        textRoom={textRoom}
        voiceRoom={voiceRoom}
        isInVoice={isInVoice}
        voiceParticipants={voiceParticipants}
        speaking={speaking}
        username={username}
        hostUsername={hostUsername}
        isHost={isHost}
        liveKitToken={liveKitToken}
        onSwitchTextRoom={switchTextRoom}
        onJoinVoice={handleJoinVoice}
        onLeaveVoice={handleLeaveVoice}
        onLogout={() => { localStorage.removeItem('username'); router.push('/') }}
        setSpeaking={setSpeaking}
        setVoiceParticipants={setVoiceParticipants}
        setScreenTrack={setScreenTrack}
      />

      <ChatArea
        textRoomName={textRoomName}
        voiceRoom={voiceRoom}
        isInVoice={isInVoice}
        isHost={isHost}
        onSidebarOpen={() => setSidebarOpen(true)}
        onlineUsers={onlineUsers}
        currentSong={currentSong}
        isPlaying={isPlaying}
        volume={volume}
        onTogglePlay={togglePlay}
        onNext={handleNext}
        onVolumeChange={handleVolumeChange}
        screenTrack={screenTrack}
        screenContainerRef={screenContainerRef}
        screenVideoRef={screenVideoRef}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        messages={messages}
        username={username}
        input={input}
        onInputChange={setInput}
        onSendMessage={sendMessage}
        bottomRef={bottomRef}
      />

      <RightSidebar
        isInVoice={isInVoice}
        queue={queue}
        queueInput={queueInput}
        onQueueInputChange={setQueueInput}
        onAddToQueue={addToQueue}
        onAddPlaylist={addPlaylistToQueue}
        onRemoveFromQueue={removeFromQueue}
        onClearQueue={clearQueue}
        isAddingPlaylist={isAddingPlaylist}
        users={mergedUsers}
        speaking={speaking}
        currentUser={username}
        hostUsername={hostUsername}
      />
    </div>
  )
}
