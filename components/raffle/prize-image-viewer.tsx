'use client'

import { useId, useRef } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

type PrizeImageViewerProps = {
  src: string
  alt: string
  option: string
}

export function PrizeImageViewer({ src, alt, option }: PrizeImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  function openImage() {
    dialogRef.current?.showModal()
  }

  function closeImage() {
    dialogRef.current?.close()
  }

  return (
    <>
      <button
        type="button"
        onClick={openImage}
        aria-label={`Ampliar imagen de ${alt}`}
        className="group/image relative block h-40 w-full cursor-zoom-in overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.65),_rgba(247,220,227,0.35)_70%)]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain p-3 transition-transform duration-300 group-hover/image:scale-105"
          sizes="(max-width: 767px) 220px, 240px"
        />

        <span className="absolute top-3 left-3 rounded-full border border-[#d98a9d] bg-[#55363e] px-2.5 py-1 text-xs font-black text-[#ffb1c1]">
          Opción {option}
        </span>

        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full border border-[#d8a9b5] bg-white/85 text-[#6d3948] shadow-sm backdrop-blur-sm transition group-hover/image:scale-110 group-hover/image:bg-white"
        >
          <ZoomIn className="size-4" />
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeImage()
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-[#e2b9c3] bg-[#fff8fa] p-0 text-[#512f38] shadow-2xl backdrop:bg-[#2f1620]/75 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <button
            type="button"
            onClick={closeImage}
            aria-label="Cerrar imagen ampliada"
            className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-[#55363e] text-white shadow-lg transition hover:scale-105 hover:bg-[#6b414c]"
          >
            <X className="size-5" />
          </button>

          <div className="relative h-[70vh] max-h-[36rem] min-h-72 w-full bg-gradient-to-br from-white to-[#f8e3e8]">
            <Image
              src={src}
              alt={alt}
              fill
              priority
              className="object-contain p-6 sm:p-10"
              sizes="(max-width: 767px) 90vw, 672px"
            />
          </div>

          <div className="border-t border-[#ead0d6] px-5 py-4">
            <p className="text-xs font-bold tracking-[0.15em] text-[#d65d79] uppercase">
              Opción {option}
            </p>

            <h2 id={titleId} className="mt-1 text-lg font-bold">
              {alt}
            </h2>
          </div>
        </div>
      </dialog>
    </>
  )
}
