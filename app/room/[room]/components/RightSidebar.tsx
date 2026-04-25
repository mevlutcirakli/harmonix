'use client'

import type { QueueItem } from '../types'
import QueuePanel from './QueuePanel'
import UsersPanel from './UsersPanel'

interface RightSidebarProps {
  isInVoice: boolean
  queue: QueueItem[]
  queueInput: string
  onQueueInputChange: (v: string) => void
  onAddToQueue: () => void
  onAddPlaylist: () => void
  onRemoveFromQueue: (id: string) => void
  onClearQueue: () => void
  isAddingPlaylist: boolean
  users: string[]
  speaking: Set<string>
  currentUser: string
  hostUsername: string
}

export default function RightSidebar({
  isInVoice,
  queue,
  queueInput,
  onQueueInputChange,
  onAddToQueue,
  onAddPlaylist,
  onRemoveFromQueue,
  onClearQueue,
  isAddingPlaylist,
  users,
  speaking,
  currentUser,
  hostUsername,
}: RightSidebarProps) {
  return (
    <div
      className="hidden lg:flex"
      style={{ width: 240, flexDirection: 'column', flexShrink: 0, backgroundColor: '#0f0f0f', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      {isInVoice && (
        <QueuePanel
          queue={queue}
          queueInput={queueInput}
          onInputChange={onQueueInputChange}
          onAdd={onAddToQueue}
          onAddPlaylist={onAddPlaylist}
          onRemove={onRemoveFromQueue}
          onClearQueue={onClearQueue}
          isAddingPlaylist={isAddingPlaylist}
        />
      )}
      <UsersPanel
        users={users}
        speaking={speaking}
        currentUser={currentUser}
        hostUsername={hostUsername}
      />
    </div>
  )
}
