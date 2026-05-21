"use client"

import { getFechasSemana } from "@/lib/semana"
import type { NotaClase } from "@/lib/comentarios"
import type { NotaClaseEntrada } from "@/lib/compartirNotas"

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

interface NotasPanelProps {
  semana: number
  misComentarios: Record<string, NotaClase>
  comentariosOtrosDelDia: NotaClaseEntrada[]
  selectedDate: string
  setSelectedDate: (fecha: string) => void
  comentario: string
  setComentario: (texto: string) => void
  cargando: boolean
  syncError: string | null
  guardando: boolean
  editFecha: string | null
  editTexto: string
  setEditFecha: (fecha: string | null) => void
  setEditTexto: (texto: string) => void
  onGuardar: (fecha: string, texto: string) => Promise<void>
  onEliminar: (fecha: string) => Promise<void>
  onVerMisComentarios: () => void
  onVerComentariosOtros: () => void
  yoCompartoNotas: boolean
  onCambiarCompartir: (acepta: boolean) => void | Promise<void>
}

function formatDateDMY(dateStr: string) {
  if (!dateStr) return ""
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

export default function NotasPanel({
  semana,
  misComentarios,
  comentariosOtrosDelDia,
  selectedDate,
  setSelectedDate,
  comentario,
  setComentario,
  cargando,
  syncError,
  guardando,
  editFecha,
  editTexto,
  setEditFecha,
  setEditTexto,
  onGuardar,
  onEliminar,
  onVerMisComentarios,
  onVerComentariosOtros,
  yoCompartoNotas,
  onCambiarCompartir,
}: NotasPanelProps) {
  const diasSemana = getFechasSemana(semana)

  const mapaTexto = Object.fromEntries(
    Object.entries(misComentarios).map(([f, n]) => [f, n.texto])
  )

  const notaSeleccionada = selectedDate ? mapaTexto[selectedDate] : undefined

  function seleccionarDia(fecha: string) {
    setSelectedDate(fecha)
    setComentario(misComentarios[fecha]?.texto ?? "")
    setEditFecha(null)
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Comentarios</p>
          <p className="text-xs text-slate-500">Semana {semana} · un comentario tuyo por día</p>
        </div>

        <p className="mb-2 text-[11px] leading-snug text-slate-600">
          Escribe <strong>un comentario</strong> por día. Los demás solo lo ven si tú y ellos marcan
          compartir abajo.
        </p>

        <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2">
          <input
            type="checkbox"
            checked={yoCompartoNotas}
            onChange={(e) => void onCambiarCompartir(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary"
          />
          <span className="text-[11px] leading-snug text-slate-700">
            <strong className="text-primary">Compartir mis comentarios</strong> con el grupo. Si no
            aceptas, no verás los de otros y ellos no verán los tuyos.
          </span>
        </label>

        {syncError && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            {syncError}
          </div>
        )}

        {cargando ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Cargando comentarios…
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={onVerMisComentarios}
                className="min-h-9 shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:bg-primary/20"
              >
                Mis comentarios
              </button>
              <button
                type="button"
                onClick={onVerComentariosOtros}
                className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium active:opacity-90 ${
                  yoCompartoNotas
                    ? "bg-violet-100 text-violet-900"
                    : "border border-violet-200 bg-white text-violet-800"
                }`}
              >
                Ver comentarios de otros
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => {
                const tengo = Boolean(mapaTexto[dia.fecha]?.trim())
                const activo = selectedDate === dia.fecha
                return (
                  <button
                    key={dia.fecha}
                    type="button"
                    onClick={() => seleccionarDia(dia.fecha)}
                    className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border px-0.5 py-1.5 text-center transition active:scale-[0.97] ${
                      activo
                        ? "border-primary bg-primary text-white shadow-md"
                        : tengo
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-surface text-slate-600"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-medium leading-none ${activo ? "text-blue-100" : ""}`}
                    >
                      {dia.diaCorto}
                    </span>
                    <span className="mt-0.5 text-base font-bold leading-none">{dia.diaNum}</span>
                    <span
                      className={`text-[9px] leading-none ${activo ? "text-blue-100" : "text-muted"}`}
                    >
                      {dia.mesCorto}
                    </span>
                    {tengo && (
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${activo ? "bg-accent" : "bg-primary"}`}
                        aria-label="Tienes comentario"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDate && yoCompartoNotas && comentariosOtrosDelDia.length > 0 && (
              <div className="mb-3 rounded-lg border border-violet-200/80 bg-violet-50/50 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                  Otros este día ({formatDateDMY(selectedDate)})
                </p>
                <ul className="mt-1.5 space-y-2">
                  {comentariosOtrosDelDia.map(({ fecha, nota }) => (
                    <li
                      key={`${fecha}-${nota.autor}`}
                      className="rounded-md bg-white/80 px-2 py-1.5 text-sm text-slate-700"
                    >
                      <span className="text-[10px] font-medium text-violet-800">{nota.autor}</span>
                      <p className="mt-0.5 whitespace-pre-line leading-relaxed">{nota.texto}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDate && notaSeleccionada && editFecha !== selectedDate && (
              <article className="rounded-lg border border-border bg-surface/80 p-2.5">
                <time className="text-xs font-medium text-primary">
                  Tu comentario · {formatDateDMY(selectedDate)}
                </time>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {notaSeleccionada}
                </p>
                {!yoCompartoNotas && (
                  <p className="mt-1 text-[10px] text-amber-800">
                    Solo tú lo ves hasta que marques compartir.
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 min-h-10 rounded-md border border-border bg-white text-xs font-medium text-slate-600"
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
                    className="flex-1 min-h-10 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-700"
                    onClick={() => void onEliminar(selectedDate)}
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

      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Escribir comentario
        </p>
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
            <p className="text-xs font-medium text-primary">
              Comentario para {formatDateDMY(selectedDate)}
            </p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Tu reflexión del día… (visible para otros solo si compartes)"
              className={`${inputClass} min-h-28 resize-none`}
            />
            <button
              type="button"
              className="min-h-12 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-md shadow-primary/20 active:opacity-90 disabled:opacity-50"
              disabled={guardando || !comentario.trim() || cargando}
              onClick={() => void onGuardar(selectedDate, comentario)}
            >
              {guardando ? "Guardando…" : "Guardar comentario"}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
