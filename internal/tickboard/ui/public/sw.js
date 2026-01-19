/**
 * Service Worker for Tick Board PWA
 * Implements offline caching for static assets
 */

const CACHE_NAME = 'tickboard-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/static/index.html',
    '/static/style.css',
    '/static/app.js',
    '/static/favicon.svg',
    '/static/favicon.ico',
    '/static/favicon-16x16.png',
    '/static/favicon-32x32.png',
    '/static/apple-touch-icon.png',
    '/static/icon-192.png',
    '/static/icon-512.png',
    '/static/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip WebSocket and SSE connections
    if (url.pathname === '/events' ||
        event.request.headers.get('Upgrade') === 'websocket' ||
        event.request.headers.get('Accept')?.includes('text/event-stream')) {
        return;
    }

    // Skip API requests - always go to network
    if (url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/ticks') ||
        url.pathname.startsWith('/close') ||
        url.pathname.startsWith('/reopen') ||
        url.pathname.startsWith('/update') ||
        url.pathname.startsWith('/create') ||
        url.pathname.startsWith('/notes')) {
        return;
    }

    // For static assets, use cache-first strategy
    if (url.pathname.startsWith('/static/') ||
        url.pathname === '/' ||
        url.pathname === '/index.html') {
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached response, but fetch update in background
                        event.waitUntil(
                            fetch(event.request)
                                .then((networkResponse) => {
                                    if (networkResponse.ok) {
                                        caches.open(CACHE_NAME)
                                            .then((cache) => {
                                                cache.put(event.request, networkResponse);
                                            });
                                    }
                                })
                                .catch(() => {
                                    // Ignore network errors for background update
                                })
                        );
                        return cachedResponse;
                    }

                    // Not in cache, fetch from network
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse.ok) {
                                const responseClone = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, responseClone);
                                    });
                            }
                            return networkResponse;
                        });
                })
        );
        return;
    }

    // For other requests, use network-first with cache fallback
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Cache successful responses
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                return networkResponse;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});
