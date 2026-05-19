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
import NotasPanel from "@/components/NotasPanel"
import ChatNombreModal from "@/components/ChatNombreModal"
import ChatPanel from "@/components/ChatPanel"
import {
  getFechaDestacadaEnSemana,
  getFechasSemana,
  getSemanaActual,
} from "@/lib/semana"
import {
  anunciarEntradaChat,
  getChatSessionId,
  guardarNombreChat,
  iniciarPresenciaChat,
  leerNombreChat,
} from "@/lib/chat"

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })

type MobileTab = "pdf" | "estudio" | "chat"

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [editFecha, setEditFecha] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState("")
  const [BibliaPasaje, setBibliaPasaje] = useState("")
  const [semana, setSemana] = useState(() => getSemanaActual())
  const [tipo, setTipo] = useState("visual")
  const [comentariosPorFecha, setComentariosPorFecha] = useState<Record<string, string>>({})
  const [comentario, setComentario] = useState("")
  const [selectedDate, setSelectedDate] = useState(() =>
    getFechaDestacadaEnSemana(getSemanaActual())
  )
  const [cargandoComentarios, setCargandoComentarios] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("pdf")
  const [leccionJump, setLeccionJump] = useState(0)
  const [chatNombre, setChatNombre] = useState<string | null>(null)
  const [chatNombreListo, setChatNombreListo] = useState(false)

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
    const guardado = leerNombreChat()
    setChatNombre(guardado || null)
    setChatNombreListo(true)
  }, [])

  useEffect(() => {
    if (!chatNombre) return
    const sessionId = getChatSessionId()
    anunciarEntradaChat(chatNombre, sessionId).catch(() => {})
    return iniciarPresenciaChat(chatNombre)
  }, [chatNombre])

  function handleConfirmarNombreChat(nombre: string) {
    guardarNombreChat(nombre)
    setChatNombre(nombre)
  }

  function handleCambiarNombreChat() {
    localStorage.removeItem("chatNombre")
    sessionStorage.removeItem("chatJoinAnnounced")
    setChatNombre(null)
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

  useEffect(() => {
    const dias = getFechasSemana(semana)
    if (!dias.length) return
    const enRango = dias.some((d) => d.fecha === selectedDate)
    if (!enRango) {
      const fecha = getFechaDestacadaEnSemana(semana)
      setSelectedDate(fecha)
      setComentario(comentariosPorFecha[fecha] ?? "")
    }
  }, [semana, selectedDate, comentariosPorFecha])

  async function handleGuardar(fecha: string, texto: string) {
    setGuardando(true)
    try {
      await guardarComentario(fecha, texto, semana)
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
  const pdfViewerKey =
    tipo === "leccion" ? `${semana}-leccion-${leccionJump}` : `${semana}-${tipo}`

  return (
    <div className="flex h-full min-h-0 w-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0">
      <div
        className={`flex min-h-0 min-w-0 flex-col bg-slate-50 lg:flex-7 lg:border-r lg:border-border ${
          mobileTab === "pdf" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        <div className="shrink-0 border-b border-border bg-card p-2 lg:hidden">
          <LeccionControls
            semana={semana}
            setSemana={setSemana}
            tipo={tipo}
            setTipo={setTipo}
            onLeccionClick={() => setLeccionJump((n) => n + 1)}
          />
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
          <PdfViewer
            key={pdfViewerKey}
            url={pdfUrl}
            irAlDiaLectura={tipo === "leccion"}
            semana={semana}
          />
        </div>
      </div>

      <aside
        className={`flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto custom-scroll bg-surface p-3 md:p-4 lg:flex-2 ${
          mobileTab === "estudio" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        <div className="hidden lg:block">
          <LeccionControls
            semana={semana}
            setSemana={setSemana}
            tipo={tipo}
            setTipo={setTipo}
            onLeccionClick={() => setLeccionJump((n) => n + 1)}
          />
        </div>

        <NotasPanel
          semana={semana}
          comentariosPorFecha={comentariosPorFecha}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          comentario={comentario}
          setComentario={setComentario}
          cargandoComentarios={cargandoComentarios}
          syncError={syncError}
          guardando={guardando}
          editFecha={editFecha}
          editTexto={editTexto}
          setEditFecha={setEditFecha}
          setEditTexto={setEditTexto}
          onGuardar={handleGuardar}
          onEliminar={handleEliminar}
          onVerTodos={() => setShowModal(true)}
        />

        {chatNombre && (
          <ChatPanel
            nombre={chatNombre}
            onCambiarNombre={handleCambiarNombreChat}
            className="hidden lg:flex lg:min-h-[280px] lg:max-h-[340px]"
          />
        )}

        <section className="flex min-h-[min(50vh,360px)] max-h-[min(55vh,480px)] flex-col custom-scroll overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-sm lg:min-h-[320px] lg:max-h-[420px]">
          <Biblia agregarVersiculo={agregarVersiculo} />
        </section>
      </aside>

      {chatNombre && (
        <div
          className={`flex min-h-0 flex-1 flex-col bg-surface p-3 md:p-4 lg:hidden ${
            mobileTab === "chat" ? "flex" : "hidden"
          }`}
        >
          <ChatPanel
            nombre={chatNombre}
            onCambiarNombre={handleCambiarNombreChat}
            className="min-h-0 flex-1"
          />
        </div>
      )}

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
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "chat" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="text-lg" aria-hidden>💬</span>
          Chat
        </button>
      </nav>

      {chatNombreListo && !chatNombre && (
        <ChatNombreModal onConfirm={handleConfirmarNombreChat} />
      )}

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
