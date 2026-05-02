'use client'

import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'

export default function RemoteMuteApplier({ locallyMuted }: { locallyMuted: Set<string> }) {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return
    room.remoteParticipants.forEach((participant) => {
      participant.setVolume(locallyMuted.has(participant.identity) ? 0 : 1)
    })
  }, [room, locallyMuted])

  return null
}
