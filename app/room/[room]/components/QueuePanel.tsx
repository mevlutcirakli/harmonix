'use client'

import Image from 'next/image'
import Avatar from './Avatar'
import { IconMusic } from '../icons'
import type { QueueItem } from '../types'

interface QueuePanelProps {
  queue: QueueItem[]
  queueInput: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export default function QueuePanel({ queue, queueInput, onInputChange, onAdd, onRemove }: QueuePanelProps) {
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
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                backgroundColor: isActive ? 'rgba(62,207,142,0.06)' : 'transparent',
                borderLeft: isActive ? '2px solid #3ecf8e' : '2px solid transparent',
                transition: 'background-color 150ms ease',
              }}>
                <img src={item.thumbnail} alt={item.title}
                  width={32} height={32}
                  style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-truncate" style={{ fontSize: 12, color: '#f0f0f0', lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Avatar username={item.added_by} size="xs" />
                    <span className="text-truncate" style={{ fontSize: 10, color: '#444' }}>{item.added_by}</span>
                  </div>
                </div>
                <button onClick={() => onRemove(item.id)} className="queue-remove-btn" title="Sil">×</button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
