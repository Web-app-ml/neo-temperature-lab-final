// sw.js
const CACHE = 'neo-temp-lab-v3.0+';  // <-- version bump

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './web-app-manifest-192x192.png',
    './web-app-manifest-512x512.png',
    './favicon.ico',
    './favicon.svg',
    './apple-touch-icon.png',
    './lib/qrcode.min.js'
];

// ---------- Utils ----------
const sameOrigin = (req) => new URL(req.url).origin === self.location.origin;

async function cacheAddAll(cacheName, urls) {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls);
    return cache;
}

async function cacheFirst(req) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
}

async function networkFirstNavigation() {
    try {
        const fresh = await fetch('./index.html', { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
    } catch (err) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        return new Response('<h1>Offline</h1><p>Try again when you are back online.</p>', {
            headers: { 'Content-Type': 'text/html; charset=UTF-8' },
            status: 200
        });
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
    }).catch(() => cached);
    return cached || fetchPromise;
}

// ---------- Install ----------
self.addEventListener('install', (e) => {
    e.waitUntil(cacheAddAll(CACHE, ASSETS));
    self.skipWaiting();
});

// ---------- Activate ----------
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ---------- Fetch ----------
self.addEventListener('fetch', (e) => {
    const req = e.request;

    // Only handle GET & same-origin
    if (req.method !== 'GET' || !sameOrigin(req)) return;

    const url = new URL(req.url);

    // Always bypass service worker for robots.txt and sitemap.xml
    if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') {
        e.respondWith(fetch(req));
        return;
    }

    // Navigation requests → network-first with offline fallback
    if (req.mode === 'navigate') {
        e.respondWith(networkFirstNavigation());
        return;
    }

    // Static assets → stale-while-revalidate
    e.respondWith(staleWhileRevalidate(req));
});

// ---------- Messaging (optional): allow page to force update ----------
self.addEventListener('message', (e) => {
    if (e.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
