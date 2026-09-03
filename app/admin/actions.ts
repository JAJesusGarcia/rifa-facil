'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
})

const reservationIdSchema = z.string().uuid()

const resetRaffleSchema = z.object({
  raffleId: z.string().uuid(),
  confirmation: z.literal('REINICIAR'),
})

const resetRaffleResponseSchema = z.object({
  raffleId: z.string().uuid(),
  numbersReset: z.coerce.number(),
  reservationsDeleted: z.coerce.number(),
  storagePaths: z.array(z.string()),
})

function adminUrl(type: 'success' | 'error', message: string) {
  const params = new URLSearchParams({
    [type]: message,
  })

  if (type === 'success') {
    params.set('notification', crypto.randomUUID())
  }

  return `/admin?${params.toString()}`
}

async function userOwnsReservation(reservationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id')
    .eq('id', reservationId)
    .maybeSingle()

  return Boolean(reservation)
}

async function getRaffleOwnerId(raffleId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: raffle, error } = await supabase
    .from('raffles')
    .select('id')
    .eq('id', raffleId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !raffle) {
    return null
  }

  return user.id
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        'Ingresá un email y una contraseña válidos.',
      )}`,
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        'El email o la contraseña son incorrectos.',
      )}`,
    )
  }

  redirect(
    `/admin?toast=${encodeURIComponent('Sesión iniciada correctamente.')}`,
  )
}

export async function logoutAction() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect(
    `/admin/login?toast=${encodeURIComponent('Sesión cerrada correctamente.')}`,
  )
}

export async function confirmReservationAction(formData: FormData) {
  const parsedId = reservationIdSchema.safeParse(formData.get('reservationId'))

  if (!parsedId.success) {
    redirect(adminUrl('error', 'La reserva no es válida.'))
  }

  const ownsReservation = await userOwnsReservation(parsedId.data)

  if (!ownsReservation) {
    redirect(adminUrl('error', 'No tenés acceso a esta reserva.'))
  }

  const admin = createAdminClient()

  const { error } = await admin.rpc('confirm_raffle_reservation', {
    p_reservation_id: parsedId.data,
  })

  if (error) {
    redirect(
      adminUrl(
        'error',
        'No se pudo confirmar la reserva. Verificá que siga pendiente.',
      ),
    )
  }

  revalidatePath('/')
  revalidatePath('/admin')

  redirect(adminUrl('success', 'Pago confirmado correctamente.'))
}

export async function rejectReservationAction(formData: FormData) {
  const parsed = z
    .object({
      reservationId: z.string().uuid(),
      reason: z.string().trim().max(240).optional(),
    })
    .safeParse({
      reservationId: formData.get('reservationId'),
      reason: formData.get('reason') || undefined,
    })

  if (!parsed.success) {
    redirect(adminUrl('error', 'La solicitud de rechazo no es válida.'))
  }

  const ownsReservation = await userOwnsReservation(parsed.data.reservationId)

  if (!ownsReservation) {
    redirect(adminUrl('error', 'No tenés acceso a esta reserva.'))
  }

  const admin = createAdminClient()

  const { error } = await admin.rpc('reject_raffle_reservation', {
    p_reservation_id: parsed.data.reservationId,
    p_reason: parsed.data.reason,
  })

  if (error) {
    redirect(
      adminUrl('error', 'No se pudo rechazar la reserva. Verificá su estado.'),
    )
  }

  revalidatePath('/')
  revalidatePath('/admin')

  redirect(adminUrl('success', 'Reserva rechazada y números liberados.'))
}

export async function resetRaffleAction(formData: FormData) {
  const parsed = resetRaffleSchema.safeParse({
    raffleId: formData.get('raffleId'),
    confirmation: formData.get('confirmation'),
  })

  if (!parsed.success) {
    redirect(
      adminUrl('error', 'Para reiniciar la rifa tenés que escribir REINICIAR.'),
    )
  }

  const ownerId = await getRaffleOwnerId(parsed.data.raffleId)

  if (!ownerId) {
    redirect(adminUrl('error', 'No tenés acceso para reiniciar esta rifa.'))
  }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc('reset_raffle', {
    p_raffle_id: parsed.data.raffleId,
    p_owner_id: ownerId,
  })

  if (error) {
    console.error('No se pudo reiniciar la rifa.', {
      message: error.message,
    })

    redirect(
      adminUrl('error', 'No se pudo reiniciar la rifa. Intentá nuevamente.'),
    )
  }

  const parsedResult = resetRaffleResponseSchema.safeParse(data)
  let storageCleanupFailed = false

  if (parsedResult.success && parsedResult.data.storagePaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from('payment-proofs')
      .remove(parsedResult.data.storagePaths)

    if (storageError) {
      storageCleanupFailed = true

      console.error('No se pudieron eliminar algunos comprobantes.', {
        message: storageError.message,
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/admin')

  redirect(
    adminUrl(
      'success',
      storageCleanupFailed
        ? 'La rifa volvió a cero, aunque algunos archivos deberán eliminarse manualmente.'
        : 'La rifa volvió a cero correctamente.',
    ),
  )
}
