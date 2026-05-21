"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  cargarScriptJitsi,
  JITSI_DOMAIN,
  nombreSalaVozJitsi,
} from "@/lib/salaVoz"
import { liberarConexionVoz, reclamarConexionVoz } from "@/lib/vozConexion"
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
  const panelId = useId()
  const contenedorRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null)
  const autoIniciadoRef = useRef(false)
  const [enSala, setEnSala] = useState(false)
  const [conectando, setConectando] = useState(false)
  const [solicitudUnirse, setSolicitudUnirse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enVoz, setEnVoz] = useState<UsuarioEnVoz[]>([])
  const [micActivo, setMicActivo] = useState(true)
  const [esDuenoConexion, setEsDuenoConexion] = useState(false)

  const roomName = nombreSalaVozJitsi(claseId)
  const montarContenedor = solicitudUnirse || enSala
  const modoZoom = vozAutomatica && esDuenoConexion

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
    liberarConexionVoz(panelId)
    setEsDuenoConexion(false)
    notificarEnSala(false)
    setConectando(false)
    setSolicitudUnirse(false)
    setMicActivo(true)
    autoIniciadoRef.current = false
  }, [notificarEnSala, panelId])

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
    if (!reclamarConexionVoz(panelId)) return

    setEsDuenoConexion(true)
    autoIniciadoRef.current = true
    setError(null)
    setSolicitudUnirse(true)

    void cargarScriptJitsi().catch(() => {})

    return () => {
      liberarConexionVoz(panelId)
    }
  }, [vozAutomatica, claseId, nombre, panelId])

  useEffect(() => {
    if (!solicitudUnirse || enSala || apiRef.current) return
    if (vozAutomatica && !esDuenoConexion) return
    if (!claseId || !nombre.trim()) return

    let cancelado = false

    async function conectar() {
      setError(null)
      setConectando(true)

      try {
        await cargarScriptJitsi()

        if (cancelado) return

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
            disableDeepLinking: true,
            enableClosePage: false,
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            subject: "Escuela Sabática — voz grupal",
            toolbarConfig: {
              alwaysVisible: true,
            },
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            TOOLBAR_BUTTONS: [
              "microphone",
              "hangup",
              "settings",
              "raisehand",
              "participants-pane",
              "tileview",
            ],
          },
        })

        if (cancelado) {
          api.dispose()
          return
        }

        apiRef.current = api

        api.addListener("videoConferenceJoined", () => {
          if (cancelado) return
          notificarEnSala(true)
          setConectando(false)
          try {
            api.executeCommand("toggleVideo")
          } catch {
            // sin cámara
          }
        })

        api.addListener("audioMuteStatusChanged", (payload: unknown) => {
          const p = payload as { muted?: boolean }
          if (typeof p?.muted === "boolean") setMicActivo(!p.muted)
        })

        api.addListener("readyToClose", () => {
          salirSala()
        })
      } catch (e) {
        if (cancelado) return
        setConectando(false)
        setSolicitudUnirse(false)
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
      cancelado = true
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
    esDuenoConexion,
  ])

  function unirseAVoz() {
    if (!claseId || !nombre.trim() || enSala || conectando || solicitudUnirse) return
    if (!reclamarConexionVoz(panelId)) return
    setEsDuenoConexion(true)
    setError(null)
    setSolicitudUnirse(true)
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

      {!enSala && !conectando && !modoZoom && (
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

      {!enSala && (conectando || (modoZoom && solicitudUnirse)) && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"
            aria-hidden
          />
          <p className="text-center text-sm font-medium text-violet-900">
            Conectando a la voz de la clase…
          </p>
          <p className="max-w-xs text-center text-xs text-slate-500">
            Permite el micrófono si el navegador lo pide. Puedes seguir leyendo el PDF.
          </p>
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
          className={
            enSala
              ? visible
                ? "min-h-[220px] flex-1 bg-slate-900"
                : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
              : visible
                ? "min-h-[120px] flex-1 bg-slate-900"
                : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
          }
          aria-hidden={!visible && !enSala}
        />
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

      {!visible && enSala && (
        <p className="sr-only">Conectado a la sala de voz en segundo plano</p>
      )}
    </div>
  )
}
