'use client'

import { useState } from 'react'

export function useVoice(username: string) {
  const [voiceRoom, setVoiceRoom] = useState('')
  const [isInVoice, setIsInVoice] = useState(false)
  const [liveKitToken, setLiveKitToken] = useState('')
  const [speaking, setSpeaking] = useState<Set<string>>(new Set())
  const [micMuted, setMicMuted] = useState(false)
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null)

  const connectToRoom = async (targetRoom: string, token: string) => {
    setLiveKitToken(token)
    setVoiceRoom(targetRoom)
    setIsInVoice(true)
  }

  const disconnectFromRoom = async () => {
    setIsInVoice(false)
    setLiveKitToken('')
    setVoiceRoom('')
    setSpeaking(new Set())
    setMicMuted(false)
    setScreenTrack(null)
  }

  return {
    voiceRoom,
    isInVoice,
    liveKitToken,
    speaking,
    setSpeaking,
    micMuted,
    setMicMuted,
    screenTrack,
    setScreenTrack,
    connectToRoom,
    disconnectFromRoom,
  }
}
