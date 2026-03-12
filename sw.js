/**
 * dripmate Service Worker
 * Provides offline PWA support with intelligent caching strategies
*/

const CACHE_VERSION = 'v38.7';  // resilient precache + strict asset list

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
  '/js/card-editor.js',
  '/js/image-handler.js',
  '/js/manual-entry.js',
  '/js/messages.js',
  '/js/water-hardness.js',
  '/js/settings.js',
  '/js/services/backend-sync.js',
  '/js/brew-timer-stubs.js',
  '/js/sw-register.js',
  '/js/data/water-hardness-db.js',
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/logo-maskable-192.png',
  '/logo-maskable-512.png',
  '/compost.svg',
  '/v60-icon.png',
  '/assets/coffee-bag-shot.png'
];

// API domain for network-first strategy
// IMPORTANT: Service workers cannot import ES modules, so this hostname
// must be kept manually in sync with BACKEND_HOSTNAME in js/config.js.
const API_DOMAIN = 'dripmate-backend-production.up.railway.app';

// Static file extensions to cache
const STATIC_EXTENSIONS = ['.html', '.css', '.js', '.json', '.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];

/**
 * INSTALL EVENT
 * Pre-cache all static assets and activate immediately
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    console.log('[Service Worker] Pre-caching static assets');

    await Promise.all(STATIC_ASSETS.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch (error) {
        console.warn('[Service Worker] Skipping missing precache asset:', asset, error && error.message ? error.message : error);
      }
    }));

    console.log('[Service Worker] Pre-caching complete');
    await self.skipWaiting();
  })());
});

/**
 * ACTIVATE EVENT
 * Clean up old caches and take control of all clients
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
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
        console.log('[Service Worker] Now controlling all clients');
        return self.clients.claim();
      })
  );
});

/**
 * FETCH EVENT
 * Route requests through appropriate caching strategies
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only cache GET requests â€“ POST/PUT/DELETE/PATCH cannot be cached
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // API requests: Network-first strategy
  if (url.hostname === API_DOMAIN) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets: Cache-first strategy
  const isStaticAsset = STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext)) || url.pathname === '/';
  if (isStaticAsset) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Everything else: Network with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Cache-first strategy: Try cache, fall back to network
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy: Try network, fall back to cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
