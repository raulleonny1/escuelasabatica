"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  cargarScriptJitsi,
  JITSI_DOMAIN,
  nombreSalaVozJitsi,
} from "@/lib/salaVoz"
import {
  iniciarHeartbeatVoz,
  subscribeUsuariosEnVoz,
  type UsuarioEnVoz,
} from "@/lib/vozPresencia"

interface SalaVozPanelProps {
  claseId: string
  nombre: string
  /** Entrar a la voz al abrir la clase, sin botón (estilo Zoom) */
  vozAutomatica?: boolean
  visible?: boolean
  onSalaVozChange?: (enSala: boolean) => void
  className?: string
}

export default function SalaVozPanel({
  claseId,
  nombre,
  vozAutomatica = false,
  visible = true,
  onSalaVozChange,
  className = "",
}: SalaVozPanelProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null)
  const autoIniciadoRef = useRef(false)
  const conectadoRef = useRef(false)
  const canceladoRef = useRef(false)
  const [enSala, setEnSala] = useState(false)
  const [conectando, setConectando] = useState(false)
  const [solicitudUnirse, setSolicitudUnirse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enVoz, setEnVoz] = useState<UsuarioEnVoz[]>([])
  const [micActivo, setMicActivo] = useState(true)
  const [falloConexion, setFalloConexion] = useState(false)

  const roomName = nombreSalaVozJitsi(claseId)
  const montarContenedor = solicitudUnirse || enSala
  const modoZoom = vozAutomatica

  const notificarEnSala = useCallback(
    (valor: boolean) => {
      setEnSala(valor)
      onSalaVozChange?.(valor)
    },
    [onSalaVozChange]
  )

  useEffect(() => {
    if (!claseId) return
    return subscribeUsuariosEnVoz(claseId, setEnVoz)
  }, [claseId])

  const salirSala = useCallback(() => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose()
      } catch {
        // ignore
      }
      apiRef.current = null
    }
    if (contenedorRef.current) {
      contenedorRef.current.innerHTML = ""
    }
    notificarEnSala(false)
    setConectando(false)
    setSolicitudUnirse(false)
    setMicActivo(true)
    setFalloConexion(false)
    autoIniciadoRef.current = false
    conectadoRef.current = false
  }, [notificarEnSala])

  /** Jitsi en contenedor de 1px no termina la conexión en móvil */
  const claseContenedorJitsi = visible
    ? enSala
      ? "min-h-[220px] flex-1 bg-slate-900"
      : "min-h-[200px] flex-1 bg-slate-900"
    : "pointer-events-none fixed left-0 top-0 z-[-1] h-[360px] w-[min(100vw,480px)] max-w-[480px] overflow-hidden opacity-0"

  useEffect(() => {
    return () => {
      salirSala()
    }
  }, [salirSala])

  useEffect(() => {
    if (!enSala || !claseId || !nombre.trim()) return
    return iniciarHeartbeatVoz(claseId, nombre)
  }, [enSala, claseId, nombre])

  useEffect(() => {
    if (!vozAutomatica || !claseId || !nombre.trim()) return
    if (autoIniciadoRef.current) return

    autoIniciadoRef.current = true
    setError(null)
    setFalloConexion(false)
    setSolicitudUnirse(true)

    void cargarScriptJitsi().catch(() => {})
  }, [vozAutomatica, claseId, nombre])

  useEffect(() => {
    if (!solicitudUnirse || enSala || apiRef.current) return
    if (!claseId || !nombre.trim()) return

    let fallbackTimer: number | null = null
    let observerIframe: MutationObserver | null = null

    canceladoRef.current = false
    conectadoRef.current = false

    function marcarConectado() {
      if (canceladoRef.current || conectadoRef.current) return
      conectadoRef.current = true
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        fallbackTimer = null
      }
      notificarEnSala(true)
      setConectando(false)
      setFalloConexion(false)
      setError(null)
    }

    async function conectar() {
      setError(null)
      setConectando(true)

      try {
        await cargarScriptJitsi()

        if (canceladoRef.current) return

        const nodo = contenedorRef.current
        if (!nodo) {
          throw new Error("No se pudo preparar la sala. Intenta de nuevo.")
        }

        nodo.innerHTML = ""

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: nodo,
          width: "100%",
          height: "100%",
          userInfo: { displayName: nombre.trim().slice(0, 32) },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: true,
            prejoinPageEnabled: false,
            enableLobby: false,
            requireDisplayName: false,
            disableDeepLinking: true,
            enableClosePage: false,
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            enableWelcomePage: false,
            subject: "Escuela Sabática — voz grupal",
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            TOOLBAR_BUTTONS: ["microphone", "hangup", "settings"],
          },
        })

        if (canceladoRef.current) {
          api.dispose()
          return
        }

        apiRef.current = api

        api.addListener("videoConferenceJoined", marcarConectado)

        api.addListener("audioMuteStatusChanged", (payload: unknown) => {
          const p = payload as { muted?: boolean }
          if (typeof p?.muted === "boolean") setMicActivo(!p.muted)
        })

        api.addListener("readyToClose", () => {
          salirSala()
        })

        api.addListener("errorOccurred", (payload: unknown) => {
          const p = payload as { error?: { name?: string } }
          const msg = p?.error?.name
          if (msg && !conectadoRef.current) {
            setError(
              "No se pudo usar el micrófono. Revisa permisos del navegador e intenta de nuevo."
            )
            setConectando(false)
          }
        })

        observerIframe = new MutationObserver(() => {
          if (!nodo.querySelector("iframe")) return
          window.setTimeout(() => {
            if (!conectadoRef.current) marcarConectado()
          }, 1500)
        })
        observerIframe.observe(nodo, { childList: true, subtree: true })

        fallbackTimer = window.setTimeout(() => {
          if (!canceladoRef.current && apiRef.current === api) {
            marcarConectado()
          }
        }, 5000)

        window.setTimeout(() => {
          if (!conectadoRef.current && !canceladoRef.current) {
            setFalloConexion(true)
            setConectando(false)
          }
        }, 14000)
      } catch (e) {
        if (canceladoRef.current) return
        setConectando(false)
        setSolicitudUnirse(false)
        setFalloConexion(true)
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo conectar. Permite el micrófono y recarga la página."
        )
      }
    }

    const id = requestAnimationFrame(() => {
      void conectar()
    })

    return () => {
      canceladoRef.current = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      observerIframe?.disconnect()
      cancelAnimationFrame(id)
    }
  }, [
    solicitudUnirse,
    enSala,
    claseId,
    nombre,
    roomName,
    notificarEnSala,
    salirSala,
    vozAutomatica,
  ])

  function unirseAVoz() {
    if (!claseId || !nombre.trim() || enSala || conectando || solicitudUnirse) return
    setError(null)
    setFalloConexion(false)
    autoIniciadoRef.current = true
    setSolicitudUnirse(true)
  }

  function reintentarVoz() {
    salirSala()
    window.setTimeout(() => unirseAVoz(), 300)
  }

  function toggleMicrofono() {
    apiRef.current?.executeCommand("toggleAudio")
  }

  const otrosEnVoz = enVoz.filter(
    (u) => u.nombre.trim().toLowerCase() !== nombre.trim().toLowerCase()
  )

  return (
    <div
      className={`flex min-h-0 flex-col ${className} ${!visible && enSala ? "sr-only absolute h-0 w-0 overflow-hidden opacity-0" : ""}`}
      aria-hidden={!visible && enSala}
    >
      <div className="shrink-0 border-b border-border bg-violet-50/80 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-900/80">
          Sala de voz grupal
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
          {modoZoom
            ? "Al entrar a la clase te conectamos a la voz, como en Zoom. Solo audio (sin cámara)."
            : "Como una llamada abierta: quien entra escucha y puede hablar. Solo audio (sin cámara)."}
        </p>
        {otrosEnVoz.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-violet-800">
            <span className="font-medium">En la voz ahora:</span>{" "}
            {otrosEnVoz.map((u) => u.nombre).join(", ")}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-slate-500">
            Nadie más en la voz por ahora — sé el primero en entrar.
          </p>
        )}
      </div>

      {vozAutomatica && falloConexion && !enSala && !conectando && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <p className="max-w-xs text-center text-sm text-red-700">
            No se pudo conectar a la voz. Revisa que el micrófono esté permitido.
          </p>
          <button
            type="button"
            onClick={reintentarVoz}
            className="min-h-11 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white"
          >
            Reintentar voz
          </button>
        </div>
      )}

      {!enSala && !conectando && !vozAutomatica && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <span className="text-4xl" aria-hidden>
            🎙️
          </span>
          <p className="max-w-xs text-center text-sm text-slate-600">
            Únete a la sala de voz de tu clase. Puedes seguir leyendo el PDF; la voz sigue activa
            hasta que pulses salir.
          </p>
          <button
            type="button"
            disabled={!claseId}
            onClick={unirseAVoz}
            className="min-h-11 rounded-xl bg-gradient-to-r from-violet-700 to-primary px-6 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            Unirme a la voz grupal
          </button>
          {error && (
            <p className="max-w-xs text-center text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {montarContenedor && (
        <div
          ref={contenedorRef}
          className={claseContenedorJitsi}
          aria-hidden={!visible && !enSala}
        />
      )}

      {vozAutomatica && !enSala && conectando && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"
            aria-hidden
          />
          <p className="text-center text-sm font-medium text-violet-900">
            Entrando a la voz de la clase…
          </p>
          <p className="max-w-xs text-center text-xs text-slate-500">
            Acepta el micrófono si el navegador lo pide.
          </p>
        </div>
      )}

      {!vozAutomatica && !enSala && conectando && (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-violet-100 bg-violet-50/50 px-3 py-3">
          <span
            className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"
            aria-hidden
          />
          <p className="text-center text-xs font-medium text-violet-900">
            Conectando a la voz…
          </p>
        </div>
      )}

      {enSala && !visible && (
        <p className="shrink-0 border-t border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-800">
          Conectado a la voz — puedes seguir en Lección PDF o Biblia
        </p>
      )}

      {enSala && visible && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-card p-2">
          <button
            type="button"
            onClick={toggleMicrofono}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              micActivo ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"
            }`}
          >
            {micActivo ? "🎤 Micrófono on" : "🔇 Micrófono off"}
          </button>
          <button
            type="button"
            onClick={salirSala}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white"
          >
            Salir de la voz
          </button>
          <span className="ml-auto text-[10px] text-slate-500">{enVoz.length} en la sala</span>
        </div>
      )}

      {error && (conectando || enSala) && (
        <p className="px-3 pb-2 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

    </div>
  )
}
