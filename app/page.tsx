"use client"

import { useState, useEffect } from "react"
import Biblia from "@/components/Biblia"
import dynamic from "next/dynamic"
import {
  subscribeComentarios,
  guardarComentario,
  eliminarComentario,
  leerComentariosLocal,
  migrarComentariosLocales,
  guardarComentariosLocal,
} from "@/lib/comentarios"

import LeccionControls from "@/components/LeccionControls"

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

type MobileTab = "pdf" | "estudio"

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [editFecha, setEditFecha] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState("")
  const [BibliaPasaje, setBibliaPasaje] = useState("")
  const [semana, setSemana] = useState(1)
  const [tipo, setTipo] = useState("visual")
  const [comentariosPorFecha, setComentariosPorFecha] = useState<Record<string, string>>({})
  const [comentario, setComentario] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [cargandoComentarios, setCargandoComentarios] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("pdf")

  function formatDateDMY(dateStr: string) {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  function agregarVersiculo(v: string) {
    setComentario((prev) => (prev ? prev + "\n" + v : v))
    setBibliaPasaje(v)
    setMobileTab("estudio")
  }

  useEffect(() => {
    let migrado = false

    const unsubscribe = subscribeComentarios(
      async (data) => {
        if (!migrado && Object.keys(data).length === 0) {
          const local = leerComentariosLocal()
          if (Object.keys(local).length > 0) {
            try {
              await migrarComentariosLocales(local)
            } catch {
              setComentariosPorFecha(local)
              setSyncError("Sin conexión. Mostrando comentarios guardados en este dispositivo.")
            }
            migrado = true
            return
          }
        }
        migrado = true
        setComentariosPorFecha(data)
        setSyncError(null)
        setCargandoComentarios(false)
      },
      () => {
        const local = leerComentariosLocal()
        setComentariosPorFecha(local)
        setSyncError("Sin conexión a Firebase. Usando comentarios locales.")
        setCargandoComentarios(false)
      }
    )

    return () => unsubscribe()
  }, [])

  async function handleGuardar(fecha: string, texto: string) {
    setGuardando(true)
    try {
      await guardarComentario(fecha, texto)
      setComentariosPorFecha((prev) => {
        const nuevo = { ...prev, [fecha]: texto }
        guardarComentariosLocal(nuevo)
        return nuevo
      })
      setSyncError(null)
    } catch {
      setComentariosPorFecha((prev) => {
        const nuevo = { ...prev, [fecha]: texto }
        guardarComentariosLocal(nuevo)
        return nuevo
      })
      setSyncError("No se pudo sincronizar. Guardado solo en este dispositivo.")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(fecha: string) {
    setGuardando(true)
    try {
      await eliminarComentario(fecha)
      setComentariosPorFecha((prev) => {
        const nuevo = { ...prev }
        delete nuevo[fecha]
        guardarComentariosLocal(nuevo)
        return nuevo
      })
      setSyncError(null)
    } catch {
      setComentariosPorFecha((prev) => {
        const nuevo = { ...prev }
        delete nuevo[fecha]
        guardarComentariosLocal(nuevo)
        return nuevo
      })
      setSyncError("No se pudo eliminar en la nube. Eliminado solo en este dispositivo.")
    } finally {
      setGuardando(false)
    }
  }

  const pdfUrl = `/pdfs/semana${semana}/${tipo === "leccion" ? "leccion" : tipo}.pdf`

  return (
    <div className="flex h-full min-h-0 w-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0">
      <div
        className={`flex min-h-0 min-w-0 flex-col bg-slate-50 lg:flex-7 lg:border-r lg:border-border ${
          mobileTab === "pdf" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        <div className="shrink-0 border-b border-border bg-card p-2 lg:hidden">
          <LeccionControls semana={semana} setSemana={setSemana} tipo={tipo} setTipo={setTipo} />
        </div>
        {BibliaPasaje && (
          <div className="border-b border-accent/30 bg-accent-soft px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
              Pasaje seleccionado
            </p>
            <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">{BibliaPasaje}</p>
            <button
              type="button"
              onClick={() => setBibliaPasaje("")}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}
        <div className="relative min-h-0 flex-1 w-full">
          <PdfViewer key={`${semana}-${tipo}`} url={pdfUrl} />
        </div>
      </div>

      <aside
        className={`flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto custom-scroll bg-surface p-3 md:p-4 lg:flex-2 ${
          mobileTab === "estudio" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        <div className="hidden lg:block">
          <LeccionControls semana={semana} setSemana={setSemana} tipo={tipo} setTipo={setTipo} />
        </div>

        {/* Comentarios */}
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mis notas</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="min-h-10 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white shadow-sm active:opacity-90"
            >
              Ver todos
            </button>
          </div>

          {syncError && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
              {syncError}
            </div>
          )}

          <div className="max-h-48 custom-scroll overflow-y-auto lg:max-h-none lg:h-75">
            {cargandoComentarios && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Cargando...
              </div>
            )}

            {!cargandoComentarios && Object.keys(comentariosPorFecha).length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Aún no hay notas guardadas.</p>
            )}

            {Object.entries(comentariosPorFecha)
              .filter(([fecha]) => !selectedDate || fecha === selectedDate)
              .map(([fecha, texto]) => (
                <article
                  key={fecha}
                  className="mb-3 rounded-lg border border-border bg-surface/80 p-2.5 last:mb-0"
                >
                  <time className="text-xs font-medium text-primary">{formatDateDMY(fecha)}</time>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line line-clamp-4">
                    {texto}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-accent-soft transition disabled:opacity-50"
                      onClick={() => {
                        setEditFecha(fecha)
                        setEditTexto(texto)
                      }}
                      disabled={guardando}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      onClick={() => handleEliminar(fecha)}
                      disabled={guardando}
                    >
                      Eliminar
                    </button>
                  </div>
                  {editFecha === fecha && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      <textarea
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        className={`${inputClass} min-h-20 resize-none`}
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          disabled={guardando}
                          onClick={async () => {
                            await handleGuardar(fecha, editTexto)
                            setEditFecha(null)
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-slate-600"
                          onClick={() => setEditFecha(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </section>

        {/* Biblia */}
        <section className="min-h-40 max-h-56 custom-scroll overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-sm lg:max-h-none lg:h-50">
          <Biblia agregarVersiculo={agregarVersiculo} />
        </section>

        {/* Nuevo comentario */}
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Nueva nota</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setShowInput(true)
              const existente = comentariosPorFecha[e.target.value]
              setComentario(existente ?? "")
            }}
            className={inputClass}
          />
          {showInput && selectedDate && (
            <div className="mt-2 space-y-2">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe tu reflexión del día..."
                className={`${inputClass} min-h-25 resize-none`}
              />
              <button
                type="button"
                className="min-h-12 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-md shadow-primary/20 active:opacity-90 disabled:opacity-50"
                disabled={guardando || !comentario.trim()}
                onClick={async () => {
                  await handleGuardar(selectedDate, comentario)
                  alert("Comentario guardado")
                }}
              >
                {guardando ? "Guardando..." : "Guardar nota"}
              </button>
            </div>
          )}
        </section>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegación principal"
      >
        <button
          type="button"
          onClick={() => setMobileTab("pdf")}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "pdf" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="text-lg" aria-hidden>📄</span>
          Lección PDF
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("estudio")}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "estudio" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="text-lg" aria-hidden>📖</span>
          Biblia y notas
        </button>
      </nav>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-primary px-5 py-4 text-white">
              <h2 className="font-display text-lg font-semibold">Todas mis notas</h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                {Object.keys(comentariosPorFecha).length} nota(s) guardada(s)
              </p>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              onClick={() => setShowModal(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="custom-scroll max-h-[60vh] overflow-y-auto p-5">
              {Object.keys(comentariosPorFecha).length === 0 && (
                <p className="text-center text-sm text-muted">No hay notas guardadas.</p>
              )}
              {Object.entries(comentariosPorFecha)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, texto]) => (
                  <article key={fecha} className="mb-4 border-b border-border pb-4 last:mb-0 last:border-0">
                    <time className="text-xs font-semibold text-primary">{formatDateDMY(fecha)}</time>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{texto}</p>
                  </article>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
