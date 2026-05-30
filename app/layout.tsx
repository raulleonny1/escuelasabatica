import type { Viewport } from "next"
import Script from "next/script"
import { Lora, Source_Sans_3 } from "next/font/google"
import AppShell from "@/components/AppShell"
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
    "google-adsense-account": "ca-pub-6850511900744053",
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
  const textSizeBoot = `(function(){try{var s=localStorage.getItem("es-text-size");if(s!=null&&s!=="0")document.documentElement.dataset.textSize=s}catch(e){}})();`

  return (
    <html lang="es" data-text-size="0" className={`${lora.variable} ${sourceSans.variable}`}>
      <body className="m-0 p-0 antialiased">
        <Script id="es-text-size-boot" strategy="beforeInteractive">
          {textSizeBoot}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6850511900744053"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <AppShell>{children}</AppShell>
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
