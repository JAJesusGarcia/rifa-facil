self.addEventListener('push', (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = {
        body: event.data.text(),
      }
    }
  }

  const title = payload.title || 'Rifa Fácil'

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      const visibleAdminClient = windowClients.find((client) => {
        const clientUrl = new URL(client.url)

        return (
          clientUrl.origin === self.location.origin &&
          clientUrl.pathname.startsWith('/admin') &&
          client.visibilityState === 'visible'
        )
      })

      if (visibleAdminClient) {
        visibleAdminClient.postMessage({
          type: 'raffle:new-reservation',
        })
      }

      await self.registration.showNotification(title, {
        body: payload.body || 'Tenés una nueva reserva para revisar.',
        data: {
          url: payload.url || '/admin',
        },
        tag: payload.tag || 'raffle-notification',
        renotify: true,
        silent: Boolean(visibleAdminClient),
        vibrate: [180, 90, 180],
      })
    })(),
  )
})

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const destination = new URL(
    event.notification.data?.url || '/admin',
    self.location.origin,
  ).href

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            if ('navigate' in client) {
              await client.navigate(destination)
            }

            return client.focus()
          }
        }

        return self.clients.openWindow(destination)
      }),
  )
})
