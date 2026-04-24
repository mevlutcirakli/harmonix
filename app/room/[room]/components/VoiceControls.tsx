'use client'

import { useState, useEffect } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { IconMic, IconMicOff, IconCamera, IconCameraOff, IconScreen, IconPhoneOff } from '../icons'

interface VoiceControlsProps {
  onLeave: () => void
}

export default function VoiceControls({ onLeave }: VoiceControlsProps) {
  const { localParticipant } = useLocalParticipant()
  const [muted, setMuted] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screen, setScreen] = useState(false)

  useEffect(() => {
    if (!localParticipant) return
    localParticipant.setMicrophoneEnabled(true)
  }, [localParticipant])

  const toggleMic    = async () => { await localParticipant.setMicrophoneEnabled(muted);   setMuted(m => !m) }
  const toggleCamera = async () => { await localParticipant.setCameraEnabled(!camera);      setCamera(c => !c) }
  const toggleScreen = async () => { await localParticipant.setScreenShareEnabled(!screen); setScreen(s => !s) }

  return (
    <div className="voice-controls">
      <button onClick={toggleMic} title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
        className={`icon-btn icon-btn-lg ${muted ? 'icon-btn-muted' : 'icon-btn-ghost'}`}>
        {muted ? <IconMicOff size={20} /> : <IconMic size={20} />}
      </button>
      <button onClick={toggleCamera} title={camera ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
        className={`icon-btn icon-btn-lg ${camera ? 'icon-btn-active' : 'icon-btn-ghost'}`}>
        {camera ? <IconCamera size={20} /> : <IconCameraOff size={20} />}
      </button>
      <button onClick={toggleScreen} title={screen ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
        className={`icon-btn icon-btn-lg ${screen ? 'icon-btn-active' : 'icon-btn-ghost'}`}>
        <IconScreen size={20} />
      </button>
      <div className="divider-v" />
      <button onClick={onLeave} title="Kanaldan Ayrıl" className="icon-btn icon-btn-lg icon-btn-danger">
        <IconPhoneOff size={20} />
      </button>
    </div>
  )
}
