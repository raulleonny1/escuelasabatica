"use client"

import { getFechasSemana } from "@/lib/semana"

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

interface NotasPanelProps {
  semana: number
  comentariosPorFecha: Record<string, string>
  selectedDate: string
  setSelectedDate: (fecha: string) => void
  comentario: string
  setComentario: (texto: string) => void
  cargandoComentarios: boolean
  syncError: string | null
  guardando: boolean
  editFecha: string | null
  editTexto: string
  setEditFecha: (fecha: string | null) => void
  setEditTexto: (texto: string) => void
  onGuardar: (fecha: string, texto: string) => Promise<void>
  onEliminar: (fecha: string) => Promise<void>
  onVerTodos: () => void
}

function formatDateDMY(dateStr: string) {
  if (!dateStr) return ""
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

export default function NotasPanel({
  semana,
  comentariosPorFecha,
  selectedDate,
  setSelectedDate,
  comentario,
  setComentario,
  cargandoComentarios,
  syncError,
  guardando,
  editFecha,
  editTexto,
  setEditFecha,
  setEditTexto,
  onGuardar,
  onEliminar,
  onVerTodos,
}: NotasPanelProps) {
  const diasSemana = getFechasSemana(semana)
  const notaSeleccionada = selectedDate ? comentariosPorFecha[selectedDate] : undefined

  function seleccionarDia(fecha: string) {
    setSelectedDate(fecha)
    setComentario(comentariosPorFecha[fecha] ?? "")
    setEditFecha(null)
  }

  return (
    <>
      {/* Mis notas — columnas de la semana */}
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mis notas</p>
            <p className="text-xs text-slate-500">Semana {semana} · toca un día</p>
          </div>
          <button
            type="button"
            onClick={onVerTodos}
            className="min-h-10 shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white shadow-sm active:opacity-90"
          >
            Ver todos
          </button>
        </div>

        {syncError && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            {syncError}
          </div>
        )}

        {cargandoComentarios ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Cargando...
          </div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => {
                const tieneNota = Boolean(comentariosPorFecha[dia.fecha]?.trim())
                const activo = selectedDate === dia.fecha
                return (
                  <button
                    key={dia.fecha}
                    type="button"
                    onClick={() => seleccionarDia(dia.fecha)}
                    className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border px-0.5 py-1.5 text-center transition active:scale-[0.97] ${
                      activo
                        ? "border-primary bg-primary text-white shadow-md"
                        : tieneNota
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-surface text-slate-600"
                    }`}
                  >
                    <span className={`text-[10px] font-medium leading-none ${activo ? "text-blue-100" : ""}`}>
                      {dia.diaCorto}
                    </span>
                    <span className="mt-0.5 text-base font-bold leading-none">{dia.diaNum}</span>
                    <span className={`text-[9px] leading-none ${activo ? "text-blue-100" : "text-muted"}`}>
                      {dia.mesCorto}
                    </span>
                    {tieneNota && (
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${activo ? "bg-accent" : "bg-primary"}`}
                        aria-label="Tiene nota"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {!diasSemana.some((d) => comentariosPorFecha[d.fecha]?.trim()) && (
              <p className="py-2 text-center text-sm text-muted">Aún no hay notas en esta semana.</p>
            )}

            {selectedDate && notaSeleccionada && editFecha !== selectedDate && (
              <article className="rounded-lg border border-border bg-surface/80 p-2.5">
                <time className="text-xs font-medium text-primary">{formatDateDMY(selectedDate)}</time>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {notaSeleccionada}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 min-h-10 rounded-md border border-border bg-white text-xs font-medium text-slate-600 active:bg-accent-soft"
                    onClick={() => {
                      setEditFecha(selectedDate)
                      setEditTexto(notaSeleccionada)
                    }}
                    disabled={guardando}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="flex-1 min-h-10 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-700 active:bg-red-100"
                    onClick={() => onEliminar(selectedDate)}
                    disabled={guardando}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            )}

            {editFecha && (
              <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <p className="text-xs font-medium text-primary">Editando {formatDateDMY(editFecha)}</p>
                <textarea
                  value={editTexto}
                  onChange={(e) => setEditTexto(e.target.value)}
                  className={`${inputClass} min-h-24 resize-none`}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 min-h-10 rounded-lg bg-primary text-xs font-medium text-white disabled:opacity-50"
                    disabled={guardando}
                    onClick={async () => {
                      await onGuardar(editFecha, editTexto)
                      setEditFecha(null)
                      if (editFecha === selectedDate) setComentario(editTexto)
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="flex-1 min-h-10 rounded-lg border border-border text-xs font-medium text-slate-600"
                    onClick={() => setEditFecha(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Nueva nota — escribir del día elegido */}
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Nueva nota</p>
        <label className="mb-1 block text-xs text-slate-500">Día de la semana {semana}</label>
        <input
          type="date"
          value={selectedDate}
          min={diasSemana[0]?.fecha}
          max={diasSemana[6]?.fecha}
          onChange={(e) => seleccionarDia(e.target.value)}
          className={inputClass}
        />
        {selectedDate && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-primary font-medium">
              Nota para {formatDateDMY(selectedDate)}
            </p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe tu reflexión del día..."
              className={`${inputClass} min-h-28 resize-none`}
            />
            <button
              type="button"
              className="min-h-12 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-md shadow-primary/20 active:opacity-90 disabled:opacity-50"
              disabled={guardando || !comentario.trim()}
              onClick={() => onGuardar(selectedDate, comentario)}
            >
              {guardando ? "Guardando..." : "Guardar nota del día"}
            </button>
          </div>
        )}
        {!selectedDate && (
          <p className="mt-2 text-xs text-muted">Toca un día en Mis notas de arriba.</p>
        )}
      </section>
    </>
  )
}
