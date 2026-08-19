const CACHE_NAME = 'frekvens';

// ⭐ Inkluder app-shell-filer her. Brug relative stier der matcher din
// start_url ("./") i manifest.json. Hvis din HTML-fil hedder noget andet
// end index.html, så skift '/index.html' ud med det rigtige navn.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png'
];

// Installer: cache app-shell og aktivér SW med det samme i eksisterende tabs.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Aktiver: ryd gammel cache og tag kontrol over klienterne med det samme.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Offline-first strategi.
self.addEventListener('fetch', event => {
  // Kun GET håndteres af cache-strategien.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ⭐ CSV/data-filer: prøv net først, falder tilbage til cache hvis offline.
  // Dropbox-URL'en er en .csv?dl=1 (ingen .csv-suffix i stien), så vi matcher
  // på både .csv og selve DATA_URL-domænet.
  const isCsv = url.pathname.toLowerCase().endsWith('.csv') ||
                url.hostname.includes('dropbox.com');

  if (isCsv) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache en kopi hvis svaret er OK, så vi har det offline næste gang.
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r ||
          // Hvis hverken net eller cache virker: giv en tydelig fejl, ikke 'undefined'.
          new Response('Offline: data ikke tilgængelig', { status: 503, statusText: 'Offline' })
        ))
    );
    return;
  }

  // ⭐ Alle andre GET-requests: cache-first, så app-shell altid virker offline.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          // Cache legitime same-origin responses til næste offline-brug.
          if (response && response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline-navigation til en side der ikke er cached → fal tilbage til cached app-shell.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') ||
                   caches.match('./') ||
                   new Response('Offline', { status: 503, statusText: 'Offline' });
          }
          return new Response('Offline: indhold ikke tilgængeligt', {
            status: 504,
            statusText: 'Offline'
          });
        });
    })
  );
});
