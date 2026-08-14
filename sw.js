const CACHE_NAME = 'frekvens-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png'
];

// Installer og cache alle statiske filer
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Offline-first strategi med CSV-bypass
self.addEventListener('fetch', event => {
  // ⭐ CSV-filer: Bypass cache ALTID (vigtigt for FileReader)
  if (event.request.url.includes('.csv') ||
      event.request.method === 'POST' ||
      event.request.headers.get('Range')) {
    return fetch(event.request).catch(() => {
      // Hvis offline: ignorer (FileReader håndterer det)
      return;
    });
  }

  // ⭐ Alle andre filer: Offline-first (cache først, så net)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Returner cached version hvis tilgængelig
        if (response) return response;

        // Hvis ikke i cache: prøv at hente fra net
        return fetch(event.request).catch(() => {
          // Hvis offline: returner fejl
          return new Response('Offline: Indhold ikke tilgængeligt', {
            status: 404,
            statusText: 'Offline'
          });
        });
      })
  );
});
