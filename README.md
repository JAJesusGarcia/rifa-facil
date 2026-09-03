<div align="center">

🎟️ Rifa Fácil

Reservas de números, comprobantes y administración en un solo lugar

Ver aplicación · Repositorio

</div>

Acerca del proyecto

Rifa Fácil es una aplicación web responsive para administrar una rifa de números del 00 al 99. Permite que cada participante seleccione sus números, informe cómo realizará el pago y adjunte un comprobante cuando corresponda.

El panel privado concentra la gestión completa: revisión de reservas, comprobación de pagos, rechazo de solicitudes, contacto directo por WhatsApp, notificaciones push y reinicio protegido de la rifa.

La primera implementación fue creada para colaborar con la financiación de un examen de Taekwondo mediante el sorteo de un premio Essen.

Funcionalidades

Experiencia pública

Grilla interactiva de números del 00 al 99.

Identificación visual de números disponibles, reservados y vendidos.

Selección de hasta 20 números por operación.

Cálculo automático del importe y aplicación de precios por cantidad.

Formulario con nombre, WhatsApp y método de pago.

Pagos por transferencia o efectivo.

Carga de comprobantes en JPG, PNG, WEBP o PDF.

Validaciones de datos, archivos y disponibilidad en tiempo real.

Confirmación visual al completar una reserva.

Diseño responsive optimizado para teléfonos.

Experiencia instalable como aplicación web.

Panel administrativo

Acceso protegido con Supabase Auth.

Resumen de números disponibles, reservados, vendidos y pendientes de revisión.

Filtros por estado: todos, reservados, vendidos y rechazados.

Visualización segura de comprobantes mediante enlaces temporales.

Confirmación y rechazo de reservas con estados de carga.

Mensajes toast para inicio y cierre de sesión y acciones administrativas.

Acceso directo al chat de WhatsApp de cada participante.

Mensajes de WhatsApp adaptados al estado de la reserva.

Actualización automática del panel.

Notificaciones push ante nuevas reservas.

Reinicio protegido para eliminar la actividad y devolver la rifa a cero.

Tecnologías

Área

Tecnología

Framework

Next.js 16 con App Router y Turbopack

Interfaz

React 19, Tailwind CSS 4 y shadcn

Lenguaje

TypeScript

Base de datos

Supabase PostgreSQL

Autenticación

Supabase Auth

Archivos

Supabase Storage

Validaciones

Zod

Notificaciones

Web Push y Service Worker

Iconos

Lucide React

Despliegue

Vercel

Gestor de paquetes

pnpm

Requisitos

Node.js 20.9 o superior.

pnpm 11 o superior.

Una cuenta y un proyecto en Supabase.

Supabase CLI para aplicar migraciones y generar tipos.

Una cuenta de Vercel para el despliegue.

Instalación local

Cloná el repositorio e instalá las dependencias:

git clone https://github.com/JAJesusGarcia/rifa-facil.git
cd rifa-facil
pnpm install

Creá un archivo .env.local en la raíz del proyecto:

NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
SUPABASE_SECRET_KEY=TU_CLAVE_SECRETA

NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_CLAVE_VAPID_PUBLICA
VAPID_PRIVATE_KEY=TU_CLAVE_VAPID_PRIVADA
VAPID_SUBJECT=mailto:contacto@ejemplo.com

Nunca subas .env.local, SUPABASE_SECRET_KEY ni VAPID_PRIVATE_KEY al repositorio.

Iniciá el servidor de desarrollo:

pnpm dev

Luego abrí http://localhost:3000.

Configuración de Supabase

Iniciá sesión, vinculá el proyecto y aplicá las migraciones:

pnpm exec supabase login
pnpm exec supabase link --project-ref TU_PROJECT_REF
pnpm exec supabase db push

Generá los tipos de la base de datos:

pnpm exec supabase gen types typescript --linked --schema public | Set-Content -Encoding utf8 types/database.ts

Para cargar la configuración inicial de la rifa:

node --env-file=.env.local scripts/bootstrap-raffle.mjs

El esquema incluye el flujo de reservas, estados de números, comprobantes, suscripciones push y operaciones administrativas.

Notificaciones push

Generá un par de claves VAPID:

pnpm exec web-push generate-vapid-keys

Guardá la clave pública y la privada en sus respectivas variables de entorno. La clave pública puede utilizarse en el navegador; la privada debe permanecer exclusivamente en el servidor.

Para recibir notificaciones en iOS, la aplicación debe abrirse desde el acceso directo agregado a la pantalla de inicio. En Android y navegadores de escritorio compatibles, el usuario debe autorizar las notificaciones desde el panel administrativo.

Comandos disponibles

Comando

Descripción

pnpm dev

Inicia el entorno de desarrollo

pnpm build

Genera el build optimizado de producción

pnpm start

Ejecuta el build de producción

pnpm lint

Analiza el código con ESLint

pnpm format

Formatea el proyecto con Prettier

pnpm format:check

Comprueba el formato sin modificar archivos

Antes de integrar cambios:

pnpm format
pnpm lint
pnpm build
git diff --check

Estructura principal

app/
├── admin/ # Autenticación y panel administrativo
├── api/ # Reservas y suscripciones push
├── globals.css # Tema y estilos globales
└── page.tsx # Página pública

components/
├── admin/ # Controles exclusivos del panel
├── raffle/ # Experiencia pública de la rifa
└── ui/ # Componentes reutilizables

lib/
├── supabase/ # Clientes de Supabase
└── push-notifications.ts # Envío de notificaciones web push

public/ # Imágenes, manifest y Service Worker
scripts/ # Inicialización de la rifa
supabase/migrations/ # Historial del esquema PostgreSQL
types/database.ts # Tipos generados desde Supabase

Seguridad

Las operaciones administrativas se ejecutan únicamente después de validar la sesión.

Las claves privadas se utilizan exclusivamente del lado del servidor.

Los comprobantes se almacenan en un bucket privado.

Los enlaces a comprobantes son firmados y tienen una duración limitada.

La disponibilidad de números se valida en la base de datos para evitar reservas duplicadas.

El reinicio completo exige una confirmación explícita desde el panel.

Despliegue

El proyecto está preparado para desplegarse en Vercel. Configurá todas las variables de entorno para Production y Preview y conectá el repositorio de GitHub.

Cada actualización integrada en main genera automáticamente un nuevo despliegue de producción.

También podés desplegar manualmente con:

pnpm dlx vercel@latest --prod

Autor

Desarrollado por Jesús García.

GitHub: @JAJesusGarcia

Perfil profesional: Lighting Designer, VJ y desarrollador Full Stack.

<div align="center">

Hecho con dedicación para transformar una gestión manual en una experiencia simple, segura y accesible.

</div>
