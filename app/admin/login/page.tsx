import { LockKeyhole, Ticket } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

import { loginAction } from '../actions'

interface AdminLoginPageProps {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-red-600">
            <Ticket className="size-6" aria-hidden="true" />
          </div>

          <div>
            <p className="text-xl font-black">Rifa Fácil</p>
            <p className="text-sm text-zinc-400">Administración de la rifa</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-5 text-red-400" aria-hidden="true" />
            <h1 className="text-2xl font-black">Ingresar</h1>
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Acceso exclusivo para la persona organizadora.
          </p>
        </div>

        {params.error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {params.error}
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="administrador@email.com"
              className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 text-base text-white transition outline-none placeholder:text-zinc-600 focus:border-red-500"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Contraseña
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 text-base text-white transition outline-none placeholder:text-zinc-600 focus:border-red-500"
            />
          </label>

          <Button
            type="submit"
            className="mt-2 h-12 bg-red-600 text-base font-bold text-white hover:bg-red-500"
          >
            Ingresar al panel
          </Button>
        </form>
      </section>
    </main>
  )
}
