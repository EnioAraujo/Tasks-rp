import { NextResponse } from "next/server"

export async function GET() {
  const swContent = `
const CACHE_NAME = "tasknotes-v1"
const urlsToCache = [
  "/",
  "/api/manifest"
]

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.log("Cache addAll failed:", error)
        // Continue installation even if some resources fail to cache
        return Promise.resolve()
      })
    }).catch((error) => {
      console.error("Cache open failed:", error)
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).catch((error) => {
      console.error("Cache cleanup failed:", error)
    })
  )
  self.clients.claim()
})

// Fetch event
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response
      }

      // Clone the request because it's a stream
      const fetchRequest = event.request.clone()

      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }

        // Clone the response because it's a stream
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache successful responses
          if (event.request.url.indexOf('http') === 0) {
            cache.put(event.request, responseToCache).catch((error) => {
              console.log("Failed to cache:", event.request.url, error)
            })
          }
        })

        return response
      }).catch((error) => {
        console.log("Fetch failed:", error)
        // Return a basic offline page for navigation requests
        if (event.request.destination === "document") {
          return new Response(
            \`<!DOCTYPE html>
            <html>
            <head>
              <title>Offline - TaskNotes</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .offline { color: #666; }
              </style>
            </head>
            <body>
              <div class="offline">
                <h1>📱 TaskNotes</h1>
                <h2>Você está offline</h2>
                <p>Verifique sua conexão com a internet e tente novamente.</p>
                <button onclick="window.location.reload()">Tentar Novamente</button>
              </div>
            </body>
            </html>\`,
            { 
              headers: { 
                "Content-Type": "text/html",
                "Cache-Control": "no-cache"
              } 
            }
          )
        }
        
        // For other requests, just throw the error
        throw error
      })
    }).catch((error) => {
      console.error("Cache match failed:", error)
      return fetch(event.request)
    })
  )
})

// Background sync
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag)
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    console.log("Performing background sync...")
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ 
        type: "SYNC_COMPLETE",
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error("Background sync error:", error)
  }
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data)
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
`

  return new NextResponse(swContent, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
