"use client"

import { useMemo, useState } from "react"
import { formatoCodigoLegible } from "@/lib/clase"
import {
  construirEnlaceInvitacion,
  mensajeCompartirInvitacion,
} from "@/lib/enlaceInvitacion"

interface EnlaceInvitacionClaseProps {
  claseId: string
  nombreClase?: string
  compacto?: boolean
}

export default function EnlaceInvitacionClase({
  claseId,
  nombreClase = "",
  compacto = false,
}: EnlaceInvitacionClaseProps) {
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enlace = useMemo(
    () => (claseId ? construirEnlaceInvitacion(claseId) : ""),
    [claseId]
  )
  const codigoLegible = formatoCodigoLegible(claseId)

  async function copiarEnlace() {
    if (!enlace) return
    setError(null)
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setError("No se pudo copiar. Selecciona el enlace manualmente.")
    }
  }

  async function copiarMensaje() {
    if (!enlace) return
    setError(null)
    const texto = mensajeCompartirInvitacion(nombreClase, codigoLegible, enlace)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setError("No se pudo copiar el mensaje.")
    }
  }

  async function compartirNativo() {
    if (!enlace || !navigator.share) {
      await copiarMensaje()
      return
    }
    setError(null)
    const texto = mensajeCompartirInvitacion(nombreClase, codigoLegible, enlace)
    try {
      await navigator.share({
        title: nombreClase || "Escuela Sabática",
        text: texto,
        url: enlace,
      })
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        await copiarMensaje()
      }
    }
  }

  function abrirWhatsApp() {
    if (!enlace) return
    const texto = encodeURIComponent(
      mensajeCompartirInvitacion(nombreClase, codigoLegible, enlace)
    )
    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer")
  }

  if (!claseId) return null

  return (
    <div
      className={`rounded-lg border border-primary/20 bg-white/90 ${compacto ? "p-2.5" : "p-3"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Enlace de invitación
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">
        Compártelo por WhatsApp o mensaje. Al abrirlo, tus hermanos entran como{" "}
        <strong>alumno</strong> con el código ya listo — solo escriben su nombre.
      </p>
      <div className="mt-2 flex items-stretch gap-1.5">
        <input
          type="text"
          readOnly
          value={enlace}
          className="min-w-0 flex-1 rounded-lg border border-border bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-slate-700 sm:text-xs"
          onFocus={(e) => e.target.select()}
          aria-label="Enlace de invitación a la clase"
        />
        <button
          type="button"
          onClick={() => void copiarEnlace()}
          className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-primary-dark"
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => void compartirNativo()}
          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-surface"
        >
          Compartir…
        </button>
        <button
          type="button"
          onClick={abrirWhatsApp}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void copiarMensaje()}
          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-surface"
        >
          Copiar mensaje
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
