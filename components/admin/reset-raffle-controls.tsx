'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

const REQUIRED_CONFIRMATION = 'REINICIAR'

export function ResetRaffleControls() {
  const { pending } = useFormStatus()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const isConfirmed = confirmation === REQUIRED_CONFIRMATION

  if (!isOpen) {
    return (
      <div className="flex justify-start sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="border-[#c594aa] bg-white/70 text-[#70485b] hover:bg-[#ffe5f0]"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reiniciar rifa
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#c594aa] bg-[#fff7fb] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-[#8f6277]"
          aria-hidden="true"
        />

        <div>
          <p className="font-bold text-[#4d2f3b]">
            Esta acción no se puede deshacer
          </p>

          <p className="mt-1 text-sm leading-6 text-[#765364]">
            Se eliminarán todas las reservas, ventas, rechazos y comprobantes.
            Los 100 números volverán a estar disponibles.
          </p>
        </div>
      </div>

      <label
        htmlFor="reset-confirmation"
        className="mt-4 block text-sm font-semibold text-[#4d2f3b]"
      >
        Escribí <strong>REINICIAR</strong> para confirmar
      </label>

      <input
        id="reset-confirmation"
        name="confirmation"
        type="text"
        value={confirmation}
        disabled={pending}
        autoComplete="off"
        onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
        className="px-upalta 3 mt-2 h-10 w-full rounded-lg border border-[#c594aa] bg-white text-sm font-semibold text-[#4d2f3b] transition outline-none placeholder:text-[#a58392] focus:border-[#8f6277] focus:ring-2 focus:ring-[#fdcae1]"
        placeholder="REINICIAR"
      />

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setConfirmation('')
            setIsOpen(false)
          }}
          className="border-[#c594aa] bg-white text-[#70485b]"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={!isConfirmed || pending}
          className="rounded-xl border border-[#991f3d] !bg-[#b42345] !text-white shadow-sm hover:!bg-[#951b38] disabled:!cursor-not-allowed disabled:!border-[#d98b9c] disabled:!bg-[#efb6c2] disabled:!text-[#702337] disabled:!opacity-100"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-4" aria-hidden="true" />
          )}

          {pending ? 'Reiniciando...' : 'Reiniciar definitivamente'}
        </Button>
      </div>
    </div>
  )
}
