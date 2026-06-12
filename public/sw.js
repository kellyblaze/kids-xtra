const CACHE_NAME = "kids-xtra-v1"

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
