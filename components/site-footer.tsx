import { Briefcase, MessageCircle } from 'lucide-react'

const whatsappMessage = encodeURIComponent(
  'Hola Jesús 👋 Vi la web de la rifa y quería consultarte por una página web.',
)

const whatsappUrl = `https://wa.me/5493416153479?text=${whatsappMessage}`

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ead0d6] bg-[#fff8fa] px-4 py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-[#a77481] uppercase">
          Designed &amp; developed by
        </p>

        <a
          href="https://linkedin.com/in/jesusjagarcia"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-lg font-semibold text-[#56333c] transition hover:text-[#ce5f79]"
        >
          Jesús García
        </a>

        <div className="mt-5 flex items-center gap-3">
          <a
            href="https://linkedin.com/in/jesusjagarcia"
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn de Jesús García"
            aria-label="Visitar el perfil de LinkedIn de Jesús García"
            className="grid size-10 place-items-center rounded-full border border-[#ddb6c0] bg-white/70 text-[#714652] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cb7187] hover:bg-[#f8e3e8] hover:text-[#b64d67]"
          >
            <Briefcase className="size-4" aria-hidden="true" />
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Contactar a Jesús García por WhatsApp"
            aria-label="Contactar a Jesús García por WhatsApp"
            className="grid size-10 place-items-center rounded-full border border-[#ddb6c0] bg-white/70 text-[#714652] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cb7187] hover:bg-[#f8e3e8] hover:text-[#b64d67]"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
