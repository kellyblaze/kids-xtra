const CACHE_NAME = "kids-xtra-v2"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload = { title: "Kids Xtra", body: "You have a new notification", url: "/parent/approvals" }
  try { payload = { ...payload, ...JSON.parse(event.data.text()) } } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: payload.url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/parent/approvals"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})

// Network-first: always try the network; only serve cache if offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Never cache Supabase API calls
  if (url.hostname.includes("supabase")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache Next.js static assets (content-hashed filenames — safe to cache long-term)
        if (url.pathname.startsWith("/_next/static/")) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
