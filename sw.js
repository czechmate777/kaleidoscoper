const CACHE_NAME = 'kaleidoscope-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    // Add any icons or other assets here later
];

// Step 1: Install Event - Cache the files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Step 2: Activate Event - Clean up old caches if you update the app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Step 3: Fetch Event - Serve from cache if available, otherwise go to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return the cached file if we have it
            if (response) {
                return response;
            }
            // Otherwise, attempt to fetch it from the network
            return fetch(event.request).catch(() => {
                // You could optionally return a fallback page here if both fail
                console.log('Offline and asset not in cache.');
            });
        })
    );
});