'use client'

import Image from 'next/image'
import { IconSkipBack, IconSkipForward, IconPause, IconPlay, IconYouTube } from '../icons'
import type { QueueItem } from '../types'

interface MusicPlayerBarProps {
  song: QueueItem
  isPlaying: boolean
  volume: number
  isHost: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onVolumeChange: (v: number) => void
}

export default function MusicPlayerBar({
  song,
  isPlaying,
  volume,
  isHost,
  onTogglePlay,
  onNext,
  onPrev,
  onVolumeChange,
}: MusicPlayerBarProps) {
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
        width={32}
        height={32}
        style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
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

      <a href={`https://www.youtube.com/watch?v=${song.video_id}`}
        target="_blank" rel="noopener noreferrer" title="YouTube'da aç"
        className="hidden sm:flex yt-link">
        <IconYouTube />
      </a>
    </div>
  )
}
