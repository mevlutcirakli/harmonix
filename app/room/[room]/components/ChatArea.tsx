'use client'

import type { RefObject } from 'react'
import type { Message, QueueItem } from '../types'
import { ROOMS, formatTime, getUserColor } from '../constants'
import {
  IconHash,
  IconVolume,
  IconHamburger,
  IconMonitor,
  IconFullscreen,
  IconExitFullscreen,
  IconSend,
} from '../icons'
import MusicPlayerBar from './MusicPlayerBar'

interface ChatAreaProps {
  textRoomName: string
  voiceRoom: string
  isInVoice: boolean
  onSidebarOpen: () => void
  onlineUsers: string[]
  currentSong: QueueItem | null
  isPlaying: boolean
  volume: number
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onVolumeChange: (v: number) => void
  screenTrack: MediaStreamTrack | null
  screenContainerRef: RefObject<HTMLDivElement | null>
  screenVideoRef: RefObject<HTMLVideoElement | null>
  isFullscreen: boolean
  onToggleFullscreen: () => void
  messages: Message[]
  username: string
  input: string
  onInputChange: (v: string) => void
  onSendMessage: () => void
  bottomRef: RefObject<HTMLDivElement | null>
}

export default function ChatArea({
  textRoomName,
  voiceRoom,
  isInVoice,
  onSidebarOpen,
  onlineUsers,
  currentSong,
  isPlaying,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onVolumeChange,
  screenTrack,
  screenContainerRef,
  screenVideoRef,
  isFullscreen,
  onToggleFullscreen,
  messages,
  username,
  input,
  onInputChange,
  onSendMessage,
  bottomRef,
}: ChatAreaProps) {
  const voiceRoomName = ROOMS.find(r => r.id === voiceRoom)?.name

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

      {/* Header */}
      <div style={{ height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button className="md:hidden icon-btn icon-btn-md icon-btn-ghost" onClick={onSidebarOpen}>
          <IconHamburger />
        </button>

        <span style={{ color: '#444', display: 'flex', flexShrink: 0 }}><IconHash /></span>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0', margin: 0 }}>{textRoomName}</h2>

        {isInVoice && (
          <span
            className="hidden sm:flex"
            style={{ marginLeft: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'rgba(62,207,142,0.12)', color: '#3ecf8e' }}
          >
            <IconVolume />
            {voiceRoomName}
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#444', flexShrink: 0 }}>
          {onlineUsers.length} çevrimiçi
        </span>
      </div>

      {/* Music player bar */}
      {isInVoice && currentSong && (
        <MusicPlayerBar
          song={currentSong}
          isPlaying={isPlaying}
          volume={volume}
          onTogglePlay={onTogglePlay}
          onPrev={onPrev}
          onNext={onNext}
          onVolumeChange={onVolumeChange}
        />
      )}

      {/* Screen share */}
      {isInVoice && screenTrack && (
        <div
          ref={screenContainerRef}
          style={{ position: 'relative', flexShrink: 0, margin: '12px 16px 0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
          className="group"
          onDoubleClick={onToggleFullscreen}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: isFullscreen ? '100vh' : 'min(280px, 40vw)' }}
          />

          <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.65)', color: '#f0f0f0', backdropFilter: 'blur(4px)' }}>
            <IconMonitor /> Ekran Paylaşımı
          </div>

          <div style={{ position: 'absolute', top: 8, right: 8 }} className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen() }}
              style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)', color: '#f0f0f0', backdropFilter: 'blur(4px)', transition: 'background-color 150ms ease', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.65)' }}
              title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
            >
              {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
            </button>
          </div>

          {!isFullscreen && (
            <div
              style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 11, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', backgroundColor: 'rgba(0,0,0,0.6)', color: '#f0f0f0' }}
              className="opacity-0 group-hover:opacity-60 transition-opacity duration-150"
            >
              Çift tıkla → tam ekran
            </div>
          )}

          {isFullscreen && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, padding: '3px 12px', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', color: '#f0f0f0' }}>
              ESC veya çift tıkla → küçült
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, marginTop: 32, color: '#444' }}>
            Henüz mesaj yok. İlk mesajı sen at.
          </p>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.username === username
          const prevMsg = messages[i - 1]
          const showHeader = !prevMsg || prevMsg.username !== msg.username
          return (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginTop: showHeader && i > 0 ? 12 : 0 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: 'min(320px, 85vw)' }}>
                {showHeader && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '0 4px' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: getUserColor(msg.username) }}>
                      {msg.username}
                    </span>
                    <span style={{ fontSize: 10, color: '#444' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div style={{
                  padding: '7px 12px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  backgroundColor: isOwn ? '#3ecf8e' : '#161616',
                  color: isOwn ? '#080808' : '#f0f0f0',
                  borderRadius: isOwn ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                  border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.07)',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Chat input */}
      <div style={{ padding: '8px 12px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 8, backgroundColor: '#161616', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 150ms ease' }}>
          <input
            style={{ flex: 1, background: 'transparent', color: '#f0f0f0', fontSize: 13, outline: 'none', border: 'none' }}
            placeholder={`#${textRoomName} kanalına mesaj gönder`}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            onFocus={(e) => {
              const parent = e.currentTarget.parentElement
              if (parent) parent.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
            onBlur={(e) => {
              const parent = e.currentTarget.parentElement
              if (parent) parent.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          />
          <button
            onClick={onSendMessage}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: input.trim() ? '#3ecf8e' : '#444', transition: 'color 150ms ease', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0 }}
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  )
}
