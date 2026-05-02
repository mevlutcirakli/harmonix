'use client'

import { useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react'
import { ROOMS } from '../constants'
import {
  IconHash,
  IconVolume,
  IconVolumeOff,
  IconCrown,
  IconLogOut,
} from '../icons'
import Avatar from './Avatar'
import SoundWaveBars from './SoundWaveBars'
import VoiceControls from './VoiceControls'
import SpeakerListener from './SpeakerListener'
import VoiceParticipantListener from './VoiceParticipantListener'
import ScreenShareViewer from './ScreenShareViewer'
import RemoteMuteApplier from './RemoteMuteApplier'

interface LeftSidebarProps {
  sidebarOpen: boolean
  textRoom: string
  voiceRoom: string
  isInVoice: boolean
  voiceParticipants: string[]
  speaking: Set<string>
  username: string
  hostUsername: string
  isHost: boolean
  liveKitToken: string
  onSwitchTextRoom: (id: string) => void
  onJoinVoice: (roomId: string) => void
  onLeaveVoice: () => void
  onLogout: () => void
  setSpeaking: (v: Set<string>) => void
  setVoiceParticipants: (v: string[]) => void
  setScreenTrack: (track: MediaStreamTrack | null) => void
}

export default function LeftSidebar({
  sidebarOpen,
  textRoom,
  voiceRoom,
  isInVoice,
  voiceParticipants,
  speaking,
  username,
  hostUsername,
  isHost,
  liveKitToken,
  onSwitchTextRoom,
  onJoinVoice,
  onLeaveVoice,
  onLogout,
  setSpeaking,
  setVoiceParticipants,
  setScreenTrack,
}: LeftSidebarProps) {
  const [locallyMuted, setLocallyMuted] = useState<Set<string>>(new Set())

  const toggleLocalMute = (user: string) => {
    setLocallyMuted(prev => {
      const next = new Set(prev)
      if (next.has(user)) next.delete(user)
      else next.add(user)
      return next
    })
  }

  return (
    <div
      className={`fixed md:relative z-50 md:z-auto h-full flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      style={{ width: 224, backgroundColor: '#0f0f0f', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#f0f0f0' }}>Harmonix</span>
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Text channels */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', padding: '0 10px', marginBottom: 4 }}>
            Kanallar
          </p>
          {ROOMS.map(r => (
            <button key={r.id} onClick={() => onSwitchTextRoom(r.id)}
              className={`channel-btn${r.id === textRoom ? ' channel-btn--active' : ''}`}
              style={{ height: 32, padding: '0 10px', gap: 8, fontSize: 13, color: r.id === textRoom ? '#3ecf8e' : '#888', marginBottom: 1 }}>
              <span style={{ color: r.id === textRoom ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                <IconHash />
              </span>
              <span>{r.name}</span>
            </button>
          ))}
        </div>

        {/* Voice channels */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', padding: '0 10px', marginBottom: 4 }}>
            Ses
          </p>
          {ROOMS.map((r) => {
            const isActiveVoice = voiceRoom === r.id && isInVoice
            return (
              <div key={r.id} style={{ marginBottom: 2 }}>
                <button onClick={() => onJoinVoice(r.id)}
                  className={`channel-btn${isActiveVoice ? ' channel-btn--active' : ''}`}
                  style={{ height: 32, padding: '0 14px', gap: 8, fontSize: 12, color: isActiveVoice ? '#3ecf8e' : '#888' }}>
                  <span style={{ color: isActiveVoice ? '#3ecf8e' : '#444', display: 'flex', flexShrink: 0 }}>
                    <IconVolume />
                  </span>
                  <span>{r.name}</span>
                  {isActiveVoice && (
                    <div style={{ marginLeft: 'auto' }}>
                      <SoundWaveBars delays={[0, 0.2, 0.4]} duration="0.6s" />
                    </div>
                  )}
                </button>

                {isActiveVoice && voiceParticipants.length > 0 && (
                  <div style={{ paddingLeft: 24, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {voiceParticipants.map(user => {
                      const isSpeaking = speaking.has(user)
                      const isMuted = user !== username && locallyMuted.has(user)
                      return (
                        <div key={user} className={`user-row${isSpeaking ? ' user-row--speaking' : ''}`}
                          style={{ gap: 6, padding: '2px 8px' }}>
                          <Avatar username={user} size="sm" speaking={isSpeaking && !isMuted} />
                          <span className="text-truncate" style={{ fontSize: 11, color: isMuted ? '#555' : isSpeaking ? '#f0f0f0' : '#888', flex: 1 }}>
                            {user}{user === username ? ' (sen)' : ''}
                          </span>
                          {user === hostUsername && user === username && <span className="crown-icon" title="Müzik Hostu"><IconCrown /></span>}
                          {user !== username && (
                            <button
                              onClick={() => toggleLocalMute(user)}
                              title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                color: isMuted ? '#ef4444' : '#555',
                                transition: 'color 150ms ease',
                              }}
                              className="icon-btn"
                            >
                              {isMuted ? <IconVolumeOff size={12} /> : <IconVolume />}
                            </button>
                          )}
                          {isSpeaking && !isMuted && <SoundWaveBars />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* LiveKit audio connection */}
      {isInVoice && liveKitToken && (
        <LiveKitRoom
          audio={true}
          token={liveKitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          style={{ display: 'contents' }}
        >
          <RoomAudioRenderer />
          <SpeakerListener onSpeakersChange={setSpeaking} />
          <VoiceParticipantListener onParticipantsChange={setVoiceParticipants} />
          <ScreenShareViewer onScreenShare={setScreenTrack} />
          <RemoteMuteApplier locallyMuted={locallyMuted} />
          <VoiceControls onLeave={onLeaveVoice} />
        </LiveKitRoom>
      )}

      {/* User footer */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Avatar username={username} size="md" />
          <span suppressHydrationWarning className="text-truncate" style={{ fontSize: 13, color: '#f0f0f0' }}>{username}</span>
          {isHost && <span className="crown-icon" title="Müzik Hostu"><IconCrown /></span>}
        </div>
        <button onClick={onLogout} className="icon-btn icon-btn-sm icon-btn-ghost" title="Çıkış">
          <IconLogOut />
        </button>
      </div>
    </div>
  )
}
