'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'

const NOTIFICATION_MESSAGE_TYPE = 'raffle:new-reservation'
const NOTIFICATION_SOUND_URL = '/sounds/new-reservation.mp3'
const DUPLICATE_SOUND_WINDOW_MS = 1_500

export function NotificationSoundButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayedAtRef = useRef(0)

  const playSound = useCallback(async () => {
    const audio = audioRef.current
    const now = Date.now()

    if (!audio || now - lastPlayedAtRef.current < DUPLICATE_SOUND_WINDOW_MS) {
      return
    }

    lastPlayedAtRef.current = now
    audio.currentTime = 0

    try {
      await audio.play()
    } catch {
      lastPlayedAtRef.current = 0
    }
  }, [])

  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND_URL)
    audio.preload = 'auto'
    audio.volume = 0.85
    audioRef.current = audio

    function handleServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === NOTIFICATION_MESSAGE_TYPE) {
        void playSound()
      }
    }

    navigator.serviceWorker?.addEventListener(
      'message',
      handleServiceWorkerMessage,
    )

    return () => {
      navigator.serviceWorker?.removeEventListener(
        'message',
        handleServiceWorkerMessage,
      )
      audio.pause()
      audioRef.current = null
    }
  }, [playSound])

  return (
    <button
      type="button"
      onClick={() => void playSound()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e4c0c9] bg-white/70 px-3 text-sm font-semibold text-[#68404a] transition hover:border-[#d99bad] hover:bg-[#f9e6eb]"
    >
      <Volume2 className="size-4" aria-hidden="true" />
      Probar sonido
    </button>
  )
}
