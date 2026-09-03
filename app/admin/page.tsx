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

type ReservationFilter = 'all' | 'pending' | 'paid' | 'rejected'

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
    status?: string
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

const emptyStateMessages: Record<
  ReservationFilter,
  {
    title: string
    description: string
  }
> = {
  all: {
    title: 'Todavía no hay reservas',
    description: 'Las nuevas solicitudes aparecerán en este panel.',
  },
  pending: {
    title: 'No hay reservas pendientes',
    description: 'No quedan pagos o solicitudes por revisar.',
  },
  paid: {
    title: 'Todavía no hay ventas confirmadas',
    description: 'Las reservas confirmadas aparecerán en esta sección.',
  },
  rejected: {
    title: 'No hay reservas rechazadas',
    description: 'Las reservas que rechaces aparecerán en esta sección.',
  },
}

function getReservationFilter(status?: string): ReservationFilter {
  if (status === 'pending' || status === 'paid' || status === 'rejected') {
    return status
  }

  return 'all'
}

function matchesReservationFilter(
  status: ReservationStatus,
  filter: ReservationFilter,
) {
  if (filter === 'all') {
    return true
  }

  if (filter === 'pending') {
    return status === 'pending' || status === 'held'
  }

  return status === filter
}

function getStatusClasses(status: ReservationStatus) {
  if (status === 'paid') {
    return 'border-[#78c9af] bg-[#dff5ee] text-[#17664f]'
  }

  if (status === 'pending' || status === 'held') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  }

  if (status === 'rejected') {
    return 'border-red-500/20 bg-red-500/10 text-red-300'
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

function formatNumberList(numbers: number[]) {
  const formattedNumbers = numbers.map(formatNumber)

  if (formattedNumbers.length <= 1) {
    return formattedNumbers[0] ?? ''
  }

  return `${formattedNumbers.slice(0, -1).join(', ')} y ${
    formattedNumbers.at(-1) ?? ''
  }`
}

function normalizeWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.startsWith('549')) {
    return digits
  }

  if (digits.startsWith('54')) {
    return `549${digits.slice(2)}`
  }

  digits = digits.replace(/^0/, '')

  return `549${digits}`
}

function getWhatsAppUrl(reservation: DashboardReservation, numbers: number[]) {
  const formattedNumbers = formatNumberList(numbers)
  let message: string

  if (reservation.status === 'paid') {
    message = `Hola ${reservation.customer_name} 👋 ¡Muchas gracias por participar en mi rifa! Tu pago quedó confirmado para los números ${formattedNumbers}. ¡Mucha suerte! 🍀`
  } else if (reservation.status === 'rejected') {
    message = `Hola ${reservation.customer_name} 👋 Te escribo por tu reserva de la rifa. No pude confirmar el pago de los números ${formattedNumbers}. Si querés, escribime y lo revisamos.`
  } else if (reservation.payment_method === 'cash') {
    message = `Hola ${reservation.customer_name} 👋 Tenés reservados los números ${formattedNumbers}. Coordinemos el pago en efectivo para confirmar tu participación.`
  } else {
    message = `Hola ${reservation.customer_name} 👋 Tenés reservados los números ${formattedNumbers}. Cuando puedas, enviame el comprobante para confirmar tu participación.`
  }

  const phone = normalizeWhatsAppNumber(reservation.customer_whatsapp)

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const activeFilter = getReservationFilter(params.status)

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

  const reservedReservationsCount = reservations.filter(
    (reservation) =>
      reservation.status === 'pending' || reservation.status === 'held',
  ).length

  const paidReservationsCount = reservations.filter(
    (reservation) => reservation.status === 'paid',
  ).length

  const rejectedReservationsCount = reservations.filter(
    (reservation) => reservation.status === 'rejected',
  ).length

  const filteredReservations = reservations.filter((reservation) =>
    matchesReservationFilter(reservation.status, activeFilter),
  )

  const admin = createAdminClient()

  const reservationsWithProofs = await Promise.all(
    filteredReservations.map(async (reservation) => {
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

  const filterOptions: Array<{
    value: ReservationFilter
    label: string
    count: number
  }> = [
    {
      value: 'all',
      label: 'Todos',
      count: reservations.length,
    },
    {
      value: 'pending',
      label: 'Reservados',
      count: reservedReservationsCount,
    },
    {
      value: 'paid',
      label: 'Vendidos',
      count: paidReservationsCount,
    },
    {
      value: 'rejected',
      label: 'Rechazados',
      count: rejectedReservationsCount,
    },
  ]

  const emptyState = emptyStateMessages[activeFilter]

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <main className="raffle-pastel min-h-screen px-4 py-6 text-white sm:px-6">
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
          <div className="rounded-2xl border border-[#e5b36a] bg-[#fff1dc] p-4">
            <p className="text-sm font-semibold text-[#7b4b10]">Por revisar</p>

            <strong className="mt-1 block text-3xl text-[#b56300]">
              {pendingCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-[#e4c0c9] bg-[#fff8fa] p-4">
            <p className="text-sm text-[#75434f]">Disponibles</p>

            <strong className="mt-1 block text-3xl text-[#9b5364]">
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
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold text-red-400">
                Administración
              </p>

              <h2 className="mt-1 text-2xl font-black">Reservas y pagos</h2>
            </div>

            <nav
              aria-label="Filtrar reservas"
              className="flex max-w-full [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
            >
              {filterOptions.map((option) => {
                const isActive = option.value === activeFilter

                const href =
                  option.value === 'all'
                    ? '/admin'
                    : `/admin?status=${option.value}`

                return (
                  <Link
                    key={option.value}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex min-w-max items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                      isActive
                        ? 'border-[#d86983] bg-[#d86983] text-white shadow-sm'
                        : 'border-[#e4c0c9] bg-white/60 text-[#68404a] hover:border-[#d99bad] hover:bg-[#f9e6eb]'
                    }`}
                  >
                    {option.label}

                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#f3dce2] text-[#7c4a57]'
                      }`}
                    >
                      {option.count}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {reservationsWithProofs.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-zinc-900/50 p-10 text-center">
              <Clock3
                className="mx-auto size-8 text-zinc-600"
                aria-hidden="true"
              />

              <p className="mt-3 font-semibold text-zinc-300">
                {emptyState.title}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {emptyState.description}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {reservationsWithProofs.map((reservation) => {
                const numbers = reservation.reservation_numbers
                  .map((item) => item.number)
                  .sort((first, second) => first - second)

                const whatsappUrl = getWhatsAppUrl(reservation, numbers)

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
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir conversación en WhatsApp"
                            aria-label={`Hablar con ${reservation.customer_name} por WhatsApp`}
                            className="flex items-center gap-2 font-medium text-[#8b5361] underline-offset-4 transition hover:text-[#c65370] hover:underline"
                          >
                            <Phone className="size-4" aria-hidden="true" />
                            {reservation.customer_whatsapp}
                            <ExternalLink
                              className="size-3"
                              aria-hidden="true"
                            />
                          </a>

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
