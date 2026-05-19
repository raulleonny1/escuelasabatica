import type { Viewport } from "next"
import { Lora, Source_Sans_3 } from "next/font/google"
import AppHeader from "@/components/AppHeader"
import PwaInstallPrompt from "@/components/PwaInstallPrompt"
import "./globals.css"

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata = {
  title: "Escuela Sabática",
  description: "Lección del trimestre | Estudio Bíblico Diario",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logoes.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Escuela Sabática",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1e3a5f",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${lora.variable} ${sourceSans.variable}`}>
      <body className="m-0 p-0 antialiased">
        <div className="flex h-dvh flex-col overflow-hidden">
          <AppHeader />

          <main className="flex min-h-0 flex-1 overflow-hidden bg-surface p-2 md:p-4">
            <div className="flex h-full min-h-0 w-full max-w-[1800px] mx-auto rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              {children}
            </div>
          </main>
        </div>
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
