'use client'

import { getUserColor, formatTime } from '../constants'
import type { Message } from '../types'

interface ChatPanelProps {
  messages: Message[]
  input: string
  onInputChange: (v: string) => void
  onSendMessage: () => void
  bottomRef: React.RefObject<HTMLDivElement | null>
  username: string
}

export default function ChatPanel({
  messages, input, onInputChange, onSendMessage, bottomRef, username,
}: ChatPanelProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center' }}>
              Henüz mesaj yok
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{ padding: '4px 6px', borderRadius: 6, transition: 'background 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: getUserColor(msg.username), flexShrink: 0 }}>
                {msg.username}
                {msg.username === username && (
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400, marginLeft: 3 }}>(sen)</span>
                )}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
        <input
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage() } }}
          placeholder="Mesaj gönder..."
          style={{
            width: '100%', height: 36,
            background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-1)', fontSize: 12, padding: '0 12px',
            transition: 'border-color 150ms ease',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>
    </div>
  )
}
