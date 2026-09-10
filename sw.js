const CACHE = 'mesheures-shell-v15.3';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg', './style/refonte.css', './scripts/app-core.js', './scripts/app-pwa.js', './scripts/app-ui.js', './scripts/app-parser.js', './scripts/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Coquille de l'app : cache-first, pour ouvrir MesHeures sans réseau.
  // Bibliothèques CDN (xlsx / pdf.js / tesseract) : mises en cache dès le premier
  // chargement, pour que l'import PDF/Excel/OCR fonctionne aussi hors-ligne ensuite.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
