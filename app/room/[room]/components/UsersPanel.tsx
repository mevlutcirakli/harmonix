'use client'

import Avatar from './Avatar'
import SoundWaveBars from './SoundWaveBars'
import { IconCrown } from '../icons'

interface UsersPanelProps {
  users: string[]
  speaking: Set<string>
  currentUser: string
  hostUsername: string
}

export default function UsersPanel({ users, speaking, currentUser, hostUsername }: UsersPanelProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-header">
        <p className="section-label">Bu Odada — {users.length}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {users.length === 0 ? (
          <p className="empty-msg">Kimse yok</p>
        ) : (
          users.map(user => {
            const isSpeaking = speaking.has(user)
            return (
              <div key={user} className={`user-row${isSpeaking ? ' user-row--speaking' : ''}`}
                style={{ gap: 8, padding: '5px 8px', marginBottom: 2 }}>
                <Avatar username={user} size="md" speaking={isSpeaking} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="text-truncate" style={{ fontSize: 12, color: '#f0f0f0' }}>{user}</span>
                    {user === currentUser && <span className="tag-green">sen</span>}
                    {user === hostUsername && <span className="crown-icon" title="Müzik Hostu"><IconCrown /></span>}
                  </div>
                  {isSpeaking && <SoundWaveBars />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
