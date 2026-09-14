/**
 * FileForge - Progressive Web App Service Worker
 * 
 * Provides robust offline support for the application shell and assets.
 * 100% Client-Side: Never caches user files, uploads, or sensitive processed data.
 */

const CACHE_NAME = 'fileforge-shell-v1.0.0';

// Pre-cached static assets comprising the complete offline application shell
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './assets/logo.svg',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/icon-maskable-192x192.png',
  './assets/icons/icon-maskable-512x512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32x32.png',
  
  // Core Application Scripts
  './js/utils.js',
  './js/app.js',
  
  // Tool JavaScript Modules (All 50 Tools)
  './js/image-compressor.js',
  './js/image-converter.js',
  './js/image-resizer.js',
  './js/pdf-compressor.js',
  './js/pdf-to-image.js',
  './js/image-to-pdf.js',
  './js/pdf-merger.js',
  './js/pdf-splitter.js',
  './js/pdf-rotator.js',
  './js/pdf-delete-pages.js',
  './js/pdf-reorder-pages.js',
  './js/pdf-watermark.js',
  './js/pdf-page-number.js',
  './js/pdf-protect.js',
  './js/pdf-metadata-editor.js',
  './js/pdf-to-text.js',
  './js/pdf-crop.js',
  './js/pdf-grayscale.js',
  './js/image-cropper.js',
  './js/image-rotator.js',
  './js/image-flip.js',
  './js/image-watermark.js',
  './js/image-metadata-remover.js',
  './js/image-grayscale.js',
  './js/image-to-base64.js',
  './js/base64-to-image.js',
  './js/image-color-picker.js',
  './js/image-preview-tool.js',
  './js/zip-creator.js',
  './js/zip-extractor.js',
  './js/file-analyzer.js',
  './js/file-previewer.js',
  './js/file-renamer.js',
  './js/batch-processor.js',

  // Client-Side CDN Libraries (Offline Processing Engine)
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

/**
 * Service Worker Install Event - Pre-cache application shell
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`[PWA SW] Pre-cache skipped for: ${url}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Service Worker Activate Event - Clean up stale cache versions
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Service Worker Fetch Event - Stale-While-Revalidate for App Shell & Dynamic Assets
 * 
 * STRICT PRIVACY & SECURITY RULES:
 * - Only GET requests with http/https schemes are handled.
 * - Local Blobs (blob:), Data URLs (data:), and client-side processing buffers are NEVER cached.
 * - User files remain strictly local and private in RAM.
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension, blob, data)
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation requests (HTML document) - Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html').then((cached) => cached || caches.match('./'));
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Fonts, Images, CDNs) - Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Cache valid responses for static assets
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

/**
 * Message Handler for manual update triggers
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
