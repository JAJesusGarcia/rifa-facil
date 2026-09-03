import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'No tenés autorización.' },
      { status: 401 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Los datos enviados no son válidos.' },
      { status: 400 },
    )
  }

  const parsedSubscription = subscriptionSchema.safeParse(body)

  if (!parsedSubscription.success) {
    return NextResponse.json(
      { error: 'La suscripción enviada no es válida.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { endpoint, keys } = parsedSubscription.data

  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get('user-agent'),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'endpoint',
    },
  )

  if (error) {
    console.error('No se pudo guardar la suscripción push.', error)

    return NextResponse.json(
      { error: 'No pudimos activar las notificaciones.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'No tenés autorización.' },
      { status: 401 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Los datos enviados no son válidos.' },
      { status: 400 },
    )
  }

  const parsedSubscription = deleteSubscriptionSchema.safeParse(body)

  if (!parsedSubscription.success) {
    return NextResponse.json(
      { error: 'La suscripción enviada no es válida.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', parsedSubscription.data.endpoint)

  if (error) {
    console.error('No se pudo eliminar la suscripción push.', error)

    return NextResponse.json(
      { error: 'No pudimos desactivar las notificaciones.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
