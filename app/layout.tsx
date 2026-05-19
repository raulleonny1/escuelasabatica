import type { Viewport } from "next"
import { Lora, Source_Sans_3 } from "next/font/google"
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Escuela Sabática",
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
          <header className="relative overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white shadow-lg">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#c9a227_0%,transparent_50%)]" aria-hidden />
            <div className="relative border-b-4 border-accent px-4 py-3 md:px-8 md:py-5">
              <h1 className="font-display text-xl font-semibold tracking-tight md:text-3xl">
                Escuela Sabática
              </h1>
              <p className="text-sm md:text-base text-blue-100/90 mt-1">
                Lección del trimestre · Estudio bíblico diario
              </p>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 overflow-hidden bg-surface p-2 md:p-4">
            <div className="flex h-full min-h-0 w-full max-w-[1800px] mx-auto rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
