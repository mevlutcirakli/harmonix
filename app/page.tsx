'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROOMS = [
  { id: 'genel', name: 'genel', emoji: '💬' },
  { id: 'muzik', name: 'müzik', emoji: '🎵' },
  { id: 'oyun', name: 'oyun', emoji: '🎮' },
]

export default function Home() {
  const [username, setUsername] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('username')
    if (saved) { setUsername(saved); setLoggedIn(true) }
  }, [])

  const handleLogin = () => {
    if (!username.trim()) return alert('Bir isim gir!')
    localStorage.setItem('username', username.trim())
    setLoggedIn(true)
  }

  if (!loggedIn) return (
    <main style={{ backgroundColor: '#0a0a0a' }} className="min-h-screen flex items-center justify-center">
      <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }} className="p-8 rounded-xl w-96">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">🎵 Harmonix</h1>
          <p style={{ color: '#a1a1a1' }} className="text-sm">Devam etmek için bir kullanıcı adı gir</p>
        </div>
        <input
          className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none mb-3 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Kullanıcı adın"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
        <div className="flex-1 px-2 py-3">
          <p className="text-xs font-semibold uppercase px-2 mb-2" style={{ color: '#a1a1a1' }}>Odalar</p>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2 text-sm transition-all duration-200 hover:bg-white/5"
              style={{ color: '#a1a1a1' }}
            >
              <span style={{ color: '#a1a1a1' }}>#</span>
              <span>{room.name}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#3ecf8e', color: '#0a0a0a' }}>
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm truncate text-white">{username}</span>
          </div>
          <button
            onClick={() => { localStorage.removeItem('username'); setLoggedIn(false); setUsername('') }}
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