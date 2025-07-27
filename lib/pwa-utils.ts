// Utilitários PWA e Cache
export class PWAManager {
  private static instance: PWAManager
  private isOnline = navigator.onLine
  private pendingSync: any[] = []

  static getInstance() {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager()
    }
    return PWAManager.instance
  }

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true
        this.syncPendingData()
      })

      window.addEventListener("offline", () => {
        this.isOnline = false
      })
    }
  }

  isAppOnline() {
    return this.isOnline
  }

  addToSyncQueue(data: any) {
    this.pendingSync.push({
      ...data,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem("pending-sync", JSON.stringify(this.pendingSync))
  }

  async syncPendingData() {
    if (this.pendingSync.length === 0) return

    try {
      // Simular sincronização com servidor
      console.log("Sincronizando dados pendentes...", this.pendingSync)

      // Em uma implementação real, você faria requests para o servidor aqui
      for (const item of this.pendingSync) {
        if (item.action === "save") {
          // Simular salvamento no servidor
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      // Limpar fila após sincronização bem-sucedida
      this.pendingSync = []
      localStorage.removeItem("pending-sync")

      // Disparar evento de sincronização
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("data-synced"))
      }
    } catch (error) {
      console.error("Erro na sincronização:", error)
      // Manter dados na fila para tentar novamente
    }
  }

  async installPWA() {
    // Skip service worker registration in development/preview environments
    if (typeof window === "undefined") {
      console.log("Service Worker registration skipped - no window object")
      return
    }

    // Better environment detection
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    const isVercelApp = window.location.hostname.includes("vercel.app")
    const isPreview = window.location.hostname.includes("vusercontent.net")

    if (isPreview) {
      console.log("Service Worker registration skipped in preview environment")
      return
    }

    if ("serviceWorker" in navigator) {
      try {
        // Register service worker from the app directory
        const registration = await navigator.serviceWorker.register("/api/sw", {
          scope: "/",
          updateViaCache: "none",
        })

        console.log("Service Worker registrado:", registration)

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available
                console.log("New content available")
              }
            })
          }
        })
      } catch (error) {
        console.log("Service Worker não disponível neste ambiente:", error)
        // Fallback to basic caching without service worker
        this.enableBasicCaching()
      }
    } else {
      console.log("Service Worker not supported")
      this.enableBasicCaching()
    }
  }

  private enableBasicCaching() {
    // Basic localStorage-based caching as fallback
    console.log("Usando cache básico sem Service Worker")
  }
}

// Cache inteligente
export class SmartCache {
  private static CACHE_NAME = "tasknotes-v1"

  static async cacheData(key: string, data: any) {
    if (typeof window === "undefined" || !("caches" in window)) {
      console.log("Cache API not available")
      return
    }

    try {
      const cache = await caches.open(this.CACHE_NAME)
      const response = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=86400", // 24 hours
        },
      })
      await cache.put(key, response)
    } catch (error) {
      console.error("Erro ao cachear dados:", error)
    }
  }

  static async getCachedData(key: string) {
    if (typeof window === "undefined" || !("caches" in window)) {
      return null
    }

    try {
      const cache = await caches.open(this.CACHE_NAME)
      const response = await cache.match(key)
      if (response && response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error("Erro ao recuperar cache:", error)
    }
    return null
  }
}
