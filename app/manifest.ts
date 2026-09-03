import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rifa Fácil',
    short_name: 'Rifa Fácil',
    description: 'Administración de reservas de la rifa.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#fff5f7',
    theme_color: '#d86983',
    lang: 'es-AR',
  }
}
