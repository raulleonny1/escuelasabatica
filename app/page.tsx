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

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })

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

  function formatDateDMY(dateStr: string) {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  function agregarVersiculo(v: string) {
    setComentario((prev) => (prev ? prev + "\n" + v : v))
    setBibliaPasaje(v)
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

  return (
    <div className="flex flex-row h-screen w-full">
      <div className="flex-7 border-r flex flex-col">
        {BibliaPasaje && (
          <div className="border-b p-4 bg-yellow-50">
            <div className="font-bold mb-1">Pasaje bíblico seleccionado:</div>
            <div className="text-base text-gray-800 whitespace-pre-line">{BibliaPasaje}</div>
          </div>
        )}
        <div className="flex-1 h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <PdfViewer url={`/pdfs/semana${semana}/${tipo === "leccion" ? "leccion" : tipo}.pdf`} />
        </div>
      </div>

      <div className="flex-2 p-3 flex flex-col gap-2">
        <select
          value={semana}
          onChange={(e) => setSemana(Number(e.target.value))}
          className="border p-2 rounded mb-2 w-full"
        >
          {Array.from({ length: 13 }, (_, i) => (
            <option key={i} value={i + 1}>Semana {i + 1}</option>
          ))}
        </select>

        <div className="flex gap-2 mb-2">
          <button onClick={() => setTipo("visual")} className="border px-3 py-1 rounded flex-1">Visual</button>
          <button onClick={() => setTipo("resumen")} className="border px-3 py-1 rounded flex-1">Resumen</button>
          <button onClick={() => setTipo("preguntas")} className="border px-3 py-1 rounded flex-1">Preguntas</button>
          <button onClick={() => setTipo("leccion")} className="border px-3 py-1 rounded flex-1">Lección</button>
        </div>

        <div className="h-75 w-full overflow-y-auto border mb-2 bg-white p-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">Comentarios guardados</span>
            <button className="border rounded px-2 py-1 text-xs bg-blue-500 text-white" onClick={() => setShowModal(true)}>
              Ver todos
            </button>
          </div>

          {syncError && (
            <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2 mb-2">
              {syncError}
            </div>
          )}

          {cargandoComentarios && (
            <div className="text-gray-500 text-sm">Cargando comentarios...</div>
          )}

          {!cargandoComentarios && Object.keys(comentariosPorFecha).length === 0 && (
            <div className="text-gray-500">No hay comentarios guardados.</div>
          )}

          {Object.entries(comentariosPorFecha)
            .filter(([fecha]) => !selectedDate || fecha === selectedDate)
            .map(([fecha, texto]) => (
              <div key={fecha} className="mb-4 border-b pb-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{formatDateDMY(fecha)}</div>
                  <div className="text-base text-gray-800 whitespace-pre-line">{texto}</div>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <button
                    className="text-xs px-2 py-1 border rounded bg-yellow-200 hover:bg-yellow-300"
                    onClick={() => { setEditFecha(fecha); setEditTexto(texto) }}
                    disabled={guardando}
                  >
                    Editar
                  </button>
                  <button
                    className="text-xs px-2 py-1 border rounded bg-red-200 hover:bg-red-300"
                    onClick={() => handleEliminar(fecha)}
                    disabled={guardando}
                  >
                    Eliminar
                  </button>
                </div>
                {editFecha === fecha && (
                  <div className="mt-2">
                    <textarea
                      value={editTexto}
                      onChange={(e) => setEditTexto(e.target.value)}
                      className="w-full h-20 p-2 border rounded resize-none mb-2"
                    />
                    <button
                      className="border rounded p-2 bg-blue-600 text-white mr-2 disabled:opacity-50"
                      disabled={guardando}
                      onClick={async () => {
                        await handleGuardar(fecha, editTexto)
                        setEditFecha(null)
                      }}
                    >
                      Guardar
                    </button>
                    <button className="border rounded p-2 bg-gray-300 text-black" onClick={() => setEditFecha(null)}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-100 max-h-[80vh] overflow-y-auto relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setShowModal(false)}>
                ×
              </button>
              <div className="font-bold mb-4">Todos los comentarios</div>
              {Object.keys(comentariosPorFecha).length === 0 && (
                <div className="text-gray-500">No hay comentarios guardados.</div>
              )}
              {Object.entries(comentariosPorFecha)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, texto]) => (
                  <div key={fecha} className="mb-4 border-b pb-2">
                    <div className="text-xs text-gray-500 mb-1">{formatDateDMY(fecha)}</div>
                    <div className="text-base text-gray-800 whitespace-pre-line">{texto}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="h-50 overflow-y-auto border mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          <Biblia agregarVersiculo={agregarVersiculo} />
        </div>

        <div className="w-full mt-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setShowInput(true)
              const existente = comentariosPorFecha[e.target.value]
              setComentario(existente ?? "")
            }}
            className="border rounded p-2 w-full mb-2"
          />
          {showInput && selectedDate && (
            <div className="flex flex-col gap-2">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={`Comentario para ${selectedDate}`}
                className="w-full h-25 p-2 border rounded resize-none"
              />
              <button
                className="border rounded p-2 bg-blue-600 text-white disabled:opacity-50"
                disabled={guardando || !comentario.trim()}
                onClick={async () => {
                  await handleGuardar(selectedDate, comentario)
                  alert("Comentario guardado")
                }}
              >
                {guardando ? "Guardando..." : "Guardar comentario"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
