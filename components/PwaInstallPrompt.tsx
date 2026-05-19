"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  DISMISS_KEY,
  PWA_MOSTRAR_EVENT,
  esAppleDispositivo,
  esAndroid,
  esTablet,
  etiquetaDispositivo,
  fueInstalacionRechazada,
  getPlataformaPwa,
  yaInstaladaPwa,
} from "@/lib/pwa"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type ModoBanner = "nativo" | "ios" | "android-manual" | "desktop-manual"

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [modo, setModo] = useState<ModoBanner>("desktop-manual")
  const [instalando, setInstalando] = useState(false)
  const bipRecibido = useRef(false)
  const [montado, setMontado] = useState(false)

  const mostrarBanner = useCallback((nuevoModo: ModoBanner) => {
    if (yaInstaladaPwa()) return
    setModo(nuevoModo)
    setVisible(true)
  }, [])

  const cerrar = useCallback((recordar = true) => {
    setVisible(false)
    if (recordar) {
      try {
        window.localStorage.setItem(DISMISS_KEY, "1")
      } catch {
        // ignorar
      }
    }
  }, [])

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (!montado) return

    const onMostrar = () => {
      if (yaInstaladaPwa()) return
      if (deferredPrompt) mostrarBanner("nativo")
      else if (esAppleDispositivo()) mostrarBanner("ios")
      else if (esAndroid()) mostrarBanner("android-manual")
      else mostrarBanner("desktop-manual")
    }

    window.addEventListener(PWA_MOSTRAR_EVENT, onMostrar)
    return () => window.removeEventListener(PWA_MOSTRAR_EVENT, onMostrar)
  }, [montado, deferredPrompt, mostrarBanner])

  useEffect(() => {
    if (!montado || yaInstaladaPwa() || fueInstalacionRechazada()) return

    const onBip = (e: Event) => {
      e.preventDefault()
      bipRecibido.current = true
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      mostrarBanner("nativo")
    }

    window.addEventListener("beforeinstallprompt", onBip)

    const plataforma = getPlataformaPwa()

    const timerApple = window.setTimeout(() => {
      if (bipRecibido.current || yaInstaladaPwa() || fueInstalacionRechazada()) return
      if (plataforma === "ios") mostrarBanner("ios")
    }, 1200)

    const timerAndroid = window.setTimeout(() => {
      if (bipRecibido.current || yaInstaladaPwa() || fueInstalacionRechazada()) return
      if (plataforma === "android") mostrarBanner("android-manual")
    }, 2500)

    const timerDesktop = window.setTimeout(() => {
      if (bipRecibido.current || yaInstaladaPwa() || fueInstalacionRechazada()) return
      if (plataforma === "desktop") mostrarBanner("desktop-manual")
    }, 4000)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip)
      window.clearTimeout(timerApple)
      window.clearTimeout(timerAndroid)
      window.clearTimeout(timerDesktop)
    }
  }, [montado, mostrarBanner])

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

  function textoInstrucciones(): ReactNode {
    const esTab = esTablet()
    if (modo === "ios") {
      if (esTab) {
        return (
          <>
            En <strong>Safari</strong> o <strong>Chrome</strong> en tu iPad: toca el icono{" "}
            <strong>Compartir</strong> (cuadrado con flecha) y elige{" "}
            <strong>Añadir a pantalla de inicio</strong>.
          </>
        )
      }
      return (
        <>
          En <strong>Safari</strong> o <strong>Chrome</strong> en tu iPhone: toca{" "}
          <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
        </>
      )
    }
    if (modo === "android-manual") {
      if (esTab) {
        return (
          <>
            En <strong>Chrome</strong>: menú <strong>⋮</strong> →{" "}
            <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.
            También puede aparecer un aviso en la barra de direcciones.
          </>
        )
      }
      return (
        <>
          En <strong>Chrome</strong>: menú <strong>⋮</strong> →{" "}
          <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.
        </>
      )
    }
    if (modo === "desktop-manual") {
      return (
        <>
          En Chrome o Edge: icono <strong>Instalar</strong> en la barra de direcciones, o menú{" "}
          <strong>⋮</strong> → <strong>Instalar Escuela Sabática</strong>.
        </>
      )
    }
    return <>Accede más rápido desde tu pantalla de inicio, como una aplicación.</>
  }

  if (!montado || !visible) return null

  const puedeInstalarNativo = modo === "nativo" && deferredPrompt

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-[55] mx-auto max-w-md lg:bottom-4 lg:left-auto lg:right-4"
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
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {etiquetaDispositivo()}
            </p>
            <p className="mt-1 text-sm leading-snug text-slate-600">{textoInstrucciones()}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {puedeInstalarNativo && (
            <button
              type="button"
              onClick={instalar}
              disabled={instalando}
              className="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-white active:opacity-90 disabled:opacity-60"
            >
              {instalando ? "Instalando…" : "Sí, instalar"}
            </button>
          )}
          {!puedeInstalarNativo && (
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
