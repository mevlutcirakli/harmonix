'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useVoice(username: string) {
  const [voiceRoom, setVoiceRoom] = useState('')
  const [isInVoice, setIsInVoice] = useState(false)
  const [liveKitToken, setLiveKitToken] = useState('')
  const [speaking, setSpeaking] = useState<Set<string>>(new Set())
  const [voiceParticipants, _setVoiceParticipants] = useState<string[]>([])
  const voiceParticipantsRef = useRef<string[]>([])
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null)

  const setVoiceParticipants = useCallback((p: string[]) => {
    voiceParticipantsRef.current = p
    _setVoiceParticipants(p)
  }, [])

  useEffect(() => {
    if (!voiceRoom) return

    const refetch = () =>
      supabase.from('voice_presence').select('username').eq('room_id', voiceRoom)
        .then(({ data }) => { if (data) setVoiceParticipants(data.map(r => r.username)) })

    refetch()

    const ch = supabase.channel(`vp-${voiceRoom}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'voice_presence',
        filter: `room_id=eq.${voiceRoom}`,
      }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [voiceRoom, setVoiceParticipants])

  const connectToRoom = async (targetRoom: string, token: string) => {
    await supabase.from('voice_presence').upsert(
      { room_id: targetRoom, username, joined_at: new Date().toISOString() },
      { onConflict: 'room_id,username' }
    )
    setLiveKitToken(token)
    setVoiceRoom(targetRoom)
    setIsInVoice(true)
  }

  const disconnectFromRoom = async () => {
    if (voiceRoom && username) {
      await supabase.from('voice_presence')
        .delete()
        .eq('room_id', voiceRoom)
        .eq('username', username)
    }
    setIsInVoice(false)
    setLiveKitToken('')
    setVoiceRoom('')
    setSpeaking(new Set())
    setVoiceParticipants([])
    setScreenTrack(null)
  }

  return {
    voiceRoom,
    isInVoice,
    liveKitToken,
    speaking,
    setSpeaking,
    voiceParticipants,
    voiceParticipantsRef,
    setVoiceParticipants,
    screenTrack,
    setScreenTrack,
    connectToRoom,
    disconnectFromRoom,
  }
}
