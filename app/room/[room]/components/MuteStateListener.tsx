'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent, Track } from 'livekit-client'

interface MuteStateListenerProps {
  onMuteChange: (muted: Set<string>) => void
}

export default function MuteStateListener({ onMuteChange }: MuteStateListenerProps) {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return

    const rebuild = () => {
      const muted = new Set<string>()
      for (const [, p] of room.remoteParticipants) {
        for (const pub of p.trackPublications.values()) {
          if (pub.source === Track.Source.Microphone && pub.isMuted) {
            muted.add(p.identity)
          }
        }
      }
      onMuteChange(muted)
    }

    room.on(RoomEvent.TrackMuted, rebuild)
    room.on(RoomEvent.TrackUnmuted, rebuild)
    rebuild()

    return () => {
      room.off(RoomEvent.TrackMuted, rebuild)
      room.off(RoomEvent.TrackUnmuted, rebuild)
    }
  }, [room, onMuteChange])

  return null
}
