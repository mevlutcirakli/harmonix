'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'
import { playJoinSound, playLeaveSound } from '../sounds'

export default function VoiceParticipantListener() {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return
    const handleJoin = () => playJoinSound()
    const handleLeave = () => playLeaveSound()
    room.on(RoomEvent.ParticipantConnected, handleJoin)
    room.on(RoomEvent.ParticipantDisconnected, handleLeave)
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleJoin)
      room.off(RoomEvent.ParticipantDisconnected, handleLeave)
    }
  }, [room])

  return null
}
