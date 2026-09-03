import Image from 'next/image'

const prizes = [
  {
    number: '01',
    name: 'Flip a elección',
    description: 'Elegí el modelo que más te guste',
    image: '/images/premio-flip.png',
  },
  {
    number: '02',
    name: 'Sartén de 24 cm',
    description: 'Color a elección',
    image: '/images/premio-sarten.png',
  },
  {
    number: '03',
    name: 'Wok + pelador',
    description: 'Un combo práctico para todos los días',
    image: '/images/premio-wok.png',
  },
  {
    number: '04',
    name: 'Cacerola + Savarín',
    description: 'Cacerola de 18 cm y Savarín a elección',
    image: '/images/premio-cacerola.png',
  },
]

export function PrizeShowcase() {
  return (
    <div className="h-full min-w-0 overflow-hidden">
      <div className="mb-5">
        <p className="text-sm font-bold tracking-[0.18em] text-red-400 uppercase">
          Elegí tu premio
        </p>

        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Si ganás, podés elegir cualquiera de estas opciones.
        </p>
      </div>

      <div
        className="flex w-full max-w-full snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain pb-3 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Opciones de premios"
      >
        {prizes.map((prize) => (
          <article
            key={prize.number}
            className="group flex w-[82%] max-w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:w-[260px] md:w-auto md:max-w-none md:min-w-0 md:snap-none"
          >
            <div className="relative h-36 shrink-0 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.14),_rgba(255,255,255,0.02)_70%)] sm:h-40">
              <Image
                src={prize.image}
                alt={prize.name}
                fill
                className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 639px) 75vw, (max-width: 767px) 260px, 220px"
              />

              <span className="absolute top-3 left-3 rounded-full border border-red-400/25 bg-black/70 px-2.5 py-1 text-xs font-black text-red-300 backdrop-blur">
                Opción {prize.number}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-base font-bold text-white">{prize.name}</h3>

              <p className="mt-1 text-sm leading-5 text-zinc-400">
                {prize.description}
              </p>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-zinc-500 md:hidden">
        Deslizá hacia los costados para ver todos los premios
      </p>
    </div>
  )
}
