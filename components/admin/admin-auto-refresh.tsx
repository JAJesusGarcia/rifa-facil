'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_INTERVAL = 30_000

export function AdminAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    function refreshDashboard() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    const interval = window.setInterval(refreshDashboard, REFRESH_INTERVAL)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', refreshDashboard)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', refreshDashboard)
    }
  }, [router])

  return null
}
