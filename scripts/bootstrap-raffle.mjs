import { createClient } from '@supabase/supabase-js'

const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'RIFA_ADMIN_EMAIL',
  'RIFA_ADMIN_PASSWORD',
  'RIFA_CONTACT_WHATSAPP',
]

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing environment variable: ${variable}`)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

async function findUserByEmail(email) {
  let page = 1
  const perPage = 100

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    )

    if (user) {
      return user
    }

    if (data.users.length < perPage) {
      return null
    }

    page += 1
  }
}

async function bootstrap() {
  const email = process.env.RIFA_ADMIN_EMAIL.trim().toLowerCase()
  const password = process.env.RIFA_ADMIN_PASSWORD
  const contactWhatsapp = process.env.RIFA_CONTACT_WHATSAPP.trim()

  if (password.length < 8) {
    throw new Error(
      'The administrator password must have at least 8 characters',
    )
  }

  let adminUser = await findUserByEmail(email)

  if (!adminUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'raffle_admin',
      },
    })

    if (error) {
      throw error
    }

    adminUser = data.user
    console.log('Administrator created successfully')
  } else {
    console.log('Administrator already exists')
  }

  const { data: raffle, error: raffleError } = await supabase
    .from('raffles')
    .upsert(
      {
        owner_id: adminUser.id,
        slug: 'examen-taekwondo',
        title: 'Rifa para mi examen de Taekwondo',
        description:
          'Ayudame a costear mi próximo examen de Taekwondo, una actividad que me apasiona muchísimo.',
        prize_title: 'Una Essen a elección',
        prize_description:
          'La persona ganadora podrá elegir una Essen de hasta $1.000.000.',
        organizer_name: 'Alondra',
        contact_whatsapp: contactWhatsapp,
        payment_alias: 'Alondra.chividini',
        currency: 'ARS',
        number_price: 6000,
        bundle_quantity: 2,
        bundle_price: 10000,
        total_numbers: 100,
        max_numbers_per_reservation: 2,
        reservation_duration_minutes: 120,
        draw_description:
          'Sorteo por Lotería Nacional Nocturna al finalizar la venta.',
        status: 'active',
      },
      {
        onConflict: 'slug',
      },
    )
    .select('id, slug, status')
    .single()

  if (raffleError) {
    throw raffleError
  }

  const { count, error: countError } = await supabase
    .from('raffle_numbers')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('raffle_id', raffle.id)

  if (countError) {
    throw countError
  }

  if (count !== 100) {
    throw new Error(`Expected 100 raffle numbers but found ${count}`)
  }

  console.log('Initial raffle created successfully')
  console.log(`Raffle ID: ${raffle.id}`)
  console.log(`Slug: ${raffle.slug}`)
  console.log(`Status: ${raffle.status}`)
  console.log(`Available numbers: ${count}`)
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error.message)
  process.exitCode = 1
})
