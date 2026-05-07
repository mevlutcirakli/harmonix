'use client'

import { IconPlay, IconPause, IconSkipForward, IconVolume, IconVolumeOff, IconX, IconMusic } from '../icons'
import type { QueueItem } from '../types'

interface MusicPanelProps {
  queue: QueueItem[]
  currentSong: QueueItem | null
  volume: number
  isMuted: boolean
  pausedAt: number | null
  queueInput: string
  setQueueInput: (v: string) => void
  isAdding: boolean
  isInVoice: boolean
  onAddToQueue: (input: string) => void
  onTogglePlay: () => void
  onSkip: () => void
  onRemoveFromQueue: (id: string) => void
  onClearQueue: () => void
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
}

export default function MusicPanel({
  queue, currentSong, volume, isMuted, pausedAt,
  queueInput, setQueueInput, isAdding, isInVoice,
  onAddToQueue, onTogglePlay, onSkip, onRemoveFromQueue, onClearQueue,
  onVolumeChange, onToggleMute,
}: MusicPanelProps) {
  const isPlaying = currentSong !== null && pausedAt === null
  const pendingQueue = queue.filter(q => q.started_at === null)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Now playing */}
      <div style={{ flexShrink: 0, padding: '14px 14px 12px', borderBottom: '1px solid var(--border)' }}>
        {currentSong ? (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
              {currentSong.thumbnail && (
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
                }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{currentSong.added_by}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onTogglePlay}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'var(--accent)', color: '#080808',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'transform 100ms',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {isPlaying ? <IconPause size={13} /> : <IconPlay size={13} />}
              </button>

              <button
                onClick={onSkip}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-3)', transition: 'color 150ms', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
              >
                <IconSkipForward size={13} />
              </button>

              <div style={{ flex: 1 }} />

              <button
                onClick={onToggleMute}
                style={{
                  display: 'flex', color: isMuted ? 'var(--red)' : 'var(--text-3)',
                  transition: 'color 150ms', flexShrink: 0,
                }}
              >
                {isMuted ? <IconVolumeOff size={12} /> : <IconVolume size={12} />}
              </button>

              <input
                type="range" min={0} max={100} value={isMuted ? 0 : volume}
                onChange={e => onVolumeChange(Number(e.target.value))}
                style={{ width: 64, accentColor: 'var(--accent)', flexShrink: 0 }}
              />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', padding: '6px 0' }}>
            <IconMusic size={14} />
            <span style={{ fontSize: 12, fontStyle: 'italic' }}>Sıra boş</span>
          </div>
        )}
      </div>

      {/* Queue */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 8px' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-3)',
          }}>
            Sıradakiler
          </span>
          {pendingQueue.length > 0 && (
            <button
              onClick={onClearQueue}
              style={{ fontSize: 10, color: 'var(--text-3)', transition: 'color 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
            >
              Temizle
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '2px 6px' }}>
            Henüz şarkı eklenmedi
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {queue.map(item => {
              const isActive = item.started_at !== null
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 6px', borderRadius: 6,
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'background 150ms', cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--elevated)'
                    const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                    if (btn) btn.style.opacity = '1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                    if (btn) btn.style.opacity = '0'
                  }}
                >
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title}
                      style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-1)',
                      fontWeight: isActive ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{item.added_by}</div>
                  </div>
                  {!isActive && (
                    <button
                      className="del-btn"
                      onClick={() => onRemoveFromQueue(item.id)}
                      style={{
                        display: 'flex', color: 'var(--text-3)',
                        opacity: 0, transition: 'color 150ms, opacity 150ms', flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
                    >
                      <IconX size={11} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add to queue */}
      <div style={{ flexShrink: 0, padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={queueInput}
            onChange={e => setQueueInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAddToQueue(queueInput) }}
            placeholder="YouTube linki..."
            disabled={!isInVoice}
            style={{
              flex: 1, height: 32, background: 'var(--elevated)',
              border: '1px solid var(--border)', borderRadius: 7,
              color: 'var(--text-1)', fontSize: 11, padding: '0 9px',
              opacity: isInVoice ? 1 : 0.4, transition: 'border-color 150ms, opacity 150ms',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <button
            onClick={() => onAddToQueue(queueInput)}
            disabled={isAdding || !isInVoice}
            style={{
              height: 32, padding: '0 10px',
              background: isAdding || !isInVoice ? 'var(--elevated)' : 'var(--accent)',
              color: isAdding || !isInVoice ? 'var(--text-3)' : '#080808',
              borderRadius: 7, fontSize: 11, fontWeight: 600, flexShrink: 0,
              transition: 'background 150ms',
              cursor: isAdding || !isInVoice ? 'not-allowed' : 'pointer',
            }}
          >
            {isAdding
              ? <div className="animate-spin" style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
              : 'Ekle'
            }
          </button>
        </div>
        {!isInVoice && (
          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
            Ses kanalına katıl
          </p>
        )}
      </div>
    </div>
  )
}
