'use client'

import { useEffect } from 'react'
import { useParticipants } from '@livekit/components-react'
import { Track } from 'livekit-client'

interface ScreenShareViewerProps {
  onScreenShare: (track: MediaStreamTrack | null) => void
}

export default function ScreenShareViewer({ onScreenShare }: ScreenShareViewerProps) {
  const participants = useParticipants()

  useEffect(() => {
    for (const participant of participants) {
      const pub = participant.getTrackPublication(Track.Source.ScreenShare)
      if (pub?.track?.mediaStreamTrack) {
        onScreenShare(pub.track.mediaStreamTrack)
        return
      }
    }
    onScreenShare(null)
  }, [participants, onScreenShare])

  return null
}
