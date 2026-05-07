'use client'

import { useState } from 'react'
import ChatPanel from './ChatPanel'
import MusicPanel from './MusicPanel'
import ParticipantAvatar from './ParticipantAvatar'
import { IconChat, IconMusic } from '../icons'
import type { Message, QueueItem, Participant } from '../types'


interface SidePanelProps {
  messages: Message[]
  input: string
  onInputChange: (v: string) => void
  onSendMessage: () => void
  bottomRef: React.RefObject<HTMLDivElement | null>
  username: string
  onlineUsers: string[]
  channelParticipants: Record<string, Participant[]>
  speaking: Set<string>
  mutedParticipants: Set<string>
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

export default function SidePanel({
  messages, input, onInputChange, onSendMessage, bottomRef, username,
  onlineUsers, channelParticipants, speaking, mutedParticipants,
  queue, currentSong, volume, isMuted, pausedAt,
  queueInput, setQueueInput, isAdding, isInVoice,
  onAddToQueue, onTogglePlay, onSkip, onRemoveFromQueue, onClearQueue,
  onVolumeChange, onToggleMute,
}: SidePanelProps) {
  const [tab, setTab] = useState<'chat' | 'music'>('chat')

  const voiceParticipants = Object.values(channelParticipants).flat()
  const allUsers = [...new Set([...onlineUsers, ...voiceParticipants.map(p => p.username)])]

  return (
    <div style={{
      width: 300, flexShrink: 0, height: '100%',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        {(['chat', 'music'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 46,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
              color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            {t === 'chat' ? <IconChat size={13} /> : <IconMusic size={13} />}
            {t === 'chat' ? 'Sohbet' : 'Müzik'}
          </button>
        ))}
      </div>

      {/* Online users strip */}
      <div style={{
        flexShrink: 0, padding: '7px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6,
        overflowX: 'hidden',
      }}>
        <span style={{
          fontSize: 10, color: 'var(--text-3)', fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {allUsers.length} çevrimiçi
        </span>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 1 }}>
          {allUsers.slice(0, 14).map(user => (
            <div key={user} title={user} style={{ flexShrink: 0 }}>
              <ParticipantAvatar
                username={user}
                size={22}
                speaking={speaking.has(user)}
                muted={mutedParticipants.has(user)}
              />
            </div>
          ))}
          {allUsers.length > 14 && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', alignSelf: 'center' }}>
              +{allUsers.length - 14}
            </span>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'chat' ? (
          <ChatPanel
            messages={messages}
            input={input}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
            bottomRef={bottomRef}
            username={username}
          />
        ) : (
          <MusicPanel
            queue={queue}
            currentSong={currentSong}
            volume={volume}
            isMuted={isMuted}
            pausedAt={pausedAt}
            queueInput={queueInput}
            setQueueInput={setQueueInput}
            isAdding={isAdding}
            isInVoice={isInVoice}
            onAddToQueue={onAddToQueue}
            onTogglePlay={onTogglePlay}
            onSkip={onSkip}
            onRemoveFromQueue={onRemoveFromQueue}
            onClearQueue={onClearQueue}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />
        )}
      </div>
    </div>
  )
}
