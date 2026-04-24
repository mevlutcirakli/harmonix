'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

interface VoiceParticipantListenerProps {
  onParticipantsChange: (p: string[]) => void
}

export default function VoiceParticipantListener({ onParticipantsChange }: VoiceParticipantListenerProps) {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return
    const update = () => {
      const all = [...room.remoteParticipants.values()].map(p => p.identity)
      if (room.localParticipant?.identity) all.push(room.localParticipant.identity)
      onParticipantsChange(all)
    }
    update()
    room.on(RoomEvent.Connected, update)
    room.on(RoomEvent.ParticipantConnected, update)
    room.on(RoomEvent.ParticipantDisconnected, update)
    return () => {
      room.off(RoomEvent.Connected, update)
      room.off(RoomEvent.ParticipantConnected, update)
      room.off(RoomEvent.ParticipantDisconnected, update)
    }
  }, [room, onParticipantsChange])

  return null
}
