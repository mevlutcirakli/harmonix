'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { RoomEvent, Track } from 'livekit-client'

declare global {
  interface Window {
    YT: { Player: new (id: string, opts: object) => YTPlayerInstance; PlayerState: Record<string, number> }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayerInstance {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (v: number) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
}

// ─── SVG İkonlar ────────────────────────────────────────────────────────────

const IconMic = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const IconMicOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 4.9"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const IconCamera = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

const IconCameraOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M16 16H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3"/>
    <polygon points="23 7 16 12 23 17 23 7"/>
  </svg>
)

const IconScreen = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <polyline points="15 9 12 6 9 9"/>
    <line x1="12" y1="6" x2="12" y2="13"/>
  </svg>
)

const IconPhoneOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.5 16.5L19 19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.99-3.99m-1.42-4.47A19.79 19.79 0 0 1 3 5.18 2 2 0 0 1 5 3l3 0a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 10.91"/>
    <path d="M14.31 14.31l1.28-1.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.24V18"/>
  </svg>
)

const IconVolume = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
)

const IconHash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
)

const IconMusic = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
)

const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
)

const IconSkipBack = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"/>
    <line x1="5" y1="19" x2="5" y2="5"/>
  </svg>
)

const IconSkipForward = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"/>
    <line x1="19" y1="5" x2="19" y2="19"/>
  </svg>
)

const IconYouTube = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const IconFullscreen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
)

const IconExitFullscreen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
  </svg>
)

const IconHamburger = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

const IconCrown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M3 17l1-8 5 4 3-7 3 7 5-4 1 8H3z"/>
    <rect x="3" y="18" width="18" height="2" rx="1"/>
  </svg>
)

const IconLogOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const IconMonitor = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ROOMS = [
  { id: 'genel', name: 'Genel' },
  { id: 'muzik', name: 'Müzik' },
  { id: 'oyun', name: 'Oyun' },
]

const USER_COLORS = ['#3ecf8e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

function getUserColor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface Message {
  id: string
  username: string
  content: string
  created_at: string
}

interface QueueItem {
  id: string
  room_id: string
  video_id: string
  title: string
  thumbnail: string
  added_by: string
  added_at: string
  started_at: string | null
}

interface MusicStateRow {
  room_id: string
  host_username: string | null
  is_playing: boolean
  current_video_id: string | null
  started_at: string | null
}

// ─── Ses Kontrolleri (LiveKitRoom içinde) ────────────────────────────────────

function VoiceControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const [muted, setMuted] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screen, setScreen] = useState(false)

  useEffect(() => {
    if (!localParticipant) return
    localParticipant.setMicrophoneEnabled(true)
  }, [localParticipant])

  const toggleMic = async () => { await localParticipant.setMicrophoneEnabled(muted); setMuted(!muted) }
  const toggleCamera = async () => { await localParticipant.setCameraEnabled(!camera); setCamera(!camera) }
  const toggleScreen = async () => { await localParticipant.setScreenShareEnabled(!screen); setScreen(!screen) }

  return (
    <div style={{
      height: 52,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderTop: '1px solid rgba(255,255,255,0.07)',
      backgroundColor: '#161616',
      flexShrink: 0,
    }}>
      <button
        onClick={toggleMic}
        title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
        style={{
          width: 36, height: 36, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: muted ? '#f04444' : '#f0f0f0',
          backgroundColor: muted ? 'rgba(240,68,68,0.12)' : 'transparent',
          transition: 'background-color 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { if (!muted) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
        onMouseLeave={(e) => { if (!muted) e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {muted ? <IconMicOff size={20} /> : <IconMic size={20} />}
      </button>

      <button
        onClick={toggleCamera}
        title={camera ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
        style={{
          width: 36, height: 36, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: camera ? '#3ecf8e' : '#888',
          backgroundColor: 'transparent',
          transition: 'background-color 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {camera ? <IconCamera size={20} /> : <IconCameraOff size={20} />}
      </button>

      <button
        onClick={toggleScreen}
        title={screen ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
        style={{
          width: 36, height: 36, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: screen ? '#3ecf8e' : '#888',
          backgroundColor: 'transparent',
          transition: 'background-color 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <IconScreen size={20} />
      </button>

      <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

      <button
        onClick={onLeave}
        title="Kanaldan Ayrıl"
        style={{
          width: 36, height: 36, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f04444',
          backgroundColor: 'transparent',
          transition: 'background-color 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(240,68,68,0.12)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <IconPhoneOff size={20} />
      </button>
    </div>
  )
}

function SpeakerListener({ onSpeakersChange }: { onSpeakersChange: (s: Set<string>) => void }) {
  const room = useRoomContext()
  useEffect(() => {
    if (!room) return
    const handler = (speakers: Array<{ identity: string }>) => {
      onSpeakersChange(new Set(speakers.map(s => s.identity)))
    }
    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
  track.on('audioLevel', (level) => {
    if (level > 0.05) {
      setSpeaking(prev => new Set(prev).add(participant.identity))
    } else {
      setSpeaking(prev => { const s = new Set(prev); s.delete(participant.identity); return s })
    }
  })
})
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, handler) }
  }, [room, onSpeakersChange])
  return null
}

function VoiceParticipantListener({ onParticipantsChange }: { onParticipantsChange: (p: string[]) => void }) {
  const room = useRoomContext()
  useEffect(() => {
    if (!room) return
    const update = () => {
      const all = [...room.remoteParticipants.values()].map(p => p.identity)
      if (room.localParticipant?.identity) all.push(room.localParticipant.identity)
      onParticipantsChange(all)
    }
    update()
    room.on(RoomEvent.Connected, update)
    room.on(RoomEvent.ParticipantConnected, update)
    room.on(RoomEvent.ParticipantDisconnected, update)
    return () => {
      room.off(RoomEvent.Connected, update)
      room.off(RoomEvent.ParticipantConnected, update)
      room.off(RoomEvent.ParticipantDisconnected, update)
    }
  }, [room, onParticipantsChange])
  return null
}

// ─── Ekran Paylaşımı Dinleyici ────────────────────────────────────────────────

function ScreenShareViewer({ onScreenShare }: { onScreenShare: (track: MediaStreamTrack | null) => void }) {
  const participants = useParticipants()

  useEffect(() => {
    for (const participant of participants) {
      const pub = participant.getTrackPublication(Track.Source.ScreenShare)
      if (pub?.track?.mediaStreamTrack) {
        onScreenShare(pub.track.mediaStreamTrack)
        return
      }
    }
    onScreenShare(null)
  }, [participants, onScreenShare])

  return null
}

// ─── Sağ Sidebar — Kullanıcı Paneli ──────────────────────────────────────────

function UsersPanel({ users, speaking, currentUser, hostUsername }: {
  users: string[]
  speaking: Set<string>
  currentUser: string
  hostUsername: string
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        padding: '11px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          color: '#444',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          Bu Odada — {users.length}
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {users.length === 0 ? (
          <p style={{ fontSize: 12, textAlign: 'center', marginTop: 16, color: '#444' }}>Kimse yok</p>
        ) : (
          users.map((user) => {
            const isSpeaking = speaking.has(user)
            const isMe = user === currentUser
            const isHost = user === hostUsername
            return (
              <div
                key={user}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 6,
                  marginBottom: 2,
                  backgroundColor: isSpeaking ? 'rgba(62,207,142,0.08)' : 'transparent',
                  transition: 'background-color 150ms ease',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    backgroundColor: getUserColor(user),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#080808', fontWeight: 600,
                    boxShadow: isSpeaking ? '0 0 0 2px #3ecf8e' : 'none',
                    transition: 'box-shadow 150ms ease',
                  }}>
                    {user[0]?.toUpperCase()}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: 12,
                      color: '#f0f0f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user}
                    </span>
                    {isMe && (
                      <span style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: 'rgba(62,207,142,0.12)',
                        color: '#3ecf8e',
                        flexShrink: 0,
                      }}>
                        sen
                      </span>
                    )}
                    {isHost && (
                      <span style={{ color: '#f59e0b', flexShrink: 0, display: 'flex' }} title="Müzik Hostu">
                        <IconCrown />
                      </span>
                    )}
                  </div>
                  {isSpeaking && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 3, height: 10 }}>
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <div key={i} style={{
                          width: 2, borderRadius: 1,
                          backgroundColor: '#3ecf8e',
                          height: '100%',
                          animation: 'soundWave 0.5s ease-in-out infinite',
                          animationDelay: `${delay}s`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Müzik Çalar Barı ────────────────────────────────────────────────────────

function MusicPlayerBar({ song, isPlaying, volume, isHost, onTogglePlay, onNext, onPrev, onVolumeChange }: {
  song: QueueItem
  isPlaying: boolean
  volume: number
  isHost: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onVolumeChange: (v: number) => void
}) {
  return (
    <div style={{
      height: 52,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#161616',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      <img
        src={song.thumbnail}
        alt={song.title}
        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#f0f0f0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {song.title}
        </div>
        <div className="hidden sm:block" style={{
          fontSize: 10,
          color: '#444',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {song.added_by}{!isHost ? ' · sadece host kontrolü' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button
          onClick={isHost ? onPrev : undefined}
          title="Önceki"
          style={{
            width: 28, height: 28, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isHost ? '#888' : '#333',
            cursor: isHost ? 'pointer' : 'default',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { if (isHost) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <IconSkipBack />
        </button>
        <button
          onClick={isHost ? onTogglePlay : undefined}
          title={isPlaying ? 'Duraklat' : 'Oynat'}
          style={{
            width: 32, height: 32, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isHost ? '#f0f0f0' : '#444',
            cursor: isHost ? 'pointer' : 'default',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { if (isHost) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button
          onClick={isHost ? onNext : undefined}
          title="Sonraki"
          style={{
            width: 28, height: 28, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isHost ? '#888' : '#333',
            cursor: isHost ? 'pointer' : 'default',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { if (isHost) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <IconSkipForward />
        </button>
      </div>

      <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 6, flexShrink: 0, width: 88 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#444', flexShrink: 0 }}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        </svg>
        <input
          type="range" min="0" max="100" value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="yt-volume-slider"
          style={{ flex: 1, cursor: 'pointer' }}
        />
      </div>

      <a
        href={`https://www.youtube.com/watch?v=${song.video_id}`}
        target="_blank"
        rel="noopener noreferrer"
        title="YouTube'da aç"
        className="hidden sm:flex"
        style={{ flexShrink: 0, opacity: 0.4, color: '#ff0000', transition: 'opacity 150ms ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
      >
        <IconYouTube />
      </a>
    </div>
  )
}

// ─── Müzik Kuyruğu Paneli ────────────────────────────────────────────────────

function QueuePanel({ queue, queueInput, onInputChange, onAdd, onRemove }: {
  queue: QueueItem[]
  queueInput: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ padding: '11px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <p style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          color: '#444',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '0 0 8px',
        }}>
          <span style={{ color: '#3ecf8e', display: 'flex' }}><IconMusic /></span>
          Kuyruk
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            style={{
              flex: 1, minWidth: 0,
              height: 32, fontSize: 12,
              backgroundColor: '#161616',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 6,
              color: '#f0f0f0',
              padding: '0 8px',
              outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            placeholder="YouTube linki..."
            value={queueInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
          <button
            onClick={onAdd}
            disabled={!queueInput.trim()}
            style={{
              width: 32, height: 32, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 18,
              backgroundColor: queueInput.trim() ? 'rgba(62,207,142,0.12)' : '#161616',
              color: queueInput.trim() ? '#3ecf8e' : '#444',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: queueInput.trim() ? 'pointer' : 'default',
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 220 }}>
        {queue.length === 0 ? (
          <p style={{ fontSize: 11, textAlign: 'center', padding: '16px 0', color: '#444' }}>Kuyruk boş</p>
        ) : (
          queue.map((item, idx) => {
            const isActive = idx === 0
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  backgroundColor: isActive ? 'rgba(62,207,142,0.06)' : 'transparent',
                  borderLeft: isActive ? '2px solid #3ecf8e' : '2px solid transparent',
                  transition: 'background-color 150ms ease',
                }}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    color: '#f0f0f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      backgroundColor: getUserColor(item.added_by),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, color: '#080808', fontWeight: 700, flexShrink: 0,
                    }}>
                      {item.added_by[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 10, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.added_by}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 16, lineHeight: 1, color: '#f04444',
                    opacity: 0.35,
                    transition: 'opacity 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35' }}
                  title="Sil"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Ana Sayfa ───────────────────────────────────────────────────────────────

export default function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params)
  const router = useRouter()

  const [textRoom, setTextRoom] = useState(room)
  const textRoomData = ROOMS.find(r => r.id === textRoom)
  const textRoomName = textRoomData?.name || textRoom

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const username = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('username') || '',
    () => ''
  )
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Voice state
  const [voiceRoom, setVoiceRoom] = useState('')
  const [liveKitToken, setLiveKitToken] = useState('')
  const [isInVoice, setIsInVoice] = useState(false)
  const [speaking, setSpeaking] = useState<Set<string>>(new Set())
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([])
  const voiceParticipantsRef = useRef<string[]>([])

  // Music state
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [queueInput, setQueueInput] = useState('')
  const [ytReady, setYtReady] = useState(() =>
    typeof window !== 'undefined' && !!(window.YT && window.YT.Player)
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const queueRef = useRef<QueueItem[]>([])
  const startedAtRef = useRef<string | null>(null)

  // Host state
  const [isHost, setIsHost] = useState(false)
  const [hostUsername, setHostUsername] = useState('')
  const isHostRef = useRef(false)
  const initialIsPlayingRef = useRef(true)

  // Screen share state
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const screenContainerRef = useRef<HTMLDivElement>(null)

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentSong = queue[0] ?? null
  const currentVideoId = currentSong?.video_id ?? null

  // ── Katılımcı ref sync ────────────────────────────────────────────────────

  useEffect(() => { voiceParticipantsRef.current = voiceParticipants }, [voiceParticipants])

  // ── Fullscreen API ────────────────────────────────────────────────────────

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

  // ── Metin kanalı değişince mesajları sıfırla ──────────────────────────────

  const switchTextRoom = (id: string) => {
    setTextRoom(id)
    setMessages([])
    setSidebarOpen(false)
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!localStorage.getItem('username')) router.push('/')
  }, [router])

  // ── Mesajlar + Presence ──────────────────────────────────────────────────

  useEffect(() => {
    if (!username) return

    supabase.from('messages').select('*').eq('room_id', textRoom)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data) })

    const msgChannel = supabase.channel(`messages-${textRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${textRoom}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]) })
      .subscribe()

    const presenceChannel = supabase.channel(`presence-${textRoom}`)
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.values(state).flat().map((p) => (p as unknown as { username: string }).username).filter(Boolean)
        setOnlineUsers([...new Set(users)])
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ username })
      })

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [textRoom, username, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Müzik Kuyruğu ───────────────────────────────────────────────────────

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

  // ── music_state Subscription ─────────────────────────────────────────────

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

  // ── Ekran Paylaşımı Video Bağlantısı ────────────────────────────────────

  useEffect(() => {
    if (!screenTrack || !screenVideoRef.current) return
    const stream = new MediaStream([screenTrack])
    screenVideoRef.current.srcObject = stream
  }, [screenTrack])

  // ── YouTube IFrame API ──────────────────────────────────────────────────

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

  // ── Player başlat / değiştir ─────────────────────────────────────────────

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

  // ── Sesli Sohbet ─────────────────────────────────────────────────────────

  const joinVoice = async (targetRoom: string) => {
    if (isInVoice && voiceRoom === targetRoom) { leaveVoice(); return }
    try {
      const res = await fetch(`/api/livekit-token?room=${targetRoom}&username=${username}`)
      const { token } = await res.json()

      const { data: queueData } = await supabase
        .from('queue').select('*')
        .eq('room_id', targetRoom)
        .order('added_at', { ascending: true })

      const { data: musicState } = await supabase
        .from('music_state')
        .select('*')
        .eq('room_id', targetRoom)
        .maybeSingle()

      if (queueData) {
        setQueue(queueData as QueueItem[])
        queueRef.current = queueData as QueueItem[]
        const queueStartedAt = queueData[0]?.started_at ?? null
        startedAtRef.current = queueStartedAt ?? musicState?.started_at ?? null
      }

      let becomeHost = false
      if (!musicState || !musicState.host_username) {
        await supabase.from('music_state').upsert({
          room_id: targetRoom,
          host_username: username,
          is_playing: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' })
        becomeHost = true
        initialIsPlayingRef.current = true
        setHostUsername(username)
      } else {
        initialIsPlayingRef.current = musicState.is_playing ?? true
        setHostUsername(musicState.host_username)
      }

      isHostRef.current = becomeHost
      setIsHost(becomeHost)

      await supabase.from('voice_presence').upsert(
        { room_id: targetRoom, username, joined_at: new Date().toISOString() },
        { onConflict: 'room_id,username' }
      )

      setLiveKitToken(token)
      setVoiceRoom(targetRoom)
      setIsInVoice(true)
      setSidebarOpen(false)
    } catch {
      alert('Ses kanalına bağlanılamadı')
    }
  }

  const leaveVoice = async () => {
    if (voiceRoom && username) {
      await supabase.from('voice_presence')
        .delete()
        .eq('room_id', voiceRoom)
        .eq('username', username)
    }

    if (isHostRef.current && voiceRoom) {
      const others = voiceParticipantsRef.current.filter(p => p !== username)
      const nextHost = others[0] || null
      await supabase.from('music_state').upsert({
        room_id: voiceRoom,
        host_username: nextHost,
        is_playing: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' })
    }

    setIsHost(false)
    isHostRef.current = false
    setHostUsername('')
    setIsInVoice(false)
    setLiveKitToken('')
    setVoiceRoom('')
    setSpeaking(new Set())
    setVoiceParticipants([])
    setQueue([])
    setScreenTrack(null)
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim()) return
    await supabase.from('messages').insert({ room_id: textRoom, username, content: input.trim() })
    setInput('')
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Müzik Fonksiyonları ──────────────────────────────────────────────────

  const extractVideoId = (url: string): string | null => {
    const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?&]+)/, /embed\/([^?&]+)/, /shorts\/([^?&]+)/]
    for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
    return null
  }

  const addToQueue = async () => {
    if (!voiceRoom) return
    const url = queueInput.trim()
    if (!url) return
    const videoId = extractVideoId(url)
    if (!videoId) { alert('Geçersiz YouTube linki'); return }
    let title: string
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      if (!res.ok) { alert('Video bulunamadı veya erişilemiyor.'); return }
      const data = await res.json()
      title = data.title
    } catch {
      alert('Video bilgisi alınamadı. Bağlantınızı kontrol edin.')
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
    if (error) { alert('Kuyruğa eklenemedi: ' + error.message); return }

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
    if (error) alert('Silinemedi: ' + error.message)
    else refetchQueue()
  }

  const handleNext = async () => {
    if (!isHostRef.current) return
    const [first, ...rest] = queueRef.current
    if (!first) return
    await supabase.from('queue').delete().eq('id', first.id)
    const nextStartedAt = new Date().toISOString()
    if (rest[0]) {
      await supabase.from('queue')
        .update({ started_at: nextStartedAt })
        .eq('id', rest[0].id)
        .is('started_at', null)
    }
    if (voiceRoom) {
      await supabase.from('music_state').upsert({
        room_id: voiceRoom,
        current_video_id: rest[0]?.video_id ?? null,
        started_at: rest[0] ? nextStartedAt : null,
        is_playing: !!rest[0],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' })
    }
  }

  const togglePlay = async () => {
    if (!isHostRef.current || !playerRef.current) return
    const newPlaying = !isPlaying
    if (newPlaying) { playerRef.current.playVideo() } else { playerRef.current.pauseVideo() }
    if (voiceRoom) {
      await supabase.from('music_state').upsert({
        room_id: voiceRoom,
        is_playing: newPlaying,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id' })
    }
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (playerRef.current) playerRef.current.setVolume(v)
  }

  // ── JSX ──────────────────────────────────────────────────────────────────
  const mergedUsers = [...new Set([...onlineUsers, ...voiceParticipants])]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#080808', color: '#f0f0f0' }}>

      {/* Gizli YouTube player */}
      <div id="yt-player-container" style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <div id="yt-player" />
      </div>

      {/* Mobil overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sol Sidebar ─────────────────────────────────────────────────── */}
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

        {/* Kanal listesi */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>

          {/* Metin kanalları */}
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
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => switchTextRoom(r.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  height: 32,
                  padding: '0 10px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: r.id === textRoom ? '#3ecf8e' : '#888',
                  backgroundColor: r.id === textRoom ? 'rgba(62,207,142,0.12)' : 'transparent',
                  transition: 'background-color 150ms ease',
                  cursor: 'pointer',
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => { if (r.id !== textRoom) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
                onMouseLeave={(e) => { if (r.id !== textRoom) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <span style={{ color: r.id === textRoom ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                  <IconHash />
                </span>
                <span>{r.name}</span>
              </button>
            ))}
          </div>

          {/* Ses kanalları */}
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
                  <button
                    onClick={() => joinVoice(r.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      height: 32,
                      padding: '0 14px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: isActiveVoice ? '#3ecf8e' : '#888',
                      backgroundColor: isActiveVoice ? 'rgba(62,207,142,0.12)' : 'transparent',
                      transition: 'background-color 150ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!isActiveVoice) e.currentTarget.style.backgroundColor = '#1c1c1c' }}
                    onMouseLeave={(e) => { if (!isActiveVoice) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <span style={{ color: isActiveVoice ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                      <IconVolume />
                    </span>
                    <span>{r.name}</span>
                    {isActiveVoice && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <div key={i} style={{
                            width: 2, borderRadius: 1,
                            backgroundColor: '#3ecf8e',
                            height: '100%',
                            animation: 'soundWave 0.6s ease-in-out infinite',
                            animationDelay: `${d}s`,
                          }} />
                        ))}
                      </div>
                    )}
                  </button>

                  {isActiveVoice && voiceParticipants.length > 0 && (
                    <div style={{ paddingLeft: 24, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {voiceParticipants.map((user) => {
                        const isSpeaking = speaking.has(user)
                        const isMe = user === username
                        const isVoiceHost = user === hostUsername
                        return (
                          <div
                            key={user}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: isSpeaking ? 'rgba(62,207,142,0.08)' : 'transparent',
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
                              backgroundColor: getUserColor(user),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 8, color: '#080808', fontWeight: 600, flexShrink: 0,
                              boxShadow: isSpeaking ? '0 0 0 2px #3ecf8e' : 'none',
                              transition: 'box-shadow 150ms ease',
                            }}>
                              {user[0]?.toUpperCase()}
                            </div>
                            <span style={{
                              fontSize: 11,
                              color: isSpeaking ? '#f0f0f0' : '#888',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}>
                              {user}{isMe ? ' (sen)' : ''}
                            </span>
                            {isVoiceHost && (
                              <span style={{ color: '#f59e0b', flexShrink: 0, display: 'flex' }} title="Müzik Hostu">
                                <IconCrown />
                              </span>
                            )}
                            {isSpeaking && (
                              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10, flexShrink: 0 }}>
                                {[0, 0.15, 0.3].map((d, i) => (
                                  <div key={i} style={{
                                    width: 2, borderRadius: 1,
                                    backgroundColor: '#3ecf8e',
                                    height: '100%',
                                    animation: 'soundWave 0.5s ease-in-out infinite',
                                    animationDelay: `${d}s`,
                                  }} />
                                ))}
                              </div>
                            )}
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

        {/* LiveKit ses bağlantısı */}
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
            <VoiceControls onLeave={leaveVoice} />
          </LiveKitRoom>
        )}

        {/* Kullanıcı alanı */}
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
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              backgroundColor: getUserColor(username),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#080808', fontWeight: 600, flexShrink: 0,
            }}>
              {username[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </span>
            {isHost && (
              <span style={{ color: '#f59e0b', flexShrink: 0, display: 'flex' }} title="Müzik Hostu">
                <IconCrown />
              </span>
            )}
          </div>
          <button
            onClick={() => { localStorage.removeItem('username'); router.push('/') }}
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#888',
              transition: 'background-color 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            title="Çıkış"
          >
            <IconLogOut />
          </button>
        </div>
      </div>

      {/* ── Orta — Chat ──────────────────────────────────────────────────── */}
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
          <button
            className="md:hidden"
            style={{
              width: 32, height: 32, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#888',
              transition: 'background-color 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            onClick={() => setSidebarOpen(true)}
          >
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

        {/* Müzik çalar barı */}
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

        {/* Ekran paylaşımı */}
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

        {/* Mesajlar */}
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

        {/* Input */}
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

      {/* ── Sağ Sidebar ──────────────────────────────────────────────────── */}
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

      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .yt-volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          outline: none;
        }
        .yt-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3ecf8e;
          cursor: pointer;
        }
        .yt-volume-slider::-moz-range-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3ecf8e;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
