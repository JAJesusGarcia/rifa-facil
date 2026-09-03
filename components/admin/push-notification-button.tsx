'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = `${base64String}${padding}`
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

async function getServiceWorkerRegistration() {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export function PushNotificationButton() {
  const [isChecking, setIsChecking] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] =
    useState<NotificationPermission>('default')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkSubscription() {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window

      if (!supported) {
        if (!cancelled) {
          setIsSupported(false)
          setIsChecking(false)
        }

        return
      }

      try {
        const registration = await getServiceWorkerRegistration()
        const subscription = await registration.pushManager.getSubscription()

        if (!cancelled) {
          setPermission(Notification.permission)
          setIsSubscribed(Boolean(subscription))
        }
      } catch {
        if (!cancelled) {
          setMessage('No pudimos comprobar las notificaciones.')
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false)
        }
      }
    }

    void checkSubscription()

    return () => {
      cancelled = true
    }
  }, [])

  async function enableNotifications() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!publicKey) {
      setMessage('Falta configurar la clave pública de notificaciones.')
      return
    }

    setIsWorking(true)
    setMessage(null)

    try {
      const requestedPermission = await Notification.requestPermission()

      setPermission(requestedPermission)

      if (requestedPermission !== 'granted') {
        setMessage('Necesitás permitir las notificaciones desde el navegador.')
        return
      }

      const registration = await getServiceWorkerRegistration()

      let subscription = await registration.pushManager.getSubscription()
      const createdNewSubscription = !subscription

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const serializedSubscription = subscription.toJSON()
      const p256dh = serializedSubscription.keys?.p256dh
      const auth = serializedSubscription.keys?.auth

      if (!p256dh || !auth) {
        if (createdNewSubscription) {
          await subscription.unsubscribe()
        }

        throw new Error('La suscripción no contiene las claves necesarias.')
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh,
            auth,
          },
        }),
      })

      if (!response.ok) {
        if (createdNewSubscription) {
          await subscription.unsubscribe()
        }

        throw new Error('No se pudo guardar la suscripción.')
      }

      setIsSubscribed(true)
      setMessage('Las notificaciones quedaron activadas.')
    } catch (error) {
      console.error(error)
      setMessage('No pudimos activar las notificaciones.')
    } finally {
      setIsWorking(false)
    }
  }

  async function disableNotifications() {
    setIsWorking(true)
    setMessage(null)

    try {
      const registration = await getServiceWorkerRegistration()
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const response = await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        })

        if (!response.ok) {
          throw new Error('No se pudo eliminar la suscripción.')
        }

        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      setMessage('Las notificaciones quedaron desactivadas.')
    } catch (error) {
      console.error(error)
      setMessage('No pudimos desactivar las notificaciones.')
    } finally {
      setIsWorking(false)
    }
  }

  if (isChecking) {
    return (
      <Button type="button" disabled className="bg-[#d86983] text-white">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Comprobando
      </Button>
    )
  }

  if (!isSupported) {
    return (
      <p className="max-w-xs text-sm text-[#80535e]">
        En iPhone, agregá primero la web a la pantalla de inicio para activar
        las notificaciones.
      </p>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="max-w-xs">
        <Button
          type="button"
          disabled
          variant="outline"
          className="border-[#e4c0c9] bg-white/60 text-[#80535e]"
        >
          <BellOff className="size-4" aria-hidden="true" />
          Notificaciones bloqueadas
        </Button>

        <p className="mt-1 text-xs text-[#80535e]">
          Habilitalas desde la configuración del navegador.
        </p>
      </div>
    )
  }

  return (
    <div className="sm:text-right">
      <Button
        type="button"
        disabled={isWorking}
        onClick={isSubscribed ? disableNotifications : enableNotifications}
        variant={isSubscribed ? 'outline' : 'default'}
        className={
          isSubscribed
            ? 'border-[#78c9af] bg-[#dff5ee] text-[#17664f] hover:bg-[#d2eee5]'
            : 'bg-[#d86983] text-white hover:bg-[#c85873]'
        }
      >
        {isWorking ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : isSubscribed ? (
          <BellRing className="size-4" aria-hidden="true" />
        ) : (
          <Bell className="size-4" aria-hidden="true" />
        )}

        {isWorking
          ? 'Procesando...'
          : isSubscribed
            ? 'Notificaciones activadas'
            : 'Activar notificaciones'}
      </Button>

      {message ? (
        <p className="mt-1 max-w-xs text-xs text-[#80535e]" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}
