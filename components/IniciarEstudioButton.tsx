"use client"

import { getEstudioDeHoy } from "@/lib/sesionEstudio"

interface IniciarEstudioButtonProps {
  onIniciar: () => void
  cargando?: boolean
  sesionActiva?: { diaLabel: string; iniciadaPor: string } | null
  className?: string
}

export default function IniciarEstudioButton({
  onIniciar,
  cargando = false,
  sesionActiva,
  className = "",
}: IniciarEstudioButtonProps) {
  const hoy = getEstudioDeHoy()

  return (
    <div
      className={`rounded-xl border border-accent/40 bg-gradient-to-r from-primary/10 to-accent-soft/80 p-3 shadow-sm ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Estudio de hoy
      </p>
      <p className="mt-0.5 text-sm text-slate-700">
        Semana {hoy.semana} · {hoy.diaLabel}
        {hoy.esHoy ? " (hoy)" : ""}
      </p>
      {sesionActiva && (
        <p className="mt-1 text-[11px] text-emerald-800">
          Sesión activa: {sesionActiva.diaLabel}
          {sesionActiva.iniciadaPor ? ` · por ${sesionActiva.iniciadaPor}` : ""}
        </p>
      )}
      <button
        type="button"
        onClick={onIniciar}
        disabled={cargando}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 active:opacity-90 disabled:opacity-60"
      >
        <span aria-hidden>📖</span>
        {cargando ? "Abriendo lección…" : "Iniciar estudio de hoy"}
      </button>
    </div>
  )
}
