'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Modül-level auth store ───────────────────────────────────────────────────

let _authListeners: Array<() => void> = []
const subscribeAuth = (fn: () => void) => {
  _authListeners.push(fn)
  return () => { _authListeners = _authListeners.filter(l => l !== fn) }
}
const notifyAuth = () => _authListeners.forEach(fn => fn())

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ROOMS = [
  { id: 'genel', name: 'genel' },
  { id: 'muzik', name: 'müzik' },
  { id: 'oyun', name: 'oyun' },
]

const USER_COLORS = ['#3ecf8e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

function getUserColor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ─── SVG İkonlar ─────────────────────────────────────────────────────────────

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

const IconLogOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function Home() {
  const storedUsername = useSyncExternalStore(
    subscribeAuth,
    () => localStorage.getItem('username') || '',
    () => ''
  )
  const loggedIn = !!storedUsername

  const [inputUsername, setInputUsername] = useState('')
  const [voicePresence, setVoicePresence] = useState<Record<string, string[]>>({})
  const router = useRouter()

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
    notifyAuth()
  }

  const handleLogout = () => {
    localStorage.removeItem('username')
    setInputUsername('')
    notifyAuth()
  }

  // ─── Giriş ekranı ─────────────────────────────────────────────────────────

  if (!loggedIn) return (
    <main style={{
      backgroundColor: '#080808',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

        {/* Giriş kartı */}
        <div style={{
          backgroundColor: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: 32,
          width: 280,
          boxSizing: 'border-box',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#f0f0f0', margin: 0, lineHeight: 1 }}>
              Harmonix
            </h1>
            <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>
              Devam etmek için kullanıcı adı gir
            </p>
          </div>

          <input
            style={{
              display: 'block',
              width: '100%',
              height: 36,
              fontSize: 13,
              backgroundColor: '#161616',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              color: '#f0f0f0',
              padding: '0 10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
              marginBottom: 8,
            }}
            placeholder="Kullanıcı adın"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3ecf8e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />

          <button
            onClick={handleLogin}
            style={{
              display: 'block',
              width: '100%',
              height: 36,
              backgroundColor: '#3ecf8e',
              color: '#080808',
              fontWeight: 500,
              fontSize: 13,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Giriş Yap
          </button>
        </div>

        {/* Odalar paneli */}
        <div style={{ width: 200, paddingTop: 4 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: '#444',
            textTransform: 'uppercase',
            margin: '0 0 6px 0',
            padding: '0 6px',
          }}>
            Sesli Odalar
          </p>
          {ROOMS.map(r => {
            const users = voicePresence[r.id] || []
            return (
              <div
                key={r.id}
                style={{
                  borderRadius: 6,
                  padding: '5px 8px',
                  transition: 'background-color 150ms ease',
                  cursor: 'default',
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: users.length > 0 ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                    <IconVolume />
                  </span>
                  <span style={{ fontSize: 13, color: users.length > 0 ? '#f0f0f0' : '#888' }}>
                    {r.name}
                  </span>
                  {users.length > 0 && (
                    <span style={{ fontSize: 10, color: '#3ecf8e', marginLeft: 'auto' }}>
                      {users.length}
                    </span>
                  )}
                </div>
                {users.length > 0 && (
                  <div style={{ paddingLeft: 20, marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {users.slice(0, 5).map(u => (
                      <div
                        key={u}
                        style={{
                          width: 16, height: 16, borderRadius: '50%',
                          backgroundColor: getUserColor(u),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, color: '#080808', fontWeight: 600,
                          flexShrink: 0,
                        }}
                        title={u}
                      >
                        {u[0]?.toUpperCase()}
                      </div>
                    ))}
                    {users.length > 5 && (
                      <span style={{ fontSize: 10, color: '#888', lineHeight: '16px' }}>
                        +{users.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )

  // ─── Ana ekran (giriş yapılmış) ────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#080808', color: '#f0f0f0', overflow: 'hidden' }}>

      {/* Sol sidebar */}
      <div style={{
        width: 224,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f0f0f',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>

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
            {ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/room/${room.id}`)}
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
                  color: '#888',
                  backgroundColor: 'transparent',
                  transition: 'background-color 150ms ease',
                  cursor: 'pointer',
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <span style={{ color: '#444', display: 'flex', flexShrink: 0 }}><IconHash /></span>
                <span>{room.name}</span>
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
            {ROOMS.map((room) => {
              const participants = voicePresence[room.id] || []
              const hasParticipants = participants.length > 0
              return (
                <div key={room.id} style={{ marginBottom: 2 }}>
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
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
                      color: hasParticipants ? '#f0f0f0' : '#888',
                      backgroundColor: 'transparent',
                      transition: 'background-color 150ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c1c1c' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <span style={{ color: hasParticipants ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                      <IconVolume />
                    </span>
                    <span>{room.name}</span>
                    {hasParticipants && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 20,
                        backgroundColor: 'rgba(62,207,142,0.12)',
                        color: '#3ecf8e',
                        flexShrink: 0,
                      }}>
                        {participants.length}
                      </span>
                    )}
                  </button>

                  {hasParticipants && (
                    <div style={{ paddingLeft: 24, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {participants.map(user => (
                        <div key={user} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            backgroundColor: getUserColor(user),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, color: '#080808', fontWeight: 600, flexShrink: 0,
                          }}>
                            {user[0]?.toUpperCase()}
                          </div>
                          <span style={{
                            fontSize: 11,
                            color: '#888',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
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
              backgroundColor: getUserColor(storedUsername),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#080808', fontWeight: 600, flexShrink: 0,
            }}>
              {storedUsername[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {storedUsername}
            </span>
          </div>
          <button
            onClick={handleLogout}
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

      {/* Boş içerik alanı */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#444', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <IconArrowLeft />
          </div>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Bir kanal seç</p>
        </div>
      </div>

    </div>
  )
}
