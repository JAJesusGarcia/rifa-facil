'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Copy, Gift, ShieldCheck, Ticket } from 'lucide-react'

import { PrizeShowcase } from '@/components/raffle/prize-showcase'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ReservationForm } from '@/components/raffle/reservation-form'

type Raffle = Pick<
  Database['public']['Tables']['raffles']['Row'],
  | 'id'
  | 'slug'
  | 'title'
  | 'description'
  | 'prize_title'
  | 'prize_description'
  | 'organizer_name'
  | 'payment_alias'
  | 'currency'
  | 'number_price'
  | 'bundle_quantity'
  | 'bundle_price'
  | 'total_numbers'
  | 'max_numbers_per_reservation'
  | 'draw_description'
>

type RaffleNumber = Pick<
  Database['public']['Tables']['raffle_numbers']['Row'],
  'id' | 'raffle_id' | 'number' | 'status' | 'reserved_until'
>

interface RaffleExperienceProps {
  raffle: Raffle
  initialNumbers: RaffleNumber[]
}

function formatNumber(number: number) {
  return number.toString().padStart(2, '0')
}

export function RaffleExperience({
  raffle,
  initialNumbers,
}: RaffleExperienceProps) {
  const supabase = useMemo(() => createClient(), [])
  const [numbers, setNumbers] = useState(initialNumbers)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [aliasCopied, setAliasCopied] = useState(false)
  const [showAlternatePhoto, setShowAlternatePhoto] = useState(false)

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: raffle.currency,
        maximumFractionDigits: 0,
      }),
    [raffle.currency],
  )

  useEffect(() => {
    const channel = supabase
      .channel(`raffle-numbers:${raffle.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raffle_numbers',
          filter: `raffle_id=eq.${raffle.id}`,
        },
        (payload) => {
          const updatedNumber = payload.new as RaffleNumber

          setNumbers((currentNumbers) =>
            currentNumbers.map((currentNumber) =>
              currentNumber.id === updatedNumber.id
                ? updatedNumber
                : currentNumber,
            ),
          )

          if (updatedNumber.status !== 'available') {
            setSelectedNumbers((currentSelection) =>
              currentSelection.filter(
                (number) => number !== updatedNumber.number,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [raffle.id, supabase])

  const paidCount = numbers.filter((number) => number.status === 'paid').length

  const reservedCount = numbers.filter(
    (number) => number.status === 'held' || number.status === 'pending',
  ).length

  const availableCount = numbers.filter(
    (number) => number.status === 'available',
  ).length

  const progress = Math.round((paidCount / raffle.total_numbers) * 100)

  const bundleQuantity = Math.max(1, raffle.bundle_quantity)

  const completeBundles = Math.floor(selectedNumbers.length / bundleQuantity)

  const remainingNumbers = selectedNumbers.length % bundleQuantity

  const total =
    completeBundles * Number(raffle.bundle_price) +
    remainingNumbers * Number(raffle.number_price)

  const formattedTotal = currencyFormatter.format(total)
  const formattedNumberPrice = currencyFormatter.format(
    Number(raffle.number_price),
  )
  const formattedBundlePrice = currencyFormatter.format(
    Number(raffle.bundle_price),
  )

  function toggleNumber(raffleNumber: RaffleNumber) {
    if (raffleNumber.status !== 'available') {
      return
    }

    setSelectedNumbers((currentSelection) => {
      if (currentSelection.includes(raffleNumber.number)) {
        return currentSelection.filter(
          (number) => number !== raffleNumber.number,
        )
      }

      if (currentSelection.length >= raffle.max_numbers_per_reservation) {
        return currentSelection
      }

      return [...currentSelection, raffleNumber.number].sort(
        (first, second) => first - second,
      )
    })
  }

  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(raffle.payment_alias)
      setAliasCopied(true)

      window.setTimeout(() => {
        setAliasCopied(false)
      }, 1800)
    } catch {
      setAliasCopied(false)
    }
  }

  return (
    <main className="raffle-pastel min-h-screen overflow-x-hidden font-sans text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950/40">
              <Ticket className="size-5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-lg font-black tracking-tight">Rifa Fácil</p>
              <p className="text-xs text-zinc-400">
                Organiza {raffle.organizer_name}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 shadow-sm">
            <span className="size-2.5 animate-pulse rounded-full bg-emerald-600" />
            Rifa activa
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
          <div className="grid min-w-0 md:grid-cols-[1.08fr_0.92fr]">
            <div className="order-2 min-w-0 border-t border-white/10 p-5 sm:p-7 md:order-1 md:border-t-0 md:border-r">
              <PrizeShowcase />
            </div>

            <div className="relative order-1 overflow-hidden p-6 sm:p-8 md:order-2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(234,167,182,0.36),_transparent_52%)]" />
              <div className="absolute -right-24 -bottom-24 size-72 rounded-full bg-pink-300/20 blur-3xl" />

              <div className="relative">
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAlternatePhoto((current) => !current)}
                    aria-label={
                      showAlternatePhoto
                        ? 'Mostrar primera foto de Alondra'
                        : 'Mostrar otra foto de Alondra'
                    }
                    title="Tocá para ver otra foto"
                    className="group relative size-20 shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-[#d86983] focus-visible:ring-offset-2 focus-visible:outline-none sm:size-24"
                    style={{
                      perspective: '1600px',
                    }}
                  >
                    <span
                      className="absolute inset-0 rounded-full border-2 border-red-500/60 bg-zinc-800 shadow-lg shadow-red-950/40"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: showAlternatePhoto
                          ? 'rotateY(180deg)'
                          : 'rotateY(0deg)',
                        transition:
                          'transform 1400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        willChange: 'transform',
                      }}
                    >
                      <span
                        className="absolute inset-0 overflow-hidden rounded-full"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        <Image
                          src="/images/alondra2.png"
                          alt={`Foto de ${raffle.organizer_name}`}
                          fill
                          priority
                          className="object-cover"
                          style={{
                            objectPosition: '50% 0%',
                          }}
                          sizes="(max-width: 639px) 80px, 96px"
                        />
                      </span>

                      <span
                        className="absolute inset-0 overflow-hidden rounded-full"
                        style={{
                          transform: 'rotateY(180deg)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        <Image
                          src="/images/alondra.png"
                          alt={`Otra foto de ${raffle.organizer_name}`}
                          fill
                          className="object-cover"
                          style={{
                            objectPosition: '50% 35%',
                          }}
                          sizes="(max-width: 639px) 80px, 96px"
                        />
                      </span>
                    </span>
                  </button>

                  <div>
                    <p className="text-lg font-black text-white">
                      Hola, soy {raffle.organizer_name} 👋
                    </p>

                    <p className="mt-1 text-sm leading-6 text-zinc-300">
                      Esta rifa me ayuda a costear mi próximo examen de
                      Taekwondo.
                    </p>
                  </div>
                </div>

                <p className="mb-2 text-sm font-bold tracking-[0.18em] text-red-400 uppercase">
                  {raffle.title}
                </p>

                <h1 className="max-w-xl text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-5xl">
                  {raffle.prize_title}
                </h1>

                <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
                  La persona ganadora podrá elegir una Essen de hasta{' '}
                  <strong className="font-black text-[#b84b63]">
                    $1.000.000
                  </strong>
                  .
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-400">1 número</p>

                    <p className="mt-1 text-xl font-black">
                      {formattedNumberPrice}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-200">
                      {raffle.bundle_quantity} números
                    </p>

                    <p className="mt-1 text-xl font-black text-red-400">
                      {formattedBundlePrice}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm leading-6 text-zinc-400">
                  <ShieldCheck
                    className="size-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />

                  <span>Sorteo transparente por Lotería Nacional</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-zinc-900/80 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-400">
                Avance de la rifa
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {paidCount} de {raffle.total_numbers} vendidos
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-emerald-500/10 px-3 py-2">
                <strong className="block text-emerald-400">
                  {availableCount}
                </strong>

                <span className="text-xs text-zinc-400">Disponibles</span>
              </div>

              <div className="rounded-xl bg-amber-500/10 px-3 py-2">
                <strong className="block text-amber-400">
                  {reservedCount}
                </strong>

                <span className="text-xs text-zinc-400">Reservados</span>
              </div>

              <div className="rounded-xl bg-red-500/10 px-3 py-2">
                <strong className="block text-red-400">{paidCount}</strong>

                <span className="text-xs text-zinc-400">Vendidos</span>
              </div>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-500 to-orange-400 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-right text-xs font-semibold text-zinc-500">
            {progress}% completado
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-zinc-900/80 p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-red-400">
                <Gift className="size-5" aria-hidden="true" />

                <span className="text-sm font-bold tracking-wider uppercase">
                  Elegí tus números
                </span>
              </div>

              <h2 className="text-2xl font-black">Del 00 al 99</h2>

              <p className="mt-1 text-sm text-zinc-400">
                Podés elegir hasta {raffle.max_numbers_per_reservation} números.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-[#d9aeb9] bg-[#fff8fa]" />
                Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-400" />
                Reservado
              </span>

              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500" />
                Vendido
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {numbers.map((raffleNumber) => {
              const isSelected = selectedNumbers.includes(raffleNumber.number)
              const isAvailable = raffleNumber.status === 'available'
              const isPaid = raffleNumber.status === 'paid'

              return (
                <button
                  key={raffleNumber.id}
                  type="button"
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  aria-label={`Número ${formatNumber(raffleNumber.number)}`}
                  onClick={() => toggleNumber(raffleNumber)}
                  className={[
                    'aspect-square rounded-xl border text-sm font-black transition duration-200 sm:text-base',
                    isSelected
                      ? 'scale-95 border-red-400 bg-red-500 text-white shadow-lg shadow-red-950/50'
                      : '',
                    isAvailable && !isSelected
                      ? 'border-white/10 bg-white/5 text-zinc-100 hover:-translate-y-0.5 hover:border-[#d86480]/60 hover:bg-[#f7dce3]'
                      : '',
                    !isAvailable && !isPaid
                      ? 'cursor-not-allowed border-amber-500/15 bg-amber-500/10 text-amber-500/60'
                      : '',
                    isPaid
                      ? 'cursor-not-allowed border-red-500/10 bg-red-500/10 text-red-500/40 line-through'
                      : '',
                  ].join(' ')}
                >
                  {isSelected ? (
                    <Check className="mx-auto size-5" aria-hidden="true" />
                  ) : (
                    formatNumber(raffleNumber.number)
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Tu selección</p>

              {selectedNumbers.length ? (
                <p className="mt-1 text-lg font-black">
                  Números {selectedNumbers.map(formatNumber).join(' y ')}
                </p>
              ) : (
                <p className="mt-1 font-semibold text-zinc-500">
                  Todavía no elegiste ningún número
                </p>
              )}
            </div>

            <div className="mt-4 sm:mt-0 sm:text-right">
              <p className="text-sm text-zinc-400">Total</p>

              <p className="text-2xl font-black text-red-400">
                {formattedTotal}
              </p>
            </div>
            <ReservationForm
              raffleId={raffle.id}
              selectedNumbers={selectedNumbers}
              total={total}
              currency={raffle.currency}
              paymentAlias={raffle.payment_alias}
            />
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5">
            <div className="flex items-center gap-2">
              <Copy className="size-5 text-red-400" aria-hidden="true" />

              <h2 className="font-bold">Alias para transferir</h2>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-black/30 p-3">
              <code className="truncate text-sm font-bold">
                {raffle.payment_alias}
              </code>

              <Button
                type="button"
                size="sm"
                onClick={copyAlias}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                {aliasCopied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-red-400" aria-hidden="true" />

              <h2 className="font-bold">¿Cuándo se sortea?</h2>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {raffle.draw_description}
            </p>
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-zinc-600">
          Gracias por colaborar con este próximo examen de Taekwondo.
        </footer>
      </div>
    </main>
  )
}
