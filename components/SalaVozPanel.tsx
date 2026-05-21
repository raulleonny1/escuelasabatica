"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { urlSalaVozJitsi } from "@/lib/salaVoz"
import {
  iniciarHeartbeatVoz,
  subscribeUsuariosEnVoz,
  type UsuarioEnVoz,
} from "@/lib/vozPresencia"

interface SalaVozPanelProps {
  claseId: string
  nombre: string
  esMaestro?: boolean
  activo?: boolean
  onSalaVozChange?: (enSala: boolean) => void
  className?: string
}

export default function SalaVozPanel({
  claseId,
  nombre,
  esMaestro = false,
  activo = false,
  onSalaVozChange,
  className = "",
}: SalaVozPanelProps) {
  const [enVoz, setEnVoz] = useState<UsuarioEnVoz[]>([])
  const [mostrarIframe, setMostrarIframe] = useState(false)
  const abrioSalaRef = useRef(false)

  const urlSala = useMemo(
    () => urlSalaVozJitsi(claseId, nombre, esMaestro),
    [claseId, nombre, esMaestro]
  )

  useEffect(() => {
    if (!claseId) return
    return subscribeUsuariosEnVoz(claseId, setEnVoz)
  }, [claseId])

  useEffect(() => {
    if (!activo || !claseId || !nombre.trim()) {
      onSalaVozChange?.(false)
      return
    }
    onSalaVozChange?.(true)
    return iniciarHeartbeatVoz(claseId, nombre)
  }, [activo, claseId, nombre, onSalaVozChange])

  useEffect(() => {
    if (!activo || !esMaestro || abrioSalaRef.current) return
    abrioSalaRef.current = true
    window.open(urlSala, "_blank", "noopener,noreferrer")
  }, [activo, esMaestro, urlSala])

  const otrosEnVoz = enVoz.filter(
    (u) => u.nombre.trim().toLowerCase() !== nombre.trim().toLowerCase()
  )

  function abrirComoAnfitrion() {
    window.open(urlSala, "_blank", "noopener,noreferrer")
  }

  if (!activo) {
    return (
      <div className={className}>
        <p className="p-4 text-center text-sm text-slate-500">
          Abre la pestaña Voz grupal para la llamada.
        </p>
      </div>
    )
  }

  if (esMaestro) {
    return (
      <div className={`flex min-h-0 flex-col ${className}`}>
        <div className="shrink-0 border-b border-amber-300/60 bg-gradient-to-r from-amber-50 to-violet-50 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Tú diriges la reunión
          </p>
          <p className="mt-1.5 text-sm leading-snug text-slate-800">
            En Jitsi público el <strong>maestro debe abrir la sala</strong> como anfitrión. Los
            alumnos no pueden empezar solos.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-700">
            <li>Pulsa el botón de abajo (se abre la sala).</li>
            <li>
              Si Jitsi lo pide, pulsa el botón azul <strong>«Soy el anfitrión»</strong> (solo una
              vez).
            </li>
            <li>Cuando ya estés dentro, avisa a tus alumnos que entren a Voz grupal.</li>
          </ol>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <button
            type="button"
            onClick={abrirComoAnfitrion}
            className="min-h-12 w-full max-w-sm rounded-xl bg-gradient-to-r from-violet-700 to-primary px-6 text-sm font-bold text-white shadow-lg"
          >
            Abrir sala como maestro
          </button>
          <button
            type="button"
            onClick={() => setMostrarIframe((v) => !v)}
            className="text-xs font-medium text-violet-800 underline"
          >
            {mostrarIframe ? "Ocultar vista aquí" : "Ver sala también aquí"}
          </button>
        </div>

        {mostrarIframe && (
          <div className="relative min-h-[240px] shrink-0 border-t border-border bg-slate-900">
            <iframe
              title="Sala de voz maestro"
              src={urlSala}
              allow="microphone; camera; fullscreen; display-capture; autoplay"
              className="h-[min(40vh,320px)] w-full border-0"
            />
          </div>
        )}

        {otrosEnVoz.length > 0 && (
          <p className="shrink-0 border-t border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            En la voz: {otrosEnVoz.map((u) => u.nombre).join(", ")}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="shrink-0 border-b border-border bg-violet-50/80 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-900/80">
          Sala de voz grupal
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
          Espera a que tu maestro abra la sala. Si ves «Pidiendo entrar», es normal hasta que él
          entre como anfitrión.
        </p>
        {otrosEnVoz.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-violet-800">
            <span className="font-medium">En la voz:</span>{" "}
            {otrosEnVoz.map((u) => u.nombre).join(", ")}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-amber-800">
            Aún no hay maestro en la sala — avísale que pulse «Abrir sala como maestro».
          </p>
        )}
      </div>

      <div className="relative min-h-[min(45vh,300px)] flex-1 bg-slate-900">
        <iframe
          title="Sala de voz de la clase"
          src={urlSala}
          allow="microphone; camera; fullscreen; display-capture; autoplay"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>

      <div className="shrink-0 border-t border-border bg-card p-2">
        <button
          type="button"
          onClick={abrirComoAnfitrion}
          className="min-h-10 w-full rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900"
        >
          Abrir en pantalla completa
        </button>
      </div>
    </div>
  )
}
