'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useLocalParticipant,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { RoomEvent } from 'livekit-client'

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

const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const IconMicOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 4.9"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

const IconCameraOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M16 16H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3"/>
    <polygon points="23 7 16 12 23 17 23 7"/>
  </svg>
)

const IconScreen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <polyline points="15 9 12 6 9 9"/>
    <line x1="12" y1="6" x2="12" y2="13"/>
  </svg>
)

const IconPhoneOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Ses Kontrolleri (LiveKitRoom içinde) ────────────────────────────────────

function VoiceControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const [muted, setMuted] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screen, setScreen] = useState(false)

  const toggleMic = async () => { await localParticipant.setMicrophoneEnabled(muted); setMuted(!muted) }
  const toggleCamera = async () => { await localParticipant.setCameraEnabled(!camera); setCamera(!camera) }
  const toggleScreen = async () => { await localParticipant.setScreenShareEnabled(!screen); setScreen(!screen) }

  return (
    <div
      className="px-2 py-2 flex items-center gap-1 flex-shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#111111' }}
    >
      <button onClick={toggleMic} title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/10"
        style={{ color: muted ? '#ef4444' : '#ededed' }}>
        {muted ? <IconMicOff /> : <IconMic />}
      </button>
      <button onClick={toggleCamera} title={camera ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/10"
        style={{ color: camera ? '#3ecf8e' : '#a1a1a1' }}>
        {camera ? <IconCamera /> : <IconCameraOff />}
      </button>
      <button onClick={toggleScreen} title={screen ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/10"
        style={{ color: screen ? '#3ecf8e' : '#a1a1a1' }}>
        <IconScreen />
      </button>
      <div className="w-px h-5 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      <button onClick={onLeave} title="Kanaldan Ayrıl"
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-500/20"
        style={{ color: '#ef4444' }}>
        <IconPhoneOff />
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
    room.on(RoomEvent.ActiveSpeakersChanged, handler)
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, handler) }
  }, [room, onSpeakersChange])
  return null
}

function VoiceParticipantListener({ onParticipantsChange }: { onParticipantsChange: (p: string[]) => void }) {
  const room = useRoomContext()
  const cb = useCallback(() => {
    if (!room) return
    const all = [...room.remoteParticipants.values()].map(p => p.identity)
    if (room.localParticipant?.identity) all.push(room.localParticipant.identity)
    onParticipantsChange(all)
  }, [room, onParticipantsChange])
  useEffect(() => {
    if (!room) return
    cb()
    room.on(RoomEvent.ParticipantConnected, cb)
    room.on(RoomEvent.ParticipantDisconnected, cb)
    return () => {
      room.off(RoomEvent.ParticipantConnected, cb)
      room.off(RoomEvent.ParticipantDisconnected, cb)
    }
  }, [room, cb])
  return null
}

// ─── Sağ Sidebar — Online Kullanıcılar ───────────────────────────────────────

function UsersPanel({ users, speaking, currentUser }: {
  users: string[]
  speaking: Set<string>
  currentUser: string
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-semibold uppercase" style={{ color: '#a1a1a1' }}>
          Bu Odada — {users.length} kişi
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {users.length === 0 ? (
          <p className="text-xs text-center mt-4" style={{ color: '#a1a1a1' }}>Kimse yok</p>
        ) : (
          users.map((user) => {
            const isSpeaking = speaking.has(user)
            const isMe = user === currentUser
            return (
              <div key={user}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 transition-all duration-200"
                style={{ backgroundColor: isSpeaking ? 'rgba(62,207,142,0.08)' : 'transparent' }}>
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                    style={{ backgroundColor: getUserColor(user), color: '#0a0a0a', boxShadow: isSpeaking ? '0 0 0 2px #3ecf8e' : 'none' }}>
                    {user[0]?.toUpperCase()}
                  </div>
                  {isSpeaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{ backgroundColor: '#3ecf8e', borderColor: '#111111', animation: 'pulse 1s infinite' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs truncate text-white">{user}</span>
                    {isMe && (
                      <span className="text-xs px-1 rounded flex-shrink-0"
                        style={{ backgroundColor: 'rgba(62,207,142,0.2)', color: '#3ecf8e', fontSize: '10px' }}>
                        sen
                      </span>
                    )}
                  </div>
                  {isSpeaking && (
                    <div className="flex items-end gap-0.5 mt-0.5 h-2.5">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <div key={i} className="w-0.5 rounded-full"
                          style={{ backgroundColor: '#3ecf8e', height: '100%', animation: 'soundWave 0.5s ease-in-out infinite', animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                  )}
                </div>
                {isSpeaking && <span className="text-xs flex-shrink-0">🎙️</span>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Müzik Çalar Barı ────────────────────────────────────────────────────────

function MusicPlayerBar({ song, isPlaying, volume, onTogglePlay, onNext, onPrev, onVolumeChange }: {
  song: QueueItem
  isPlaying: boolean
  volume: number
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onVolumeChange: (v: number) => void
}) {
  return (
    <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
      style={{ backgroundColor: '#161616', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <img src={song.thumbnail} alt={song.title}
        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate">{song.title}</div>
        <div className="text-xs truncate" style={{ color: '#555' }}>Ekleyen: {song.added_by}</div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={onPrev} title="Önceki"
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: '#a1a1a1' }}>
          <IconSkipBack />
        </button>
        <button onClick={onTogglePlay} title={isPlaying ? 'Duraklat' : 'Oynat'}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: '#ededed' }}>
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button onClick={onNext} title="Sonraki"
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: '#a1a1a1' }}>
          <IconSkipForward />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 90 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#555', flexShrink: 0 }}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        </svg>
        <input type="range" min="0" max="100" value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="yt-volume-slider flex-1" style={{ cursor: 'pointer' }} />
      </div>
      <a href={`https://www.youtube.com/watch?v=${song.video_id}`} target="_blank" rel="noopener noreferrer"
        title="YouTube'da aç" className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: '#ff0000' }}>
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
    <div className="flex flex-col flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-3 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-semibold uppercase mb-2 flex items-center gap-1.5" style={{ color: '#a1a1a1' }}>
          <span style={{ color: '#3ecf8e' }}><IconMusic /></span> Kuyruk
        </p>
        <div className="flex gap-1">
          <input
            className="flex-1 min-w-0 text-xs outline-none px-2 py-1.5 rounded-lg"
            style={{ backgroundColor: '#1a1a1a', color: '#ededed', border: '1px solid rgba(255,255,255,0.08)' }}
            placeholder="YouTube linki yapıştır..."
            value={queueInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <button onClick={onAdd} disabled={!queueInput.trim()}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors"
            style={{
              backgroundColor: queueInput.trim() ? 'rgba(62,207,142,0.15)' : '#1a1a1a',
              color: queueInput.trim() ? '#3ecf8e' : '#555',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            +
          </button>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
        {queue.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#555' }}>Kuyruk boş</p>
        ) : (
          queue.map((item, idx) => {
            const isActive = idx === 0
            return (
              <div key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 group transition-colors"
                style={{
                  backgroundColor: isActive ? 'rgba(62,207,142,0.06)' : 'transparent',
                  borderLeft: isActive ? '2px solid #3ecf8e' : '2px solid transparent',
                }}>
                <img src={item.thumbnail} alt={item.title}
                  style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate leading-tight">{item.title}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getUserColor(item.added_by), fontSize: '7px', color: '#0a0a0a', fontWeight: 700 }}
                      title={item.added_by}>
                      {item.added_by[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs truncate" style={{ color: '#555', fontSize: '10px' }}>{item.added_by}</span>
                  </div>
                </div>
                <button onClick={() => onRemove(item.id)}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-base leading-none opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: '#ef4444' }} title="Sil">
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

  // textRoom: hangi metin kanalını görüntülediğimiz (navigasyon yok, state)
  const [textRoom, setTextRoom] = useState(room)
  const textRoomData = ROOMS.find(r => r.id === textRoom)
  const textRoomName = textRoomData?.name || textRoom

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [username] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '')
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Voice state — voiceRoom, textRoom'dan bağımsız
  const [voiceRoom, setVoiceRoom] = useState('')
  const [liveKitToken, setLiveKitToken] = useState('')
  const [isInVoice, setIsInVoice] = useState(false)
  const [speaking, setSpeaking] = useState<Set<string>>(new Set())
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([])
  

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

  const currentSong = queue[0] ?? null
  const currentVideoId = currentSong?.video_id ?? null
  const startedAtRef = useRef<string | null>(null)

  // ── Metin kanalı değişince mesajları sıfırla ───────────────────────────────

  const switchTextRoom = (id: string) => {
    setTextRoom(id)
    setMessages([])
  }

  // ── Mesajlar + Presence ──────────────────────────────────────────────────

  useEffect(() => {
    if (!username) { router.push('/'); return }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, refetchQueue)
      .subscribe()

    return () => { supabase.removeChannel(queueChannel) }
}, [voiceRoom, username, refetchQueue])

  // ── YouTube IFrame API ──────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) return  // lazy initializer already set ytReady=true
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
  const capturedStartedAt = startedAtRef.current   // ← ref'ten oku

  const p = new window.YT.Player('yt-player', {
    height: '1',
    width: '1',
    videoId: currentVideoId,
    playerVars: { autoplay: 1, controls: 0 },
    events: {
      onReady: (e: { target: YTPlayerInstance }) => {
        e.target.setVolume(volume)
        if (capturedStartedAt) {
          const elapsed = Math.floor(
            (Date.now() - new Date(capturedStartedAt).getTime()) / 1000
          )
          if (elapsed > 0 && elapsed < 3600) e.target.seekTo(elapsed, true)
        } else if (capturedId) {
          supabase.from('queue')
            .update({ started_at: new Date().toISOString() })
            .eq('id', capturedId)
            .is('started_at', null)
            .then()
        }
        e.target.playVideo()
        setIsPlaying(true)
      },
      onStateChange: (e: { target: YTPlayerInstance; data: number }) => {
        if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true)
        if (e.data === window.YT.PlayerState.PAUSED) setIsPlaying(false)
        if (e.data === window.YT.PlayerState.ENDED) {
          const [first, ...rest] = queueRef.current
          if (first) {
            supabase.from('queue').delete().eq('id', first.id).then(() => {
              if (rest[0]) {
                supabase.from('queue')
                  .update({ started_at: new Date().toISOString() })
                  .eq('id', rest[0].id)
                  .is('started_at', null)
                  .then()
              }
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
    
    if (queueData) {
      setQueue(queueData as QueueItem[])
      queueRef.current = queueData as QueueItem[]           // ← ref'i hemen güncelle
      startedAtRef.current = queueData[0]?.started_at ?? null  // ← ref'i hemen güncelle
    }

    setLiveKitToken(token)
    setVoiceRoom(targetRoom)
    setIsInVoice(true)
  } catch {
    alert('Ses kanalına bağlanılamadı')
  }
}

  const leaveVoice = () => {
    setIsInVoice(false)
    setLiveKitToken('')
    setVoiceRoom('')
    setSpeaking(new Set())
    setVoiceParticipants([])
    setQueue([])
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
    const { error } = await supabase.from('queue').insert({
      room_id: voiceRoom, video_id: videoId, title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      added_by: username,
      started_at: isFirstSong ? new Date().toISOString() : null,
    })
    if (error) { alert('Kuyruğa eklenemedi: ' + error.message); return }
    setQueueInput('')
    refetchQueue()
  }

  const removeFromQueue = async (id: string) => {
    const { error } = await supabase.from('queue').delete().eq('id', id)
    if (error) alert('Silinemedi: ' + error.message)
    else refetchQueue() 
  }

  const handleNext = async () => {
    const [first, ...rest] = queueRef.current
    if (!first) return
    await supabase.from('queue').delete().eq('id', first.id)
    if (rest[0]) {
      await supabase.from('queue')
        .update({ started_at: new Date().toISOString() })
        .eq('id', rest[0].id)
        .is('started_at', null)
    }
  }

  const togglePlay = () => {
    if (!playerRef.current) return
    if (isPlaying) { playerRef.current.pauseVideo() } else { playerRef.current.playVideo() }
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (playerRef.current) playerRef.current.setVolume(v)
  }

  // ── JSX ──────────────────────────────────────────────────────────────────
const mergedUsers = [...new Set([...onlineUsers, ...voiceParticipants])]

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a', color: '#ededed' }}>

      {/* Gizli YouTube player container */}
      <div id="yt-player-container" style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <div id="yt-player" />
      </div>

      {/* ── Sol Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-60 flex flex-col flex-shrink-0" style={{ backgroundColor: '#111111', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h1 className="font-bold text-white text-base flex items-center gap-2">
            <span style={{ color: '#3ecf8e' }}><IconMusic /></span>
            Harmonix
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">

          {/* Metin kanalları */}
          <div>
            <p className="text-xs font-semibold uppercase px-2 mb-1" style={{ color: '#a1a1a1' }}>Kanallar</p>
            {ROOMS.map((r) => (
              <button key={r.id} onClick={() => switchTextRoom(r.id)}
                className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-200"
                style={{
                  backgroundColor: r.id === textRoom ? 'rgba(62,207,142,0.1)' : 'transparent',
                  color: r.id === textRoom ? '#3ecf8e' : '#a1a1a1',
                }}
                onMouseEnter={(e) => { if (r.id !== textRoom) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (r.id !== textRoom) e.currentTarget.style.backgroundColor = 'transparent' }}>
                <span style={{ color: r.id === textRoom ? '#3ecf8e' : '#555' }}><IconHash /></span>
                <span>{r.name}</span>
              </button>
            ))}
          </div>

          {/* Ses kanalları — textRoom'dan bağımsız */}
          <div>
            <p className="text-xs font-semibold uppercase px-2 mb-1" style={{ color: '#a1a1a1' }}>Ses</p>
            {ROOMS.map((r) => {
              const isActiveVoice = voiceRoom === r.id && isInVoice
              return (
                <div key={r.id}>
                  <button
                    onClick={() => joinVoice(r.id)}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-200"
                    style={{
                      backgroundColor: isActiveVoice ? 'rgba(62,207,142,0.1)' : 'transparent',
                      color: isActiveVoice ? '#3ecf8e' : '#a1a1a1',
                    }}
                    onMouseEnter={(e) => { if (!isActiveVoice) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { if (!isActiveVoice) e.currentTarget.style.backgroundColor = 'transparent' }}>
                    <span style={{ color: isActiveVoice ? '#3ecf8e' : '#555' }}><IconVolume /></span>
                    <span>{r.name}</span>
                    {isActiveVoice && (
                      <div className="ml-auto flex gap-0.5 items-end h-2.5">
                        {[0, 0.2, 0.4].map((d, i) => (
                          <div key={i} className="w-0.5 rounded-full"
                            style={{ backgroundColor: '#3ecf8e', height: '100%', animation: 'soundWave 0.6s ease-in-out infinite', animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    )}
                  </button>

                  {isActiveVoice && voiceParticipants.length > 0 && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                      {voiceParticipants.map((user) => {
                        const isSpeaking = speaking.has(user)
                        const isMe = user === username
                        return (
                          <div key={user}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200"
                            style={{ backgroundColor: isSpeaking ? 'rgba(62,207,142,0.08)' : 'transparent' }}>
                            <div className="relative flex-shrink-0">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                                style={{ backgroundColor: getUserColor(user), color: '#0a0a0a', fontSize: '10px', boxShadow: isSpeaking ? '0 0 0 2px #3ecf8e' : 'none' }}>
                                {user[0]?.toUpperCase()}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                                style={{ backgroundColor: '#3ecf8e', borderColor: '#111111' }} />
                            </div>
                            <span className="text-xs truncate flex-1" style={{ color: isSpeaking ? '#ededed' : '#a1a1a1' }}>
                              {user}{isMe ? ' (sen)' : ''}
                            </span>
                            {isSpeaking && (
                              <div className="flex gap-0.5 items-end h-2.5 flex-shrink-0">
                                {[0, 0.15, 0.3].map((d, i) => (
                                  <div key={i} className="w-0.5 rounded-full"
                                    style={{ backgroundColor: '#3ecf8e', height: '100%', animation: 'soundWave 0.5s ease-in-out infinite', animationDelay: `${d}s` }} />
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

        {isInVoice && liveKitToken && (
          <LiveKitRoom audio={true} token={liveKitToken} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true} style={{ display: 'contents' }}>
            <SpeakerListener onSpeakersChange={setSpeaking} />
            <VoiceParticipantListener onParticipantsChange={setVoiceParticipants} />
            <VoiceControls onLeave={leaveVoice} />
          </LiveKitRoom>
        )}

        <div className="px-3 py-3 flex items-center justify-between flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: getUserColor(username), color: '#0a0a0a' }}>
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm truncate text-white">{username}</span>
          </div>
          <button onClick={() => { localStorage.removeItem('username'); router.push('/') }}
            className="text-xs px-2 py-1 rounded transition-all duration-200 hover:bg-white/10"
            style={{ color: '#a1a1a1' }} />
        </div>
      </div>

      {/* ── Orta — Chat ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#555' }}><IconHash /></span>
          <h2 className="font-semibold text-white text-sm">{textRoomName}</h2>
          {isInVoice && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: 'rgba(62,207,142,0.12)', color: '#3ecf8e' }}>
              <IconVolume /> {ROOMS.find(r => r.id === voiceRoom)?.name} sesinde
            </span>
          )}
          <span className="ml-auto text-xs" style={{ color: '#a1a1a1' }}>{onlineUsers.length} çevrimiçi</span>
        </div>

        {/* Müzik çalar barı — sadece ses kanalındayken */}
        {isInVoice && currentSong && (
          <MusicPlayerBar
            song={currentSong}
            isPlaying={isPlaying}
            volume={volume}
            onTogglePlay={togglePlay}
            onNext={handleNext}
            onPrev={() => {}}
            onVolumeChange={handleVolumeChange}
          />
        )}

        {/* Mesajlar */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
          {messages.length === 0 && (
            <p className="text-center text-sm mt-8" style={{ color: '#a1a1a1' }}>
              Henüz mesaj yok. İlk mesajı sen at! 💬
            </p>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.username === username
            const prevMsg = messages[i - 1]
            const showHeader = !prevMsg || prevMsg.username !== msg.username
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showHeader && i > 0 ? 'mt-3' : ''}`}>
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-sm`}>
                  {showHeader && (
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-medium" style={{ color: getUserColor(msg.username) }}>{msg.username}</span>
                      <span className="text-xs" style={{ color: '#555', fontSize: '10px' }}>{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className="px-3.5 py-2 rounded-xl text-sm leading-relaxed"
                    style={{
                      backgroundColor: isOwn ? '#3ecf8e' : '#1a1a1a',
                      color: isOwn ? '#0a0a0a' : '#ededed',
                      border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)',
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
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <input className="flex-1 bg-transparent text-white text-sm outline-none" style={{ color: '#ededed' }}
              placeholder={`#${textRoomName} kanalına mesaj gönder`}
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} className="text-sm transition-all duration-200 hover:opacity-80 px-1"
              style={{ color: input.trim() ? '#3ecf8e' : '#555' }}>
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* ── Sağ Sidebar — Kuyruk (üst) + Kullanıcılar (alt) ────────────── */}
      <div className="w-64 flex flex-col flex-shrink-0" style={{ backgroundColor: '#111111', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        {isInVoice && (
          <QueuePanel queue={queue} queueInput={queueInput} onInputChange={setQueueInput} onAdd={addToQueue} onRemove={removeFromQueue} />
        )}
        <UsersPanel users={mergedUsers} speaking={speaking} currentUser={username} />
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
          background: rgba(255,255,255,0.15);
          outline: none;
        }
        .yt-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3ecf8e;
          cursor: pointer;
        }
        .yt-volume-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3ecf8e;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
