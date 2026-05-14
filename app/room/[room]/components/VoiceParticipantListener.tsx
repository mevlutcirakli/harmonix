'use client'

import { useEffect } from 'react'
import { useRoomContext, useParticipants } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'
import { playJoinSound, playLeaveSound } from '../sounds'

interface Props {
  onParticipantsChange?: (usernames: string[]) => void
}

export default function VoiceParticipantListener({ onParticipantsChange }: Props) {
  const room = useRoomContext()
  const participants = useParticipants()

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

  useEffect(() => {
    if (!onParticipantsChange) return
    onParticipantsChange(participants.map(p => p.identity))
  }, [participants, onParticipantsChange])

  return null
}
