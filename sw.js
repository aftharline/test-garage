const CACHE_NAME = 'garasi-pro-v2';

// Aset statis yang WAJIB di-cache saat pertama kali install
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // Library CDN yang memang dipakai app
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// Whitelist domain untuk dynamic caching (hindari caching sembarang URL)
const CACHE_WHITELIST = new Set([
    location.origin,
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com',
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
]);

self.addEventListener('install', (event) => {
    // Memaksa SW baru untuk segera mengontrol aplikasi
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache lama:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Hanya tangani request GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Jika ada di cache lokal, langsung gunakan (Cepat & Offline)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Jika tidak ada di cache, ambil dari internet
            return fetch(event.request).then((networkResponse) => {
                // Jangan cache request yang gagal atau bukan dari protokol HTTP/HTTPS (seperti ekstensi chrome)
                if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                    return networkResponse;
                }

                // 3. DYNAMIC CACHING terbatas: cache hanya dari domain whitelist dan request GET
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    try {
                        const url = new URL(event.request.url);
                        if (CACHE_WHITELIST.has(url.origin)) {
                            cache.put(event.request, responseToCache);
                        }
                    } catch (e) {
                        // ignore invalid URLs
                    }
                });

                return networkResponse;
            }).catch(() => {
                // 4. Jika offline dan tidak ada di cache, biarkan fail secara anggun.
                console.log('[Service Worker] Offline dan aset tidak ditemukan di cache.');
            });
        })
    );
});