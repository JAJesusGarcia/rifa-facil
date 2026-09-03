import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Banknote,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  LogOut,
  Phone,
  Ticket,
  WalletCards,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

import {
  confirmReservationAction,
  logoutAction,
  rejectReservationAction,
} from './actions'

type ReservationStatus = Database['public']['Enums']['reservation_status']

type PaymentProof = {
  storage_path: string
  original_filename: string
}

type DashboardReservation =
  Database['public']['Tables']['reservations']['Row'] & {
    reservation_numbers: Array<{
      number: number
    }>
    payment_proofs: PaymentProof | PaymentProof[] | null
  }

interface AdminPageProps {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

const statusLabels: Record<ReservationStatus, string> = {
  held: 'En proceso',
  pending: 'Pendiente',
  paid: 'Pagada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
}

const statusPriority: Record<ReservationStatus, number> = {
  pending: 0,
  held: 1,
  paid: 2,
  rejected: 3,
  expired: 4,
  cancelled: 5,
}

function getStatusClasses(status: ReservationStatus) {
  if (status === 'paid') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  }

  if (status === 'pending' || status === 'held') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  }

  return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
}

function getPaymentProof(
  paymentProofs: DashboardReservation['payment_proofs'],
) {
  if (Array.isArray(paymentProofs)) {
    return paymentProofs[0] ?? null
  }

  return paymentProofs
}

function formatNumber(number: number) {
  return number.toString().padStart(2, '0')
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(date))
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: raffles, error: rafflesError } = await supabase
    .from('raffles')
    .select('id, title, currency, total_numbers')
    .eq('owner_id', user.id)

  if (rafflesError) {
    throw new Error('No se pudo cargar la rifa.')
  }

  const raffleIds = raffles.map((raffle) => raffle.id)
  const currency = raffles[0]?.currency ?? 'ARS'

  let reservations: DashboardReservation[] = []
  let numberStatuses: Array<{ status: string }> = []

  if (raffleIds.length > 0) {
    const [reservationsResult, numbersResult] = await Promise.all([
      supabase
        .from('reservations')
        .select(
          `
          *,
          reservation_numbers (
            number
          ),
          payment_proofs (
            storage_path,
            original_filename
          )
        `,
        )
        .in('raffle_id', raffleIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('raffle_numbers')
        .select('status')
        .in('raffle_id', raffleIds),
    ])

    if (reservationsResult.error) {
      throw new Error('No se pudieron cargar las reservas.')
    }

    if (numbersResult.error) {
      throw new Error('No se pudieron cargar los números.')
    }

    reservations = (reservationsResult.data ??
      []) as unknown as DashboardReservation[]

    numberStatuses = numbersResult.data ?? []
  }

  reservations.sort((first, second) => {
    const statusDifference =
      statusPriority[first.status] - statusPriority[second.status]

    if (statusDifference !== 0) {
      return statusDifference
    }

    return (
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
    )
  })

  const admin = createAdminClient()

  const reservationsWithProofs = await Promise.all(
    reservations.map(async (reservation) => {
      const proof = getPaymentProof(reservation.payment_proofs)

      if (!proof) {
        return {
          ...reservation,
          proofUrl: null,
          proofFilename: null,
        }
      }

      const { data } = await admin.storage
        .from('payment-proofs')
        .createSignedUrl(proof.storage_path, 600)

      return {
        ...reservation,
        proofUrl: data?.signedUrl ?? null,
        proofFilename: proof.original_filename,
      }
    }),
  )

  const availableCount = numberStatuses.filter(
    (number) => number.status === 'available',
  ).length

  const reservedCount = numberStatuses.filter(
    (number) => number.status === 'held' || number.status === 'pending',
  ).length

  const paidCount = numberStatuses.filter(
    (number) => number.status === 'paid',
  ).length

  const pendingCount = reservations.filter(
    (reservation) =>
      reservation.status === 'pending' || reservation.status === 'held',
  ).length

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <main className="min-h-screen bg-[#0b0b0d] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-red-600">
              <Ticket className="size-5" aria-hidden="true" />
            </div>

            <div>
              <h1 className="text-xl font-black">Panel de la rifa</h1>
              <p className="text-sm text-zinc-400">
                {raffles[0]?.title ?? 'Sin rifas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
            >
              Ver rifa
            </Link>

            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Salir
              </Button>
            </form>
          </div>
        </header>

        {params.success ? (
          <p className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {params.success}
          </p>
        ) : null}

        {params.error ? (
          <p className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
            {params.error}
          </p>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">Por revisar</p>
            <strong className="mt-1 block text-3xl text-amber-400">
              {pendingCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-200">Disponibles</p>
            <strong className="mt-1 block text-3xl text-emerald-400">
              {availableCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-200">Vendidos</p>
            <strong className="mt-1 block text-3xl text-red-400">
              {paidCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Reservados</p>
            <strong className="mt-1 block text-3xl">{reservedCount}</strong>
          </div>
        </section>

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-red-400">Administración</p>
            <h2 className="mt-1 text-2xl font-black">Reservas y pagos</h2>
          </div>

          {reservationsWithProofs.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-zinc-900/50 p-10 text-center">
              <Clock3
                className="mx-auto size-8 text-zinc-600"
                aria-hidden="true"
              />

              <p className="mt-3 font-semibold text-zinc-300">
                Todavía no hay reservas
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Las nuevas solicitudes aparecerán en este panel.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {reservationsWithProofs.map((reservation) => {
                const numbers = reservation.reservation_numbers
                  .map((item) => item.number)
                  .sort((first, second) => first - second)

                const canConfirm = reservation.status === 'pending'

                const canReject =
                  reservation.status === 'pending' ||
                  reservation.status === 'held'

                return (
                  <article
                    key={reservation.id}
                    className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">
                            {reservation.customer_name}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                              reservation.status,
                            )}`}
                          >
                            {statusLabels[reservation.status]}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
                          <span className="flex items-center gap-2">
                            <Phone className="size-4" aria-hidden="true" />
                            {reservation.customer_whatsapp}
                          </span>

                          <span className="flex items-center gap-2">
                            {reservation.payment_method === 'transfer' ? (
                              <WalletCards
                                className="size-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <Banknote className="size-4" aria-hidden="true" />
                            )}

                            {reservation.payment_method === 'transfer'
                              ? 'Transferencia'
                              : 'Efectivo'}
                          </span>

                          <span className="flex items-center gap-2">
                            <Clock3 className="size-4" aria-hidden="true" />
                            {formatDate(reservation.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-sm text-zinc-500">Importe</p>
                        <p className="text-2xl font-black text-red-400">
                          {formatCurrency(Number(reservation.total_amount))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-semibold text-zinc-400">
                        Números
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {numbers.map((number) => (
                          <span
                            key={number}
                            className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-sm font-black"
                          >
                            {formatNumber(number)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {reservation.proofUrl ? (
                      <a
                        href={reservation.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
                      >
                        <FileText className="size-4" aria-hidden="true" />
                        Ver comprobante
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}

                    {canConfirm || canReject ? (
                      <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 lg:grid-cols-[auto_1fr]">
                        {canConfirm ? (
                          <form action={confirmReservationAction}>
                            <input
                              type="hidden"
                              name="reservationId"
                              value={reservation.id}
                            />

                            <Button
                              type="submit"
                              className="w-full bg-emerald-600 text-white hover:bg-emerald-500 lg:w-auto"
                            >
                              <Check className="size-4" aria-hidden="true" />
                              Confirmar pago
                            </Button>
                          </form>
                        ) : null}

                        {canReject ? (
                          <form
                            action={rejectReservationAction}
                            className="flex flex-col gap-2 sm:flex-row"
                          >
                            <input
                              type="hidden"
                              name="reservationId"
                              value={reservation.id}
                            />

                            <input
                              name="reason"
                              type="text"
                              maxLength={240}
                              placeholder="Motivo del rechazo (opcional)"
                              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500"
                            />

                            <Button
                              type="submit"
                              variant="outline"
                              className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                            >
                              <X className="size-4" aria-hidden="true" />
                              Rechazar
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
