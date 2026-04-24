'use client'

import Avatar from './Avatar'
import { IconMusic } from '../icons'
import type { QueueItem } from '../types'
import { isPlaylistUrl, extractVideoId } from '../constants'

interface QueuePanelProps {
  queue: QueueItem[]
  queueInput: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onAddPlaylist: () => void
  onRemove: (id: string) => void
  onClearQueue: () => void
  isAddingPlaylist: boolean
}

export default function QueuePanel({
  queue,
  queueInput,
  onInputChange,
  onAdd,
  onAddPlaylist,
  onRemove,
  onClearQueue,
  isAddingPlaylist,
}: QueuePanelProps) {
  const trimmed = queueInput.trim()
  const isPlaylist = isPlaylistUrl(trimmed)
  const hasVideoId = !!extractVideoId(trimmed)
  // If URL has no video ID but is a playlist → only playlist add makes sense
  const canAddSingle = hasVideoId
  const canAddPlaylist = isPlaylist

  const inputDisabled = isAddingPlaylist

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ padding: '11px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#444',
            textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, margin: 0,
          }}>
            <span style={{ color: '#3ecf8e', display: 'flex' }}><IconMusic /></span>
            Kuyruk
          </p>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Kuyruğu temizle"
              style={{
                fontSize: 10, color: '#555', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
            >
              Temizle
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <input
            style={{
              flex: 1, minWidth: 0, height: 32, fontSize: 12,
              backgroundColor: '#161616',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 6, color: '#f0f0f0', padding: '0 8px', outline: 'none',
              transition: 'border-color 150ms ease',
              opacity: inputDisabled ? 0.5 : 1,
            }}
            placeholder="YouTube linki veya çalma listesi..."
            value={queueInput}
            disabled={inputDisabled}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || inputDisabled) return
              if (isPlaylist && !hasVideoId) { onAddPlaylist(); return }
              onAdd()
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />

          {/* Single video add button — hidden when URL is playlist-only */}
          {(canAddSingle || !trimmed) && (
            <button
              onClick={onAdd}
              disabled={!trimmed || inputDisabled}
              title="Şarkı ekle"
              style={{
                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                backgroundColor: trimmed && !inputDisabled ? 'rgba(62,207,142,0.12)' : '#161616',
                color: trimmed && !inputDisabled ? '#3ecf8e' : '#444',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: trimmed && !inputDisabled ? 'pointer' : 'default',
                transition: 'background-color 150ms ease, color 150ms ease',
              }}
            >
              +
            </button>
          )}

          {/* Playlist add button */}
          {canAddPlaylist && (
            <button
              onClick={onAddPlaylist}
              disabled={inputDisabled}
              title="Tüm listeyi ekle"
              style={{
                height: 32, borderRadius: 6, flexShrink: 0, padding: '0 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, fontSize: 11, fontWeight: 500,
                backgroundColor: inputDisabled ? '#161616' : 'rgba(99,102,241,0.15)',
                color: inputDisabled ? '#444' : '#818cf8',
                border: '1px solid rgba(99,102,241,0.2)',
                cursor: inputDisabled ? 'default' : 'pointer',
                transition: 'background-color 150ms ease, color 150ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {isAddingPlaylist ? '...' : '≡ Liste'}
            </button>
          )}
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
