const CACHE_NAME = "kids-xtra-v3"

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  if (url.hostname.includes("supabase")) return
  // Skip RSC prefetch requests — each URL variant needs its own cache key
  if (event.request.headers.get("RSC") || url.searchParams.has("_rsc")) return

  if (url.pathname.startsWith("/_next/static/")) {
    // Cache-first for hashed static assets — these never change
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok && res.type === "basic") {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  if (url.pathname.startsWith("/kid/")) {
    // Stale-while-revalidate for kid pages — serve from cache instantly, refresh in background
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((res) => {
            if (res.ok && res.type === "basic") cache.put(event.request, res.clone())
            return res
          }).catch(() => cached)
          return cached || networkFetch
        })
      )
    )
    return
  }

  // Network-first for all other pages (parent dashboard, etc.)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
