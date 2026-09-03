'use client'

import { useFormStatus } from 'react-dom'
import { Check, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ReservationActionButtonProps {
  action: 'confirm' | 'reject'
}

export function ReservationActionButton({
  action,
}: ReservationActionButtonProps) {
  const { pending } = useFormStatus()

  const isConfirm = action === 'confirm'

  const label = isConfirm ? 'Confirmar pago' : 'Rechazar'
  const pendingLabel = isConfirm ? 'Confirmando...' : 'Rechazando...'

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      variant={isConfirm ? 'default' : 'outline'}
      className={
        isConfirm
          ? 'w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-75 lg:w-auto'
          : 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-75'
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : isConfirm ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <X className="size-4" aria-hidden="true" />
      )}

      {pending ? pendingLabel : label}
    </Button>
  )
}
