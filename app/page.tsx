'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'

let _listeners: Array<() => void> = []
const subscribe = (fn: () => void) => {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(l => l !== fn) }
}
const notify = () => _listeners.forEach(fn => fn())

export default function Home() {
  const storedUsername = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('username') || '',
    () => ''
  )
  const [input, setInput] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (storedUsername) router.replace('/room/genel')
  }, [storedUsername, router])

  const handleLogin = () => {
    if (!input.trim()) return
    localStorage.setItem('username', input.trim())
    notify()
  }

  if (storedUsername) return null

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent) 0%, #6ee7b7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            marginBottom: 10,
          }}>
            Harmonix
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Devam etmek için kullanıcı adı gir
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            style={{
              width: '100%',
              height: 44,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-1)',
              fontSize: 14,
              padding: '0 14px',
              transition: 'border-color 150ms ease',
            }}
            placeholder="Kullanıcı adın"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
          />

          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              height: 44,
              background: 'var(--accent)',
              color: '#080808',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </main>
  )
}
