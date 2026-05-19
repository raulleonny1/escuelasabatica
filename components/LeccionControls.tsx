"use client"

const TIPOS = [
  { id: "leccion", label: "Lección" },
  { id: "visual", label: "Visual" },
  { id: "resumen", label: "Resumen" },
  { id: "preguntas", label: "Preguntas" },
] as const

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

interface LeccionControlsProps {
  semana: number
  setSemana: (n: number) => void
  tipo: string
  setTipo: (t: string) => void
  onLeccionClick?: () => void
}

export default function LeccionControls({
  semana,
  setSemana,
  tipo,
  setTipo,
  onLeccionClick,
}: LeccionControlsProps) {
  function elegirTipo(id: string) {
    setTipo(id)
    if (id === "leccion") onLeccionClick?.()
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
        {Array.from({ length: 13 }, (_, i) => (
          <option key={i} value={i + 1}>
            Semana {i + 1}
          </option>
        ))}
      </select>

      <p className="mb-2 mt-3 text-xs text-slate-500">Tipo de material</p>
      <div className="grid grid-cols-2 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => elegirTipo(t.id)}
            className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
              tipo === t.id
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "border border-border bg-white text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  )
}
