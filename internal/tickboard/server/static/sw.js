/**
 * Service Worker for Tick Board PWA
 * Implements caching strategies for offline support
 */

const CACHE_NAME = 'tickboard-v2';
const STATIC_CACHE_NAME = 'tickboard-static-v2';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
    '/',
    '/favicon.svg',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                // Cache static assets, but don't fail install if some are missing
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Installed, static assets cached');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete old versions of our caches
                            return name.startsWith('tickboard-') &&
                                   name !== CACHE_NAME &&
                                   name !== STATIC_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activated, old caches cleared');
                // Take control of all clients immediately
                return self.clients.claim();
            })
            .then(() => {
                // Notify all clients that a new version is available
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SW_ACTIVATED',
                            version: CACHE_NAME
                        });
                    });
                });
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip WebSocket and SSE connections
    if (url.pathname === '/api/events' ||
        event.request.headers.get('Upgrade') === 'websocket' ||
        event.request.headers.get('Accept')?.includes('text/event-stream')) {
        return;
    }

    // API requests - Network first with offline fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithOfflineFallback(event.request));
        return;
    }

    // Static assets (/assets/) - Cache first, update in background (stale-while-revalidate)
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
        return;
    }

    // Shoelace icons - Cache first
    if (url.pathname.startsWith('/shoelace/')) {
        event.respondWith(cacheFirst(event.request, STATIC_CACHE_NAME));
        return;
    }

    // Navigation and static files (/, index.html, icons, etc.) - Stale while revalidate
    if (url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname === '/manifest.json' ||
        url.pathname.match(/\.(png|svg|ico)$/)) {
        event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE_NAME));
        return;
    }

    // Default: Network first with cache fallback
    event.respondWith(networkFirstWithCache(event.request, CACHE_NAME));
});

/**
 * Network first strategy with offline fallback for API requests.
 * Returns offline response if network fails.
 */
async function networkFirstWithOfflineFallback(request) {
    try {
        const response = await fetch(request);
        // Cache successful API responses for offline use
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Network failed - try cache
        const cached = await caches.match(request);
        if (cached) {
            // Return cached response with offline indicator header
            const headers = new Headers(cached.headers);
            headers.set('X-Offline', 'true');
            return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers
            });
        }

        // No cache - return offline error response
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'You are offline and this data is not cached'
            }),
            {
                status: 503,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Offline': 'true'
                }
            }
        );
    }
}

/**
 * Stale while revalidate strategy.
 * Returns cached response immediately, updates cache in background.
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Fetch in background and update cache
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);

    // Return cached response immediately, or wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Cache first strategy.
 * Only goes to network if not in cache.
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Return offline indicator for missing static assets
        return new Response('', { status: 404 });
    }
}

/**
 * Network first with cache fallback.
 */
async function networkFirstWithCache(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 404 });
    }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
