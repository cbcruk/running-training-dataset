/**
 * Offline for the dictionary.
 *
 * A reference work you cannot consult without a network is only half a reference
 * work. The whole corpus already ships inside the JS bundle (ADR 0001: that is the
 * feature, not the cost), so caching the shell and the hashed assets is enough to
 * make every entry readable offline.
 *
 * No build-time precache manifest: asset filenames are content-hashed, so the
 * worker learns them at runtime instead. Old caches are dropped on activate, and
 * hashed names mean a new deploy can never be served stale assets.
 */

const VERSION = 'v1'
const CACHE = `rtd-${VERSION}`
const SCOPE = new URL(self.registration.scope).pathname

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(SCOPE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Navigations: network first, so a fresh prerendered entry wins when online. Fall
// back to the cached copy of that entry, then to the shell - which can render any
// entry client-side from the bundled corpus, so an uncached URL still resolves
// offline.
async function handleNavigation(req) {
  const cache = await caches.open(CACHE)
  try {
    const fresh = await fetch(req)
    // Fire-and-forget: a failed cache write (quota, eviction) must not fail the fetch.
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
    return fresh
  } catch {
    return (await cache.match(req)) || (await cache.match(SCOPE)) || Response.error()
  }
}

// Assets: cache first. Filenames are content-hashed, so a hit is always correct.
async function handleAsset(req) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req)
  if (hit) return hit
  const fresh = await fetch(req)
  // Fire-and-forget: a failed cache write (quota, eviction) must not fail the fetch.
  if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
  return fresh
}

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    e.respondWith(handleNavigation(request))
  } else if (url.pathname.startsWith(SCOPE)) {
    e.respondWith(handleAsset(request))
  }
})
