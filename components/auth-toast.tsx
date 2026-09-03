'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

interface AuthToastProps {
  message?: string
}

export function AuthToast({ message }: AuthToastProps) {
  const [isVisible, setIsVisible] = useState(Boolean(message))

  useEffect(() => {
    if (!message) {
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('toast')

    const cleanUrl = `${url.pathname}${url.search}${url.hash}`

    window.history.replaceState(window.history.state, '', cleanUrl)

    const timeout = window.setTimeout(() => {
      setIsVisible(false)
    }, 4500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [message])

  if (!message || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] sm:left-auto sm:w-full sm:max-w-sm">
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-[#86cdb7] bg-[#e5f7f1] p-4 text-[#285f50] shadow-xl"
      >
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#25866b] text-white">
          <Check className="size-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold">¡Listo!</p>
          <p className="mt-0.5 text-sm leading-5">{message}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          aria-label="Cerrar notificación"
          className="grid size-7 shrink-0 place-items-center rounded-full text-[#457568] transition hover:bg-[#c9eee2] hover:text-[#174c3e]"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
