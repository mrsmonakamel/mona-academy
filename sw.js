// sw.js - PWA Service Worker for mona-academy
const CACHE_NAME = 'mona-academy-v1';
const urlsToCache = [
  '/mona-academy/',
  '/mona-academy/index.html',
  '/mona-academy/style.css',
  '/mona-academy/script.js',
  '/mona-academy/translations.js',
  '/mona-academy/manifest.json',
  '/mona-academy/mona.jpg',
  '/mona-academy/icon-192x192.png',
  '/mona-academy/icon-512x512.png'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});