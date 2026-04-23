'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Modül-level auth store ───────────────────────────────────────────────────
// useEffect + setState olmadan auth state'i yönetmek için.
// notifyAuth() çağrıldığında useSyncExternalStore re-render tetikler.

let _authListeners: Array<() => void> = []
const subscribeAuth = (fn: () => void) => {
  _authListeners.push(fn)
  return () => { _authListeners = _authListeners.filter(l => l !== fn) }
}
const notifyAuth = () => _authListeners.forEach(fn => fn())

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ROOMS = [
  { id: 'genel', name: 'genel', emoji: '💬' },
  { id: 'muzik', name: 'müzik', emoji: '🎵' },
  { id: 'oyun', name: 'oyun', emoji: '🎮' },
]

const USER_COLORS = ['#3ecf8e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

function getUserColor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

const IconVolume = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
)

const IconHash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
)

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function Home() {
  // SSR: '' (server snapshot) → hydration uyumu; client: localStorage değeri
  // setState yok — notifyAuth() ile event-driven re-render
  const storedUsername = useSyncExternalStore(
    subscribeAuth,
    () => localStorage.getItem('username') || '',
    () => ''
  )
  const loggedIn = !!storedUsername

  // Sadece giriş formu input alanı için state
  const [inputUsername, setInputUsername] = useState('')
  const [voicePresence, setVoicePresence] = useState<Record<string, string[]>>({})
  const router = useRouter()

  // Anlık ses kanalı varlığını çek ve subscribe ol
  useEffect(() => {
    const fetchPresence = () => {
      supabase.from('voice_presence').select('room_id, username').then(({ data }) => {
        if (!data) return
        const map: Record<string, string[]> = {}
        for (const row of data) {
          if (!map[row.room_id]) map[row.room_id] = []
          map[row.room_id].push(row.username)
        }
        setVoicePresence(map)
      })
    }

    fetchPresence()

    const channel = supabase.channel('voice-presence-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_presence' }, fetchPresence)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLogin = () => {
    if (!inputUsername.trim()) return alert('Bir isim gir!')
    localStorage.setItem('username', inputUsername.trim())
    notifyAuth() // useSyncExternalStore'u yeni değeri okumaya zorlar
  }

  const handleLogout = () => {
    localStorage.removeItem('username')
    setInputUsername('')
    notifyAuth()
  }

  const activeRooms = ROOMS.filter(r => (voicePresence[r.id] || []).length > 0)

  if (!loggedIn) return (
    <main style={{ backgroundColor: '#0a0a0a' }} className="min-h-screen flex items-center justify-center p-4">
      <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }} className="p-8 rounded-xl w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">🎵 Harmonix</h1>
          <p style={{ color: '#a1a1a1' }} className="text-sm">Devam etmek için bir kullanıcı adı gir</p>
        </div>

        {/* Aktif sesli kanallar — giriş öncesi */}
        {activeRooms.length > 0 && (
          <div className="mb-5 p-3 rounded-xl" style={{ backgroundColor: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.12)' }}>
            <p className="text-xs font-semibold uppercase mb-3 flex items-center gap-1.5" style={{ color: '#3ecf8e' }}>
              <IconVolume /> Şu an sesli
            </p>
            {activeRooms.map(r => {
              const users = voicePresence[r.id] || []
              return (
                <div key={r.id} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-medium" style={{ color: '#ededed' }}>{r.name}</span>
                    <span className="text-xs ml-auto px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(62,207,142,0.15)', color: '#3ecf8e' }}>
                      {users.length} kişi
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {users.slice(0, 5).map(user => (
                      <div key={user}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        title={user}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                          style={{ backgroundColor: getUserColor(user), color: '#0a0a0a', fontSize: '9px' }}>
                          {user[0]?.toUpperCase()}
                        </div>
                        <span style={{ color: '#a1a1a1', fontSize: '11px' }}>{user}</span>
                      </div>
                    ))}
                    {users.length > 5 && (
                      <div className="flex items-center px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#a1a1a1', fontSize: '11px' }}>+{users.length - 5} kişi</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <input
          className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none mb-3 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Kullanıcı adın"
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3ecf8e'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          onClick={handleLogin}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: '#3ecf8e', color: '#0a0a0a' }}
        >
          Giriş Yap
        </button>
      </div>
    </main>
  )

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a', color: '#ededed' }}>
      {/* Sol Sidebar */}
      <div className="w-60 flex flex-col" style={{ backgroundColor: '#111111', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h1 className="font-bold text-white text-base">🎵 Harmonix</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">

          {/* Metin kanalları */}
          <div>
            <p className="text-xs font-semibold uppercase px-2 mb-1" style={{ color: '#a1a1a1' }}>Kanallar</p>
            {ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/room/${room.id}`)}
                className="w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2 text-sm transition-all duration-200 hover:bg-white/5"
                style={{ color: '#a1a1a1' }}
              >
                <span style={{ color: '#555' }}><IconHash /></span>
                <span>{room.name}</span>
              </button>
            ))}
          </div>

          {/* Ses kanalları — anlık katılımcılarla */}
          <div>
            <p className="text-xs font-semibold uppercase px-2 mb-1" style={{ color: '#a1a1a1' }}>Ses</p>
            {ROOMS.map((room) => {
              const participants = voicePresence[room.id] || []
              const hasParticipants = participants.length > 0
              return (
                <div key={room.id} className="mb-0.5">
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-200 hover:bg-white/5"
                    style={{ color: hasParticipants ? '#ededed' : '#a1a1a1' }}
                  >
                    <span style={{ color: hasParticipants ? '#3ecf8e' : '#555' }}><IconVolume /></span>
                    <span>{room.name}</span>
                    {hasParticipants && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'rgba(62,207,142,0.15)', color: '#3ecf8e' }}>
                        {participants.length}
                      </span>
                    )}
                  </button>

                  {hasParticipants && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                      {participants.map(user => (
                        <div key={user} className="flex items-center gap-2 px-2 py-1 rounded-lg">
                          <div className="relative flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                              style={{ backgroundColor: getUserColor(user), color: '#0a0a0a', fontSize: '10px' }}>
                              {user[0]?.toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                              style={{ backgroundColor: '#3ecf8e', borderColor: '#111111' }} />
                          </div>
                          <span className="text-xs truncate" style={{ color: '#a1a1a1' }}>
                            {user}{user === storedUsername ? ' (sen)' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-3 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: getUserColor(storedUsername), color: '#0a0a0a' }}>
              {storedUsername[0]?.toUpperCase()}
            </div>
            <span className="text-sm truncate text-white">{storedUsername}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-2 py-1 rounded transition-all duration-200 hover:bg-white/10"
            style={{ color: '#a1a1a1' }}
            title="Çıkış"
          >
            ↪
          </button>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">👈</p>
          <p className="text-base" style={{ color: '#a1a1a1' }}>Bir oda seç</p>
        </div>
      </div>
    </div>
  )
}
