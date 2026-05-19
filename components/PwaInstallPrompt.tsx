"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const DISMISS_KEY = "pwa-install-dismissed"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function esIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function yaInstalada(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function fueRechazada(): boolean {
  return localStorage.getItem(DISMISS_KEY) === "1"
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [modoIOS, setModoIOS] = useState(false)
  const [modoManual, setModoManual] = useState(false)
  const [instalando, setInstalando] = useState(false)
  const bipRecibido = useRef(false)

  const cerrar = useCallback((recordar = true) => {
    setVisible(false)
    if (recordar) localStorage.setItem(DISMISS_KEY, "1")
  }, [])

  useEffect(() => {
    if (yaInstalada() || fueRechazada()) return

    const onBip = (e: Event) => {
      e.preventDefault()
      bipRecibido.current = true
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setModoIOS(false)
      setModoManual(false)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", onBip)

    const timerIOS = window.setTimeout(() => {
      if (bipRecibido.current || yaInstalada() || fueRechazada()) return
      if (esIOS()) {
        setModoIOS(true)
        setVisible(true)
      }
    }, 2000)

    const timerManual = window.setTimeout(() => {
      if (bipRecibido.current || yaInstalada() || fueRechazada() || esIOS()) return
      setModoManual(true)
      setVisible(true)
    }, 4500)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip)
      window.clearTimeout(timerIOS)
      window.clearTimeout(timerManual)
    }
  }, [])

  async function instalar() {
    if (!deferredPrompt) return
    setInstalando(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      cerrar(outcome === "accepted")
    } catch {
      cerrar(false)
    } finally {
      setInstalando(false)
      setDeferredPrompt(null)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto max-w-md lg:bottom-4 lg:left-auto lg:right-4"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div className="rounded-xl border border-primary/20 bg-card p-4 shadow-2xl shadow-slate-900/15">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-xl text-white">
            📖
          </div>
          <div className="min-w-0 flex-1">
            <p id="pwa-install-title" className="font-display text-base font-semibold text-primary">
              Instalar Escuela Sabática
            </p>
            <p className="mt-1 text-sm leading-snug text-slate-600">
              {modoIOS ? (
                <>
                  En Safari: toca <strong>Compartir</strong> y luego{" "}
                  <strong>Añadir a pantalla de inicio</strong> para abrirla como app.
                </>
              ) : modoManual ? (
                <>
                  En el menú del navegador (<strong>⋮</strong> o <strong>⋯</strong>), elige{" "}
                  <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.
                </>
              ) : (
                <>Accede más rápido desde tu pantalla de inicio, como una aplicación.</>
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!modoIOS && !modoManual && deferredPrompt && (
            <button
              type="button"
              onClick={instalar}
              disabled={instalando}
              className="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-white active:opacity-90 disabled:opacity-60"
            >
              {instalando ? "Instalando…" : "Sí, instalar"}
            </button>
          )}
          {(modoIOS || modoManual) && (
            <button
              type="button"
              onClick={() => cerrar(true)}
              className="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-white active:opacity-90"
            >
              Entendido
            </button>
          )}
          <button
            type="button"
            onClick={() => cerrar(true)}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
