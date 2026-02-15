/**
 * BrewBuddy Service Worker
 * Provides offline PWA support with intelligent caching strategies
 */

const CACHE_VERSION = 'v10.2';  // war v5.0 (oder was auch immer aktuell ist)

// Static assets to pre-cache during installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/state.js',
  '/js/config.js',
  '/js/theme.js',
  '/js/grinder.js',
  '/js/brew-engine.js',
  '/js/brew-timer.js',
  '/js/freshness.js',
  '/js/feedback.js',
  '/js/coffee-cards.js',
  '/js/coffee-list.js',
  '/js/image-handler.js',
  '/js/manual-entry.js',
  '/js/messages.js',
  '/js/water-hardness.js',
  '/js/settings.js',
  '/backend-sync.js',
  '/water-hardness.js',
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/logo-maskable-192.png',
  '/logo-maskable-512.png',
  '/compost-icon.png',
  '/compost.svg',
  '/v60-icon.png'
];

// API domain for network-first strategy
const API_DOMAIN = 'brew-buddy-backend-production.up.railway.app';

// Static file extensions to cache
const STATIC_EXTENSIONS = ['.html', '.css', '.js', '.json', '.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];

/**
 * INSTALL EVENT
 * Pre-cache all static assets and activate immediately
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Clean up old caches and take control immediately
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete all caches that don't match current version
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_VERSION)
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * FETCH EVENT
 * Route requests based on caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API requests to our backend domain
  if (url.hostname === API_DOMAIN && url.protocol === 'https:') {
    // Only cache GET requests — POST/PUT/DELETE cannot be cached
    if (request.method === 'GET') {
      event.respondWith(networkFirstStrategy(request));
    } else {
      // Non-GET API requests: pass through to network without caching
      event.respondWith(fetch(request));
    }
    return;
  }
  
  // Static assets: Cache-first with network fallback
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Everything else: Network-only (no caching)
  event.respondWith(fetch(request));
});

/**
 * Cache-First Strategy
 * Serve from cache if available, otherwise fetch from network and cache
 */
function cacheFirstStrategy(request) {
  return caches.match(request)
    .then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response
        return cachedResponse;
      }
      
      // Not in cache - fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Cache the new response for future use (GET only)
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.error('[Service Worker] Cache-first fetch failed:', error);
          throw error;
        });
    });
}

/**
 * Network-First Strategy
 * Try network first, fall back to cache if offline
 * Note: Only call this with GET requests (Cache API does not support POST)
 */
function networkFirstStrategy(request) {
  return fetch(request)
    .then((networkResponse) => {
      // Successfully fetched from network - cache it (GET only safety check)
      if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION)
          .then((cache) => {
            cache.put(request, responseToCache);
          });
      }
      return networkResponse;
    })
    .catch((error) => {
      // Network failed - try cache
      return caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving API response from cache (offline)');
            return cachedResponse;
          }
          // No cache available either
          console.error('[Service Worker] Network-first fetch failed and no cache:', error);
          throw error;
        });
    });
}

/**
 * Check if a request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  
  // Check if it's a same-origin request
  if (url.origin !== location.origin) {
    return false;
  }
  
  const pathname = url.pathname;
  
  // Check if it's one of our static files
  const hasStaticExtension = STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
  
  // Also check if it's the root path or an explicitly cached file
  const isRootOrCached = pathname === '/' || STATIC_ASSETS.includes(pathname);
  
  return hasStaticExtension || isRootOrCached;
}
