import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendNewReservationNotification } from '@/lib/push-notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 4 * 1024 * 1024

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

const selectedNumbersSchema = z
  .array(z.number().int().min(0).max(999))
  .min(1, 'Elegí al menos un número.')
  .max(20, 'Podés reservar hasta 20 números.')
  .refine(
    (numbers) => new Set(numbers).size === numbers.length,
    'No puede haber números repetidos.',
  )

const reservationSchema = z.object({
  raffleId: z.string().uuid(),
  customerName: z
    .string()
    .trim()
    .min(2, 'Ingresá tu nombre.')
    .max(120, 'El nombre es demasiado largo.'),
  customerWhatsapp: z
    .string()
    .trim()
    .min(6, 'Ingresá un WhatsApp válido.')
    .max(30, 'El WhatsApp es demasiado largo.')
    .regex(/^[0-9+\s()-]+$/, 'El WhatsApp contiene caracteres no permitidos.'),
  paymentMethod: z.enum(['transfer', 'cash']),
  numbers: selectedNumbersSchema,
})

const holdResponseSchema = z.object({
  reservationId: z.string().uuid(),
  lookupToken: z.string().uuid(),
  numbers: z.array(z.number()),
  totalAmount: z.coerce.number(),
  expiresAt: z.string(),
  status: z.literal('held'),
})

function getPublicError(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('no longer available')) {
    return {
      status: 409,
      message:
        'Uno o más números acaban de ser reservados. Elegí otros números.',
    }
  }

  if (normalizedMessage.includes('maximum')) {
    return {
      status: 400,
      message: 'Superaste la cantidad máxima permitida.',
    }
  }

  return {
    status: 400,
    message:
      'No pudimos crear la reserva. Revisá los datos e intentá otra vez.',
  }
}

function sanitizeFilename(filename: string) {
  const sanitized = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()

  return sanitized || 'comprobante'
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'No pudimos leer los datos enviados.' },
      { status: 400 },
    )
  }

  let parsedNumbers: unknown

  try {
    const numbersValue = formData.get('numbers')

    parsedNumbers =
      typeof numbersValue === 'string' ? JSON.parse(numbersValue) : []
  } catch {
    return NextResponse.json(
      { error: 'La selección de números no es válida.' },
      { status: 400 },
    )
  }

  const parsedReservation = reservationSchema.safeParse({
    raffleId: formData.get('raffleId'),
    customerName: formData.get('customerName'),
    customerWhatsapp: formData.get('customerWhatsapp'),
    paymentMethod: formData.get('paymentMethod'),
    numbers: parsedNumbers,
  })

  if (!parsedReservation.success) {
    return NextResponse.json(
      {
        error:
          parsedReservation.error.issues[0]?.message ??
          'Los datos enviados no son válidos.',
      },
      { status: 400 },
    )
  }

  const { raffleId, customerName, customerWhatsapp, paymentMethod, numbers } =
    parsedReservation.data

  const proofEntry = formData.get('paymentProof')

  const paymentProof =
    proofEntry && typeof proofEntry !== 'string' && proofEntry.size > 0
      ? proofEntry
      : null

  if (paymentMethod === 'transfer' && !paymentProof) {
    return NextResponse.json(
      { error: 'Adjuntá el comprobante de transferencia.' },
      { status: 400 },
    )
  }

  if (paymentProof) {
    if (paymentProof.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El comprobante no puede superar los 4 MB.' },
        { status: 400 },
      )
    }

    if (
      !allowedMimeTypes.includes(
        paymentProof.type as (typeof allowedMimeTypes)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: 'El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF.',
        },
        { status: 400 },
      )
    }
  }

  const { data: holdData, error: holdError } = await supabase.rpc(
    'create_raffle_hold',
    {
      p_raffle_id: raffleId,
      p_numbers: numbers,
      p_customer_name: customerName,
      p_customer_whatsapp: customerWhatsapp,
      p_payment_method: paymentMethod,
    },
  )

  if (holdError) {
    const publicError = getPublicError(holdError.message)

    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status },
    )
  }

  const parsedHold = holdResponseSchema.safeParse(holdData)

  if (!parsedHold.success) {
    return NextResponse.json(
      {
        error: 'La reserva fue creada, pero recibimos una respuesta inválida.',
      },
      { status: 500 },
    )
  }

  const hold = parsedHold.data
  let uploadedStoragePath: string | null = null

  async function rejectHold(reason: string) {
    await supabase.rpc('reject_raffle_reservation', {
      p_reservation_id: hold.reservationId,
      p_reason: reason,
    })
  }

  if (paymentMethod === 'transfer' && paymentProof) {
    const safeFilename = sanitizeFilename(paymentProof.name)

    uploadedStoragePath = [
      raffleId,
      hold.reservationId,
      `${crypto.randomUUID()}-${safeFilename}`,
    ].join('/')

    const fileContents = await paymentProof.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(uploadedStoragePath, fileContents, {
        contentType: paymentProof.type,
        upsert: false,
      })

    if (uploadError) {
      await rejectHold('No se pudo cargar el comprobante.')

      return NextResponse.json(
        {
          error: 'No pudimos cargar el comprobante. Intentá nuevamente.',
        },
        { status: 500 },
      )
    }
  }

  const submitPayload =
    paymentMethod === 'transfer' && paymentProof && uploadedStoragePath
      ? {
          p_lookup_token: hold.lookupToken,
          p_storage_path: uploadedStoragePath,
          p_original_filename: paymentProof.name,
          p_mime_type: paymentProof.type,
          p_size_bytes: paymentProof.size,
        }
      : {
          p_lookup_token: hold.lookupToken,
        }

  const { error: submitError } = await supabase.rpc(
    'submit_raffle_reservation',
    submitPayload,
  )

  if (submitError) {
    if (uploadedStoragePath) {
      await supabase.storage
        .from('payment-proofs')
        .remove([uploadedStoragePath])
    }

    await rejectHold('No se pudo enviar la reserva.')

    return NextResponse.json(
      {
        error: 'No pudimos finalizar la reserva. Tus números fueron liberados.',
      },
      { status: 500 },
    )
  }

  try {
    await sendNewReservationNotification({
      reservationId: hold.reservationId,
      raffleId,
      customerName,
      numbers: hold.numbers,
      totalAmount: hold.totalAmount,
      paymentMethod,
    })
  } catch (error) {
    console.error(
      'La reserva se creó, pero no se pudo enviar la notificación.',
      error,
    )
  }

  return NextResponse.json(
    {
      reservation: {
        reservationId: hold.reservationId,
        numbers: hold.numbers,
        totalAmount: hold.totalAmount,
        paymentMethod,
        status: 'pending',
      },
    },
    { status: 201 },
  )
}
