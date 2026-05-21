"use client"

import { useState } from "react"
import {
  asegurarSalaIndependiente,
  formatoCodigoLegible,
  generarCodigoClase,
  normalizarCodigoClase,
  registrarClase,
  unirseAClase,
} from "@/lib/clase"

type Modo = "elegir" | "crear" | "unir"

interface ClaseModalProps {
  onConfirm: (claseId: string, nombreVisible: string) => void
  onCerrar?: () => void
  /** Si true, se puede cerrar y seguir en modo solitario */
  opcional?: boolean
}

export default function ClaseModal({ onConfirm, onCerrar, opcional = false }: ClaseModalProps) {
  const [modo, setModo] = useState<Modo>("elegir")
  const [nombreClase, setNombreClase] = useState("")
  const [codigo, setCodigo] = useState(() => generarCodigoClase())
  const [codigoUnir, setCodigoUnir] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nombreClase.trim()
    if (nombre.length < 2) {
      setError("Nombre de la clase: al menos 2 caracteres.")
      return
    }
    const id = normalizarCodigoClase(codigo)
    if (id.length < 3) {
      setError("El código debe tener al menos 3 caracteres.")
      return
    }
    setCargando(true)
    setError("")
    try {
      await registrarClase(id, nombre)
      onConfirm(id, nombre)
    } catch {
      setError("No se pudo crear la clase. Revisa la conexión.")
    } finally {
      setCargando(false)
    }
  }

  async function handleEstudiarSolo() {
    setCargando(true)
    setError("")
    try {
      await asegurarSalaIndependiente()
      onConfirm("independiente", "Estudio personal")
    } catch {
      setError("Sin conexión. Puedes seguir; el chat se sincronizará después.")
      onConfirm("independiente", "Estudio personal")
    } finally {
      setCargando(false)
    }
  }

  async function handleUnir(e: React.FormEvent) {
    e.preventDefault()
    const raw = codigoUnir.trim()
    if (raw.length < 3) {
      setError("Escribe el código que te compartió tu clase.")
      return
    }
    setCargando(true)
    setError("")
    try {
      const { id, nombre } = await unirseAClase(raw)
      onConfirm(id, nombre)
    } catch {
      setError("No se pudo unir a la clase. Revisa el código.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clase-modal-titulo"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        {opcional && onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
        <h2 id="clase-modal-titulo" className="font-display text-lg font-semibold text-primary pr-8">
          {opcional ? "Clase de estudio (opcional)" : "¿Cómo quieres estudiar?"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          En solitario tienes chat y notas. Con código compartes solo con tu grupo.
        </p>

        {modo === "elegir" && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleEstudiarSolo()}
              disabled={cargando}
              className="min-h-12 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white active:opacity-90 disabled:opacity-60"
            >
              {cargando ? "Preparando…" : "Estudiar en solitario"}
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Sin código. Chat y notas en la nube disponibles.
            </p>
            <button
              type="button"
              onClick={() => {
                setModo("crear")
                setError("")
              }}
              className="min-h-12 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary"
            >
              Crear clase con código
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("unir")
                setError("")
              }}
              className="min-h-12 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-slate-700"
            >
              Unirme con un código
            </button>
          </div>
        )}

        {modo === "crear" && (
          <form onSubmit={handleCrear} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="nombre-clase">
                Nombre de la clase
              </label>
              <input
                id="nombre-clase"
                type="text"
                value={nombreClase}
                onChange={(e) => setNombreClase(e.target.value)}
                placeholder="Ej. Clase jóvenes Central"
                maxLength={48}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="codigo-clase">
                Código para compartir
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="codigo-clase"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(normalizarCodigoClase(e.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setCodigo(generarCodigoClase())}
                  className="shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-slate-600"
                >
                  Otro
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Comparte: <strong className="text-primary">{formatoCodigoLegible(codigo)}</strong>
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo("elegir")}
                className="flex-1 min-h-11 rounded-lg border border-border text-sm text-slate-600"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 min-h-11 rounded-lg bg-primary text-sm font-medium text-white disabled:opacity-50"
              >
                {cargando ? "Creando…" : "Crear clase"}
              </button>
            </div>
          </form>
        )}

        {modo === "unir" && (
          <form onSubmit={handleUnir} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="codigo-unir">
                Código de la clase
              </label>
              <input
                id="codigo-unir"
                type="text"
                value={codigoUnir}
                onChange={(e) => setCodigoUnir(e.target.value)}
                placeholder="Ej. luz-paz-42"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 font-mono text-base"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo("elegir")}
                className="flex-1 min-h-11 rounded-lg border border-border text-sm text-slate-600"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 min-h-11 rounded-lg bg-primary text-sm font-medium text-white disabled:opacity-50"
              >
                {cargando ? "Entrando…" : "Unirme"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
