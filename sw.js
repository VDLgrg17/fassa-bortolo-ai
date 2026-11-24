// [F9] Cache della PWA | Dipende da F0, F4, F5, F8 | STABLE | 2026-11-25
// [31] Definisce una cache dedicata alla sola interfaccia pubblica.
const CACHE_PREFIX = 'fassa-ai-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/logo-fassa.png', './assets/icon-192.png', './assets/icon-512.png'];

// [32] Salva la shell e attiva la nuova versione quando è disponibile.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

// [33] Rimuove solo le vecchie cache della stessa PWA.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

// [34] Usa la rete per la navigazione e conserva un ripiego offline della sola pagina.
async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match('./index.html');
    if (cached) return cached;
    return new Response('Connessione non disponibile.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

// [35] Intercetta soltanto richieste della propria origine e non ChatGPT.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
