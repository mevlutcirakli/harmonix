'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { toast, Toaster } from 'sonner'
import './room.css'

import { ROOMS, formatTime, getUserColor } from './constants'
import {
  IconHash,
  IconVolume,
  IconCrown,
  IconLogOut,
  IconSend,
  IconHamburger,
  IconMonitor,
  IconFullscreen,
  IconExitFullscreen,
} from './icons'
import { useChat } from './hooks/useChat'
import { useVoice } from './hooks/useVoice'
import { useMusic } from './hooks/useMusic'
import Avatar from './components/Avatar'
import SoundWaveBars from './components/SoundWaveBars'
import VoiceControls from './components/VoiceControls'
import SpeakerListener from './components/SpeakerListener'
import VoiceParticipantListener from './components/VoiceParticipantListener'
import ScreenShareViewer from './components/ScreenShareViewer'
import UsersPanel from './components/UsersPanel'
import MusicPlayerBar from './components/MusicPlayerBar'
import QueuePanel from './components/QueuePanel'
import type { MusicStateRow, QueueItem } from './types'

export default function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params)
  const router = useRouter()

  const [textRoom, setTextRoom] = useState(room)
  const textRoomData = ROOMS.find(r => r.id === textRoom)
  const textRoomName = textRoomData?.name || textRoom

  const [username, setUsername] = useState('')

  // Auth check: run only on client after hydration
  useEffect(() => {
    const stored = localStorage.getItem('username')
    if (!stored) {
      router.push('/')
    } else {
      setUsername(stored)
    }
  }, [router])

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const screenContainerRef = useRef<HTMLDivElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)

  // Hooks — fully destructured so the React compiler never sees dot-access on a ref-containing object
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
    currentSong,
    addToQueue,
    removeFromQueue,
    handleNext,
    togglePlay,
    handleVolumeChange,
    initFromJoin,
    resetOnLeave,
  } = useMusic(voiceRoom, username, isInVoice)

  // Merged user list for users panel
  const mergedUsers = useMemo(
    () => [...new Set([...onlineUsers, ...voiceParticipants])],
    [onlineUsers, voiceParticipants]
  )

  // Screen share video binding
  useEffect(() => {
    if (!screenTrack || !screenVideoRef.current) return
    const stream = new MediaStream([screenTrack])
    screenVideoRef.current.srcObject = stream
  }, [screenTrack])

  // Fullscreen API
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

  // Join voice: fetch token + queue + musicState in parallel, then coordinate
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

  // Leave voice: hand off host if needed, then disconnect
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

      {/* Left Sidebar */}
      <div
        className={`
          fixed md:relative z-50 md:z-auto
          h-full flex flex-col flex-shrink-0
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          width: 224,
          backgroundColor: '#0f0f0f',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#f0f0f0' }}>Harmonix</span>
        </div>

        {/* Channel list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Text channels */}
          <div>
            <p style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              color: '#444',
              textTransform: 'uppercase',
              padding: '0 10px',
              marginBottom: 4,
            }}>
              Kanallar
            </p>
            {ROOMS.map(r => (
              <button key={r.id} onClick={() => switchTextRoom(r.id)}
                className={`channel-btn${r.id === textRoom ? ' channel-btn--active' : ''}`}
                style={{ height: 32, padding: '0 10px', gap: 8, fontSize: 13, color: r.id === textRoom ? '#3ecf8e' : '#888', marginBottom: 1 }}>
                <span style={{ color: r.id === textRoom ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                  <IconHash />
                </span>
                <span>{r.name}</span>
              </button>
            ))}
          </div>

          {/* Voice channels */}
          <div>
            <p style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              color: '#444',
              textTransform: 'uppercase',
              padding: '0 10px',
              marginBottom: 4,
            }}>
              Ses
            </p>
            {ROOMS.map((r) => {
              const isActiveVoice = voiceRoom === r.id && isInVoice
              return (
                <div key={r.id} style={{ marginBottom: 2 }}>
                  <button onClick={() => handleJoinVoice(r.id)}
                    className={`channel-btn${isActiveVoice ? ' channel-btn--active' : ''}`}
                    style={{ height: 32, padding: '0 14px', gap: 8, fontSize: 12, color: isActiveVoice ? '#3ecf8e' : '#888' }}>
                    <span style={{ color: isActiveVoice ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                      <IconVolume />
                    </span>
                    <span>{r.name}</span>
                    {isActiveVoice && (
                      <div style={{ marginLeft: 'auto' }}>
                        <SoundWaveBars delays={[0, 0.2, 0.4]} duration="0.6s" />
                      </div>
                    )}
                  </button>

                  {isActiveVoice && voiceParticipants.length > 0 && (
                    <div style={{ paddingLeft: 24, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {voiceParticipants.map(user => {
                        const isSpeaking = speaking.has(user)
                        return (
                          <div key={user} className={`user-row${isSpeaking ? ' user-row--speaking' : ''}`}
                            style={{ gap: 6, padding: '2px 8px' }}>
                            <Avatar username={user} size="sm" speaking={isSpeaking} />
                            <span className="text-truncate" style={{ fontSize: 11, color: isSpeaking ? '#f0f0f0' : '#888', flex: 1 }}>
                              {user}{user === username ? ' (sen)' : ''}
                            </span>
                            {user === hostUsername && <span className="crown-icon" title="Müzik Hostu"><IconCrown /></span>}
                            {isSpeaking && <SoundWaveBars />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* LiveKit audio connection */}
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
            <VoiceParticipantListener onParticipantsChange={setVoiceParticipants} />
            <ScreenShareViewer onScreenShare={setScreenTrack} />
            <VoiceControls onLeave={handleLeaveVoice} />
          </LiveKitRoom>
        )}

        {/* User footer */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Avatar username={username} size="md" />
            <span suppressHydrationWarning className="text-truncate" style={{ fontSize: 13, color: '#f0f0f0' }}>{username}</span>
            {isHost && <span className="crown-icon" title="Müzik Hostu"><IconCrown /></span>}
          </div>
          <button onClick={() => { localStorage.removeItem('username'); router.push('/') }}
            className="icon-btn icon-btn-sm icon-btn-ghost" title="Çıkış">
            <IconLogOut />
          </button>
        </div>
      </div>

      {/* Center — Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          height: 48,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <button className="md:hidden icon-btn icon-btn-md icon-btn-ghost" onClick={() => setSidebarOpen(true)}>
            <IconHamburger />
          </button>

          <span style={{ color: '#444', display: 'flex', flexShrink: 0 }}><IconHash /></span>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0', margin: 0 }}>{textRoomName}</h2>

          {isInVoice && (
            <span
              className="hidden sm:flex"
              style={{
                marginLeft: 4,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(62,207,142,0.12)',
                color: '#3ecf8e',
              }}
            >
              <IconVolume />
              {ROOMS.find(r => r.id === voiceRoom)?.name}
            </span>
          )}

          {isInVoice && isHost && (
            <span
              className="hidden sm:flex"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(245,158,11,0.12)',
                color: '#f59e0b',
              }}
            >
              <IconCrown /> Host
            </span>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#444', flexShrink: 0 }}>
            {onlineUsers.length} çevrimiçi
          </span>
        </div>

        {/* Music player bar */}
        {isInVoice && currentSong && (
          <MusicPlayerBar
            song={currentSong}
            isPlaying={isPlaying}
            volume={volume}
            isHost={isHost}
            onTogglePlay={togglePlay}
            onNext={handleNext}
            onPrev={() => {}}
            onVolumeChange={handleVolumeChange}
          />
        )}

        {/* Screen share */}
        {isInVoice && screenTrack && (
          <div
            ref={screenContainerRef}
            style={{
              position: 'relative',
              flexShrink: 0,
              margin: '12px 16px 0',
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#000',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
            }}
            className="group"
            onDoubleClick={toggleFullscreen}
          >
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: isFullscreen ? '100vh' : 'min(280px, 40vw)' }}
            />

            <div style={{
              position: 'absolute', top: 8, left: 8,
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(0,0,0,0.65)',
              color: '#f0f0f0',
              backdropFilter: 'blur(4px)',
            }}>
              <IconMonitor /> Ekran Paylaşımı
            </div>

            <div style={{ position: 'absolute', top: 8, right: 8 }} className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: '#f0f0f0',
                  backdropFilter: 'blur(4px)',
                  transition: 'background-color 150ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.65)' }}
                title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
              >
                {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
              </button>
            </div>

            {!isFullscreen && (
              <div
                style={{
                  position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                  backgroundColor: 'rgba(0,0,0,0.6)', color: '#f0f0f0',
                }}
                className="opacity-0 group-hover:opacity-60 transition-opacity duration-150"
              >
                Çift tıkla → tam ekran
              </div>
            )}

            {isFullscreen && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                fontSize: 11, padding: '3px 12px', borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.6)', color: '#f0f0f0',
              }}>
                ESC veya çift tıkla → küçült
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, marginTop: 32, color: '#444' }}>
              Henüz mesaj yok. İlk mesajı sen at.
            </p>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.username === username
            const prevMsg = messages[i - 1]
            const showHeader = !prevMsg || prevMsg.username !== msg.username
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  marginTop: showHeader && i > 0 ? 12 : 0,
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: 'min(320px, 85vw)',
                }}>
                  {showHeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '0 4px' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: getUserColor(msg.username) }}>
                        {msg.username}
                      </span>
                      <span style={{ fontSize: 10, color: '#444' }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div style={{
                    padding: '7px 12px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    backgroundColor: isOwn ? '#3ecf8e' : '#161616',
                    color: isOwn ? '#080808' : '#f0f0f0',
                    borderRadius: isOwn ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Chat input */}
        <div style={{ padding: '8px 12px 12px', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 40,
            padding: '0 12px',
            borderRadius: 8,
            backgroundColor: '#161616',
            border: '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 150ms ease',
          }}>
            <input
              style={{
                flex: 1,
                background: 'transparent',
                color: '#f0f0f0',
                fontSize: 13,
                outline: 'none',
                border: 'none',
              }}
              placeholder={`#${textRoomName} kanalına mesaj gönder`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              onFocus={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) parent.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
              onBlur={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) parent.style.borderColor = 'rgba(255,255,255,0.07)'
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() ? '#3ecf8e' : '#444',
                transition: 'color 150ms ease',
                cursor: input.trim() ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >
              <IconSend />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div
        className="hidden lg:flex"
        style={{
          width: 240,
          flexDirection: 'column',
          flexShrink: 0,
          backgroundColor: '#0f0f0f',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {isInVoice && (
          <QueuePanel
            queue={queue}
            queueInput={queueInput}
            onInputChange={setQueueInput}
            onAdd={addToQueue}
            onRemove={removeFromQueue}
          />
        )}
        <UsersPanel
          users={mergedUsers}
          speaking={speaking}
          currentUser={username}
          hostUsername={hostUsername}
        />
      </div>

    </div>
  )
}
