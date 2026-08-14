const CACHE_NAME = 'frekvens-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png'  // ⭐ Tilføjet ikonet til cache
];

// Installer og cache vigtige filer
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Tillad CSV-filindlæsning (vigtigt!)
self.addEventListener('fetch', event => {
  // Bypass cache for CSV-filer og filuploads
  if (event.request.url.includes('.csv') ||
      event.request.method === 'POST') {
    return fetch(event.request);
  }

  // Cache andre ressourcer
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
