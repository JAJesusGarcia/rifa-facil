'use client'

import { FormEvent, useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Upload,
  WalletCards,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

type PaymentMethod = 'transfer' | 'cash'

interface ReservationResult {
  reservationId: string
  numbers: number[]
  totalAmount: number
  paymentMethod: PaymentMethod
  status: 'pending'
}

interface ReservationFormProps {
  raffleId: string
  selectedNumbers: number[]
  total: number
  currency: string
  paymentAlias: string
}

function formatNumber(number: number) {
  return number.toString().padStart(2, '0')
}

export function ReservationForm({
  raffleId,
  selectedNumbers,
  total,
  currency,
  paymentAlias,
}: ReservationFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReservationResult | null>(null)

  const formattedTotal = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(total)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedNumbers.length === 0) {
      return
    }

    setIsSubmitting(true)
    setError('')

    const form = event.currentTarget
    const formData = new FormData(form)

    formData.set('raffleId', raffleId)
    formData.set('numbers', JSON.stringify(selectedNumbers))
    formData.set('paymentMethod', paymentMethod)

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        body: formData,
      })

      const responseBody = (await response.json()) as {
        reservation?: ReservationResult
        error?: string
      }

      if (!response.ok || !responseBody.reservation) {
        throw new Error(
          responseBody.error ?? 'No pudimos completar la reserva.',
        )
      }

      setResult(responseBody.reservation)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No pudimos completar la reserva.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 size-6 shrink-0 text-emerald-400"
            aria-hidden="true"
          />

          <div>
            <h3 className="text-lg font-black text-emerald-300">
              ¡Reserva enviada!
            </h3>

            <p className="mt-2 leading-6 text-zinc-300">
              Los números{' '}
              <strong className="text-white">
                {result.numbers.map(formatNumber).join(', ')}
              </strong>{' '}
              quedaron reservados por{' '}
              <strong className="text-white">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency,
                  maximumFractionDigits: 0,
                }).format(result.totalAmount)}
              </strong>
              .
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Alondra revisará el pago y confirmará la reserva.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-4 border-[#c995a3] bg-white/80 text-[#5f3440] shadow-sm hover:border-[#ba7385] hover:bg-[#f8dfe6] hover:text-[#4b2630]"
              onClick={() => setResult(null)}
            >
              Hacer otra reserva
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedNumbers.length === 0) {
    return null
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5"
    >
      <div>
        <h3 className="text-lg font-black">Completá tu reserva</h3>

        <p className="mt-1 text-sm text-zinc-400">
          Reservás {selectedNumbers.length}{' '}
          {selectedNumbers.length === 1 ? 'número' : 'números'} por{' '}
          <strong className="text-white">{formattedTotal}</strong>.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Nombre y apellido
          <input
            required
            name="customerName"
            type="text"
            autoComplete="name"
            maxLength={120}
            placeholder="Tu nombre"
            className="h-11 rounded-xl border border-white/10 bg-zinc-900 px-3 text-base text-white transition outline-none placeholder:text-zinc-600 focus:border-red-500"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          WhatsApp
          <input
            required
            name="customerWhatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="Ej: 341 555 1234"
            className="h-11 rounded-xl border border-white/10 bg-zinc-900 px-3 text-base text-white transition outline-none placeholder:text-zinc-600 focus:border-red-500"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Forma de pago</legend>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name="paymentMethodChoice"
              value="transfer"
              checked={paymentMethod === 'transfer'}
              onChange={() => setPaymentMethod('transfer')}
            />

            <span className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition peer-checked:border-red-500 peer-checked:bg-red-500/10">
              <WalletCards
                className="size-5 shrink-0 text-red-400"
                aria-hidden="true"
              />

              <span>
                <strong className="block text-sm text-white">
                  Transferencia
                </strong>
                <span className="text-xs text-zinc-400">
                  Adjuntando comprobante
                </span>
              </span>
            </span>
          </label>

          <label className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name="paymentMethodChoice"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />

            <span className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition peer-checked:border-red-500 peer-checked:bg-red-500/10">
              <Banknote
                className="size-5 shrink-0 text-red-400"
                aria-hidden="true"
              />

              <span>
                <strong className="block text-sm text-white">Efectivo</strong>
                <span className="text-xs text-zinc-400">
                  Pendiente de confirmación
                </span>
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {paymentMethod === 'transfer' ? (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-zinc-300">
            Transferí <strong className="text-white">{formattedTotal}</strong>{' '}
            al alias:
          </p>

          <code className="mt-2 block font-bold text-red-300">
            {paymentAlias}
          </code>

          <label className="mt-4 grid gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Upload className="size-4 text-red-400" aria-hidden="true" />
              Comprobante
            </span>

            <input
              required
              name="paymentProof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full rounded-xl border border-white/10 bg-zinc-900 p-2 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-2 file:font-semibold file:text-white"
            />

            <span className="text-xs font-normal text-zinc-500">
              JPG, PNG, WEBP o PDF. Máximo 4 MB.
            </span>
          </label>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-zinc-300">
          Alondra recibirá la solicitud y podrá confirmarla cuando reciba el
          pago en efectivo.
        </p>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 h-12 w-full bg-red-600 text-base font-bold text-white hover:bg-red-500"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Procesando reserva...
          </>
        ) : (
          `Reservar por ${formattedTotal}`
        )}
      </Button>
    </form>
  )
}
