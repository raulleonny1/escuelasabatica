"use client"

import { useMemo } from "react"
import { useSalaAudioOptional } from "@/components/SalaAudioContext"
import { getChatSessionId } from "@/lib/chat"

/** SVG tamaño fijo: solo cambia opacidad del relleno, nunca el layout. */
function IconoMicrofono({
  activo,
  className = "h-3.5 w-3.5",
}: {
  activo: boolean
  className?: string
}) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3z"
        className={activo ? "fill-emerald-400" : "fill-white/15"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M5 11a7 7 0 0014 0M12 18v3M9 21h6"
        className="fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

const ANCHO_BARRA = "w-[19rem]"
const ANCHO_CONTROLES = "w-[8.75rem]"

/** Audio en vivo: caja de tamaño fijo; botones anclados a la derecha. */
export default function SalaAudioBanner() {
  const sala = useSalaAudioOptional()
  const peerId = useMemo(() => getChatSessionId(), [])

  if (!sala) return null

  const {
    enSala,
    conectando,
    silenciado,
    participantes,
    error,
    entrarSala,
    salirSala,
    toggleSilencio,
  } = sala

  const yoHablo = participantes.some((p) => p.peerId === peerId && p.speaking)
  const otros = useMemo(
    () => [...participantes].sort((a, b) => a.peerId.localeCompare(b.peerId)).slice(0, 5),
    [participantes]
  )

  if (!enSala && !conectando && !error) {
    return (
      <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
        <span className="text-base leading-none" aria-hidden>
          🎙️
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent sm:text-xs">
          Audio de la clase
        </p>
        <button
          type="button"
          onClick={() => void entrarSala()}
          className="h-8 shrink-0 rounded-lg bg-accent px-3 text-xs font-bold text-primary-dark shadow-sm active:opacity-90"
        >
          Unirse
        </button>
      </div>
    )
  }

  return (
    <div className={`${ANCHO_BARRA} max-w-full shrink-0`}>
      <div
        className={`relative h-10 rounded-xl border backdrop-blur-sm ${
          enSala
            ? "border-emerald-400/40 bg-emerald-500/15"
            : "border-white/20 bg-white/10"
        }`}
      >
        {/* Info + micrófonos de participantes (zona izquierda, sin empujar botones) */}
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 overflow-hidden pl-3"
          style={{ right: "8.75rem" }}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              enSala ? "bg-emerald-400" : "bg-white/40"
            }`}
            aria-hidden
          />
          <p className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">
            {enSala ? "Audio" : "…"}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            {otros.map((p) => (
              <span
                key={p.peerId}
                className="flex h-4 w-4 shrink-0 items-center justify-center"
                title={p.nombre}
              >
                <IconoMicrofono activo={p.speaking} className="h-3 w-3 text-white/50" />
              </span>
            ))}
          </div>
        </div>

        {/* Controles fijos a la derecha — nunca se mueven */}
        <div
          className={`absolute inset-y-0 right-0 flex ${ANCHO_CONTROLES} items-center justify-end gap-1.5 border-l border-white/15 px-2`}
        >
          <button
            type="button"
            onClick={() => void toggleSilencio()}
            disabled={!enSala || conectando}
            className={`flex h-8 w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-lg text-[11px] font-semibold active:opacity-90 disabled:opacity-50 ${
              silenciado ? "bg-amber-400 text-amber-950" : "bg-white/15 text-white"
            }`}
            aria-pressed={silenciado}
          >
            <IconoMicrofono activo={!silenciado && yoHablo} className="h-3.5 w-3.5" />
            Mic
          </button>
          <button
            type="button"
            onClick={() => void salirSala()}
            disabled={conectando}
            className="flex h-8 w-[3.25rem] shrink-0 items-center justify-center rounded-lg bg-red-500/90 text-[11px] font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-1 rounded-md bg-red-500/25 px-2 py-1 text-[11px] text-red-100">{error}</p>
      )}
    </div>
  )
}
