"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true)
        return true
      }
      if (window.navigator && "standalone" in window.navigator && (window.navigator as any).standalone) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (checkIfInstalled()) {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      console.log("PWA was installed")
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("No deferred prompt available")
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log(`User response to install prompt: ${outcome}`)

      if (outcome === "accepted") {
        console.log("PWA install accepted")
      } else {
        console.log("PWA install dismissed")
      }
    } catch (error) {
      console.error("Error during PWA install:", error)
    } finally {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)

    // Don't show again for this session
    sessionStorage.setItem("pwa-install-dismissed", "true")
  }

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem("pwa-install-dismissed") || !showInstallPrompt) {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Instalar TaskNotes</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">Instale o app para acesso rápido e uso offline</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button onClick={handleInstallClick} size="sm" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Instalar App
        </Button>
      </CardContent>
    </Card>
  )
}
