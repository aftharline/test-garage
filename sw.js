const CACHE_NAME = 'garasi-pro-v2';

// Aset statis utama yang WAJIB di-cache saat pertama kali install
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // Library CDN Utama
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

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

                // 3. DYNAMIC CACHING: Simpan aset baru (misal data bahasa AI Tesseract) ke cache untuk offline selanjutnya
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Hindari caching request yang rentan seperti socket atau URL API yang sering berubah jika ada
                    if(event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
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
