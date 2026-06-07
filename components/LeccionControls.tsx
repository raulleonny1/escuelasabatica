"use client"

import { TOTAL_SEMANAS } from "@/lib/semana"

const TIPOS = [
  { id: "leccion", label: "Lección" },
  { id: "visual", label: "Visual" },
] as const

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

interface LeccionControlsProps {
  semana: number
  setSemana: (n: number) => void
  tipo: string
  setTipo: (t: string) => void
  onLeccionClick?: () => void
  vistaResumenSemanal?: boolean
  setVistaResumenSemanal?: (v: boolean) => void
  compacto?: boolean
}

export default function LeccionControls({
  semana,
  setSemana,
  tipo,
  setTipo,
  onLeccionClick,
  vistaResumenSemanal = false,
  setVistaResumenSemanal,
  compacto = false,
}: LeccionControlsProps) {
  function elegirTipo(id: string) {
    setVistaResumenSemanal?.(false)
    setTipo(id)
    if (id === "leccion") onLeccionClick?.()
  }

  function elegirResumen() {
    if (vistaResumenSemanal) {
      setVistaResumenSemanal?.(false)
      onLeccionClick?.()
    } else {
      setVistaResumenSemanal?.(true)
    }
  }

  const btnTipo = (activo: boolean) =>
    activo
      ? "bg-primary text-white shadow-sm"
      : "border border-border bg-white text-slate-600"

  const btnTipoFull = (activo: boolean) =>
    activo
      ? "bg-primary text-white shadow-md shadow-primary/25"
      : "border border-border bg-white text-slate-600"

  if (compacto) {
    return (
      <section className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm">
        <label className="sr-only" htmlFor="semana-select-compacto">
          Semana
        </label>
        <select
          id="semana-select-compacto"
          value={semana}
          onChange={(e) => setSemana(Number(e.target.value))}
          className="h-9 min-w-[6.5rem] shrink-0 rounded-lg border border-border bg-white px-2 text-sm text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {Array.from({ length: TOTAL_SEMANAS }, (_, i) => (
            <option key={i} value={i + 1}>
              Sem. {i + 1}
            </option>
          ))}
        </select>
        <div className="flex flex-1 gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => elegirTipo(t.id)}
              className={`min-h-9 flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition active:scale-[0.98] ${btnTipo(!vistaResumenSemanal && tipo === t.id)}`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={elegirResumen}
            className={`min-h-9 flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition active:scale-[0.98] ${btnTipo(vistaResumenSemanal)}`}
          >
            Resumen
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Lección</p>
      <label className="mb-1 block text-xs text-slate-500">Semana</label>
      <select
        value={semana}
        onChange={(e) => setSemana(Number(e.target.value))}
        className={inputClass}
      >
        {Array.from({ length: TOTAL_SEMANAS }, (_, i) => (
          <option key={i} value={i + 1}>
            Semana {i + 1}
          </option>
        ))}
      </select>

      <p className="mb-2 mt-3 text-xs text-slate-500">Tipo de material</p>
      <div className="grid grid-cols-3 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => elegirTipo(t.id)}
            className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${btnTipoFull(!vistaResumenSemanal && tipo === t.id)}`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={elegirResumen}
          className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${btnTipoFull(vistaResumenSemanal)}`}
        >
          Resumen
        </button>
      </div>
    </section>
  )
}
