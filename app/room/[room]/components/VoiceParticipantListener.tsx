'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'
import { playJoinSound, playLeaveSound } from '../sounds'

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
    const handleJoin = () => { update(); playJoinSound() }
    const handleLeave = () => { update(); playLeaveSound() }

    update()
    room.on(RoomEvent.Connected, update)
    room.on(RoomEvent.ParticipantConnected, handleJoin)
    room.on(RoomEvent.ParticipantDisconnected, handleLeave)
    return () => {
      room.off(RoomEvent.Connected, update)
      room.off(RoomEvent.ParticipantConnected, handleJoin)
      room.off(RoomEvent.ParticipantDisconnected, handleLeave)
    }
  }, [room, onParticipantsChange])

  return null
}
