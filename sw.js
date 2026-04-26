/* ════════════════════════════════════════════════════════════════
   PUNTO ROJO · SERVICE WORKER
   Permite que la app funcione sin internet una vez instalada.
   Estrategia:
     - Archivos propios (HTML/manifest/icono): cache-first
     - Recursos externos (fonts, Chart.js): network-first con fallback
   Para forzar actualización: subir el número de CACHE_VERSION.
   ════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v9-design-refresh';
const CACHE_NAME = 'puntorojo-' + CACHE_VERSION;

// Archivos básicos que se cachean al instalar
const CORE_ASSETS = [
  './',
  './index.html',
  './puntorojo.html',
  './manifest.json',
  './logo.png',
  './icon.svg'
];

// ── INSTALL: pre-cachear los archivos básicos ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falla si UNO falla; usamos add individual con catch
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW: no se pudo cachear', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar versiones viejas del cache ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('puntorojo-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: estrategia cache-first con fallback a red ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo cachear GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Para navegación (HTML), intentar red primero (para tener última versión),
  // pero si no hay internet, usar lo cacheado.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./puntorojo.html') || caches.match('./index.html'))
        )
    );
    return;
  }

  // Para todo lo demás (CSS, JS, imágenes, fuentes): cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Solo cachear respuestas exitosas
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Si todo falla, devolvemos lo que haya en caché aunque sea viejo
          return caches.match(req);
        });
    })
  );
});

// ── MENSAJES: permitir que la app fuerce actualización ──
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
