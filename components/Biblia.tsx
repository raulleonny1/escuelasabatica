"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ANTIGUO_TESTAMENTO,
  NUEVO_TESTAMENTO,
  type BibliaData,
  type VersoJson,
  construirBibliaDesdeVersos,
  contarVersiculos,
  ordenarClavesNumericas,
  ordenarLibros,
} from "@/lib/biblia"

const selectClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

const RVR_URL = "/biblia/rvr1909.json"

export default function Biblia() {
  const [biblia, setBiblia] = useState<BibliaData>({})
  const [libro, setLibro] = useState("")
  const [capitulo, setCapitulo] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalVersiculos, setTotalVersiculos] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetch(RVR_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar la Biblia`)
        return r.json()
      })
      .then((data: { verses?: VersoJson[] }) => {
        if (!Array.isArray(data.verses) || data.verses.length === 0) {
          throw new Error("El archivo de la Biblia está vacío o incompleto")
        }
        const estructura = construirBibliaDesdeVersos(data.verses)
        const libros = Object.keys(estructura)
        if (libros.length < 66) {
          console.warn(`Biblia: se encontraron ${libros.length} libros (se esperaban 66)`)
        }
        setBiblia(estructura)
        setTotalVersiculos(contarVersiculos(estructura))
        setCargando(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "No se pudo cargar la Biblia")
        setCargando(false)
      })

    return () => controller.abort()
  }, [])

  const librosDisponibles = useMemo(() => ordenarLibros(Object.keys(biblia)), [biblia])

  const librosAt = useMemo(
    () => ANTIGUO_TESTAMENTO.filter((l) => biblia[l]),
    [biblia]
  )
  const librosNt = useMemo(
    () => NUEVO_TESTAMENTO.filter((l) => biblia[l]),
    [biblia]
  )

  const capitulos = useMemo(
    () => (libro && biblia[libro] ? ordenarClavesNumericas(Object.keys(biblia[libro])) : []),
    [biblia, libro]
  )

  const versiculos = useMemo(() => {
    if (!libro || !capitulo || !biblia[libro]?.[capitulo]) return []
    return ordenarClavesNumericas(Object.keys(biblia[libro][capitulo]))
  }, [biblia, libro, capitulo])

  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p>Cargando Santa Biblia (Reina-Valera 1909)…</p>
        <p className="text-xs text-slate-400">66 libros · primera carga puede tardar unos segundos</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p className="font-medium">No se pudo abrir la Biblia</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs text-red-600/80">
          Comprueba que exista el archivo <code className="rounded bg-red-100 px-1">public/biblia/rvr1909.json</code>
        </p>
      </div>
    )
  }

  if (librosDisponibles.length === 0) {
    return (
      <p className="p-3 text-sm text-muted">No hay libros disponibles en la Biblia.</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm">
            ✝
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-primary">Santa Biblia</h2>
            <p className="text-[11px] text-muted">Reina-Valera 1909 · {totalVersiculos.toLocaleString("es")} versículos</p>
          </div>
        </div>
      </div>

      <select
        value={libro}
        className={selectClass}
        onChange={(e) => {
          setLibro(e.target.value)
          setCapitulo("")
        }}
      >
        <option value="">Seleccione libro</option>
        <optgroup label="Antiguo Testamento">
          {librosAt.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </optgroup>
        <optgroup label="Nuevo Testamento">
          {librosNt.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </optgroup>
      </select>

      {libro && (
        <select value={capitulo} className={selectClass} onChange={(e) => setCapitulo(e.target.value)}>
          <option value="">Seleccione capítulo</option>
          {capitulos.map((c) => (
            <option key={c} value={c}>
              Capítulo {c}
              {biblia[libro][c] ? ` (${Object.keys(biblia[libro][c]).length} vers.)` : ""}
            </option>
          ))}
        </select>
      )}

      {libro && capitulo && versiculos.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          {versiculos.map((v) => (
            <p
              key={v}
              className="px-2 py-3 text-base leading-relaxed text-slate-700 md:py-1.5 md:text-sm"
            >
              <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-xs text-primary">
                {v}
              </span>
              {biblia[libro][capitulo][v]}
            </p>
          ))}
        </div>
      )}

      {libro && capitulo && versiculos.length === 0 && (
        <p className="text-sm text-muted">Este capítulo no tiene versículos cargados.</p>
      )}
    </div>
  )
}
