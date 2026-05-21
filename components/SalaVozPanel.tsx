"use client"

import { useEffect, useMemo, useState } from "react"
import { urlSalaVozJitsi } from "@/lib/salaVoz"
import {
  iniciarHeartbeatVoz,
  subscribeUsuariosEnVoz,
  type UsuarioEnVoz,
} from "@/lib/vozPresencia"

interface SalaVozPanelProps {
  claseId: string
  nombre: string
  /** Pestaña de voz visible y activa */
  activo?: boolean
  onSalaVozChange?: (enSala: boolean) => void
  className?: string
}

export default function SalaVozPanel({
  claseId,
  nombre,
  activo = false,
  onSalaVozChange,
  className = "",
}: SalaVozPanelProps) {
  const [enVoz, setEnVoz] = useState<UsuarioEnVoz[]>([])
  const [enSala, setEnSala] = useState(false)

  const urlSala = useMemo(() => urlSalaVozJitsi(claseId, nombre), [claseId, nombre])

  useEffect(() => {
    if (!claseId) return
    return subscribeUsuariosEnVoz(claseId, setEnVoz)
  }, [claseId])

  useEffect(() => {
    if (!activo || !claseId || !nombre.trim()) {
      setEnSala(false)
      onSalaVozChange?.(false)
      return
    }
    setEnSala(true)
    onSalaVozChange?.(true)
    return iniciarHeartbeatVoz(claseId, nombre)
  }, [activo, claseId, nombre, onSalaVozChange])

  const otrosEnVoz = enVoz.filter(
    (u) => u.nombre.trim().toLowerCase() !== nombre.trim().toLowerCase()
  )

  function abrirPantallaCompleta() {
    window.open(urlSala, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="shrink-0 border-b border-border bg-violet-50/80 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-900/80">
          Sala de voz grupal
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
          Sala Jitsi integrada. Toca el micrófono en la barra negra para hablar. Sin cámara.
        </p>
        {otrosEnVoz.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-violet-800">
            <span className="font-medium">En la voz:</span>{" "}
            {otrosEnVoz.map((u) => u.nombre).join(", ")}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-slate-500">
            {enSala ? "Estás en la sala — otros pueden unirse aquí." : "Aún no hay nadie más en la voz."}
          </p>
        )}
      </div>

      {!activo ? (
        <p className="p-4 text-center text-sm text-slate-500">
          Abre la pestaña Voz grupal para entrar a la llamada.
        </p>
      ) : (
        <>
          <div className="relative min-h-[min(50vh,320px)] flex-1 bg-slate-900">
            <iframe
              title="Sala de voz de la clase"
              src={urlSala}
              allow="microphone; camera; fullscreen; display-capture; autoplay"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-card p-2">
            <button
              type="button"
              onClick={abrirPantallaCompleta}
              className="min-h-10 flex-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900"
            >
              Abrir en pantalla completa
            </button>
            <p className="w-full text-center text-[10px] text-slate-500">
              Si no se ve la sala, usa el botón de arriba o permite micrófono en el navegador.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
