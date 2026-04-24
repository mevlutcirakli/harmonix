'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent, ParticipantEvent, type Participant } from 'livekit-client'

interface SpeakerListenerProps {
  onSpeakersChange: (s: Set<string>) => void
}

export default function SpeakerListener({ onSpeakersChange }: SpeakerListenerProps) {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return

    const speakingMap = new Map<string, boolean>()

    const flush = () => {
      onSpeakersChange(new Set([...speakingMap.entries()].filter(([, v]) => v).map(([k]) => k)))
    }

    const attach = (participant: Participant) => {
      const handler = (speaking: boolean) => {
        if (speakingMap.get(participant.identity) !== speaking) {
          speakingMap.set(participant.identity, speaking)
          flush()
        }
      }
      participant.on(ParticipantEvent.IsSpeakingChanged, handler)
      return () => participant.off(ParticipantEvent.IsSpeakingChanged, handler)
    }

    const cleanups: (() => void)[] = []
    cleanups.push(attach(room.localParticipant))
    room.remoteParticipants.forEach(p => cleanups.push(attach(p)))

    const onJoin = (p: Participant) => cleanups.push(attach(p))
    const onLeave = (p: Participant) => { speakingMap.delete(p.identity); flush() }

    room.on(RoomEvent.ParticipantConnected, onJoin)
    room.on(RoomEvent.ParticipantDisconnected, onLeave)

    return () => {
      cleanups.forEach(c => c())
      room.off(RoomEvent.ParticipantConnected, onJoin)
      room.off(RoomEvent.ParticipantDisconnected, onLeave)
    }
  }, [room, onSpeakersChange])

  return null
}
