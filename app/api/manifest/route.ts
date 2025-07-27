import { NextResponse } from "next/server"

export async function GET() {
  const manifest = {
    name: "Sistema de Anotações e Tarefas",
    short_name: "TaskNotes",
    description: "Sistema completo de gerenciamento de tarefas e anotações",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/placeholder.svg?height=192&width=192&text=TaskNotes",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/placeholder.svg?height=512&width=512&text=TaskNotes",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
    categories: ["productivity", "utilities"],
    lang: "pt-BR",
    dir: "ltr",
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  })
}
