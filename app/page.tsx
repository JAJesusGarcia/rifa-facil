import { notFound } from 'next/navigation'

import { RaffleExperience } from '@/components/raffle/raffle-experience'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const { data: raffle, error: raffleError } = await supabase
    .from('raffles')
    .select(
      `
        id,
        slug,
        title,
        description,
        prize_title,
        prize_description,
        organizer_name,
        payment_alias,
        currency,
        number_price,
        bundle_quantity,
        bundle_price,
        total_numbers,
        max_numbers_per_reservation,
        draw_description
      `,
    )
    .eq('slug', 'examen-taekwondo')
    .eq('status', 'active')
    .single()

  if (raffleError || !raffle) {
    notFound()
  }

  const { data: numbers, error: numbersError } = await supabase
    .from('raffle_numbers')
    .select('id, raffle_id, number, status, reserved_until')
    .eq('raffle_id', raffle.id)
    .order('number')

  if (numbersError) {
    throw new Error('No se pudieron cargar los números de la rifa')
  }

  return <RaffleExperience raffle={raffle} initialNumbers={numbers ?? []} />
}
