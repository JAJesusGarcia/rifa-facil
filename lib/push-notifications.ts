import 'server-only'

import webpush from 'web-push'

import { createAdminClient } from '@/lib/supabase/admin'

interface ReservationNotification {
  reservationId: string
  raffleId: string
  customerName: string
  numbers: number[]
  totalAmount: number
  paymentMethod: 'transfer' | 'cash'
}

let vapidConfigured = false

function configureWebPush() {
  if (vapidConfigured) {
    return true
  }

  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    console.warn('Faltan variables de entorno para Web Push.')
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true

  return true
}

function formatNumber(number: number) {
  return number.toString().padStart(2, '0')
}

function formatNumbers(numbers: number[]) {
  const formatted = numbers.map(formatNumber)

  if (formatted.length === 1) {
    return formatted[0]
  }

  return `${formatted.slice(0, -1).join(', ')} y ${formatted.at(-1)}`
}

function getStatusCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode

    return typeof statusCode === 'number' ? statusCode : null
  }

  return null
}

export async function sendNewReservationNotification({
  reservationId,
  raffleId,
  customerName,
  numbers,
  totalAmount,
  paymentMethod,
}: ReservationNotification) {
  if (!configureWebPush()) {
    return
  }

  const admin = createAdminClient()

  const { data: raffle, error: raffleError } = await admin
    .from('raffles')
    .select('owner_id')
    .eq('id', raffleId)
    .maybeSingle()

  if (raffleError || !raffle?.owner_id) {
    console.error(
      'No se pudo encontrar al propietario de la rifa.',
      raffleError,
    )
    return
  }

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', raffle.owner_id)

  if (subscriptionsError) {
    console.error(
      'No se pudieron obtener las suscripciones push.',
      subscriptionsError,
    )
    return
  }

  if (!subscriptions?.length) {
    return
  }

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(totalAmount)

  const paymentLabel =
    paymentMethod === 'transfer' ? 'transferencia' : 'efectivo'

  const payload = JSON.stringify({
    title: '¡Nueva reserva en Rifa Fácil!',
    body: `${customerName} reservó los números ${formatNumbers(
      numbers,
    )} por ${formattedAmount} mediante ${paymentLabel}.`,
    url: '/admin?status=pending',
    tag: `reservation-${reservationId}`,
  })

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
          {
            TTL: 60 * 60,
            urgency: 'high',
          },
        )
      } catch (error) {
        const statusCode = getStatusCode(error)

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)

          return
        }

        console.error('No se pudo enviar una notificación push.', error)
      }
    }),
  )
}
