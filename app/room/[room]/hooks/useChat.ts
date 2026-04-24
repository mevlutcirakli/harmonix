'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { useRouter } from 'next/navigation'
import type { Message } from '../types'

type Router = ReturnType<typeof useRouter>

export function useChat(textRoom: string, username: string, router: Router) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Messages + Presence
  useEffect(() => {
    if (!username) return

    supabase.from('messages').select('*').eq('room_id', textRoom)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data) })

    const msgChannel = supabase.channel(`messages-${textRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${textRoom}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]) })
      .subscribe()

    const presenceChannel = supabase.channel(`presence-${textRoom}`)
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.values(state).flat().map((p) => (p as unknown as { username: string }).username).filter(Boolean)
        setOnlineUsers([...new Set(users)])
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ username })
      })

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [textRoom, username])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    await supabase.from('messages').insert({ room_id: textRoom, username, content: input.trim() })
    setInput('')
  }

  const resetMessages = () => setMessages([])

  return { messages, input, setInput, onlineUsers, sendMessage, bottomRef, resetMessages }
}
