/**
 * Advanced Service Worker for Must Be Viral Platform
 * Implements intelligent caching, offline support, and performance optimization
 */

const CACHE_VERSION = 'must-be-viral-v1.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Cache configuration
const CACHE_CONFIG = {
  static: {
    name: STATIC_CACHE,
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  },
  dynamic: {
    name: DYNAMIC_CACHE,
    maxEntries: 50,
    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  },
  api: {
    name: API_CACHE,
    maxEntries: 200,
    maxAgeSeconds: 60 * 60, // 1 hour
  },
  images: {
    name: IMAGE_CACHE,
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  },
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/assets/css/index.css',
  '/assets/js/index.js',
  '/favicon.ico',
];

// API endpoints that can be cached
const CACHEABLE_APIs = [
  '/api/trends',
  '/api/analytics',
  '/api/content/templates',
  '/api/user/profile',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.startsWith(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Cache-first strategy for static assets
 */
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Static asset unavailable', { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy for API requests
 */
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Return cached response immediately if available
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse || createOfflineResponse());
  
  return cachedResponse || networkResponsePromise;
}

/**
 * Cache-first strategy for images with WebP optimization
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try to get WebP version if supported
    const webpRequest = getWebPRequest(request);
    if (webpRequest) {
      try {
        const webpResponse = await fetch(webpRequest);
        if (webpResponse.ok) {
          cache.put(request, webpResponse.clone());
          return webpResponse;
        }
      } catch (webpError) {
        console.log('[SW] WebP fallback failed, trying original');
      }
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    return createPlaceholderImage();
  }
}

/**
 * Navigation requests with offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/offline.html') || createOfflineResponse();
  }
}

/**
 * Network-first strategy for dynamic content
 */
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    return cachedResponse || createOfflineResponse();
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(syncOfflineContent());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

/**
 * Push notifications for real-time updates
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message handling for cache updates
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_NEW_ROUTE':
      cacheNewRoute(data.url);
      break;
      
    case 'CLEAR_CACHE':
      clearSpecificCache(data.cacheName);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

// Utility functions

function isStaticAsset(url) {
  return url.pathname.includes('/assets/') || 
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || 
         CACHEABLE_APIs.some(api => url.pathname.startsWith(api));
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function getWebPRequest(request) {
  if (!self.clients || !request.headers.get('accept')?.includes('image/webp')) {
    return null;
  }
  
  const url = new URL(request.url);
  const webpUrl = url.pathname.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  if (webpUrl !== url.pathname) {
    url.pathname = webpUrl;
    return new Request(url.toString(), {
      headers: request.headers,
      mode: request.mode,
      credentials: request.credentials,
    });
  }
  
  return null;
}

function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Some features may not be available.',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
}

function createPlaceholderImage() {
  // Create a simple placeholder SVG
  const svg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6b7280" text-anchor="middle" dy="0.3em">
        Image unavailable offline
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  });
}

async function syncOfflineContent() {
  try {
    const cache = await caches.open('offline-actions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const data = await response.json();
        
        // Retry the original request
        await fetch(data.originalUrl, {
          method: data.method,
          headers: data.headers,
          body: data.body,
        });
        
        // Remove from offline cache
        await cache.delete(request);
      } catch (error) {
        console.error('[SW] Failed to sync offline action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Offline content sync failed:', error);
  }
}

async function syncAnalytics() {
  try {
    // Sync analytics data stored while offline
    const cache = await caches.open('analytics-queue');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const analytics = await response.json();
        
        await fetch('/api/analytics/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analytics),
        });
        
        await cache.delete(request);
      } catch (error) {
        console.error('[SW] Analytics sync failed:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync error:', error);
  }
}

async function cacheNewRoute(url) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.add(url);
    console.log('[SW] New route cached:', url);
  } catch (error) {
    console.error('[SW] Failed to cache new route:', error);
  }
}

async function clearSpecificCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('[SW] Cache cleared:', cacheName);
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('[SW] Failed to calculate cache size:', error);
    return 0;
  }
}

// Periodic cache cleanup
setInterval(() => {
  cleanupExpiredCache();
}, 24 * 60 * 60 * 1000); // Run daily

async function cleanupExpiredCache() {
  try {
    for (const config of Object.values(CACHE_CONFIG)) {
      const cache = await caches.open(config.name);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const age = Date.now() - new Date(dateHeader).getTime();
            if (age > config.maxAgeSeconds * 1000) {
              await cache.delete(key);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

console.log('[SW] Service worker loaded successfully');