"use client"

import { useState, useEffect } from "react"

interface BibliaProps {
  agregarVersiculo?: (v: string) => void
}

type BibliaData = Record<string, Record<string, Record<string, string>>>

const selectClass =
  "w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-700 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition md:py-2 md:text-sm"

export default function Biblia({ agregarVersiculo }: BibliaProps) {
  const [biblia, setBiblia] = useState<BibliaData>({})
  const [libro, setLibro] = useState("")
  const [capitulo, setCapitulo] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/biblia/rvr1909.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar la Biblia`)
        return r.json()
      })
      .then((data) => {
        const estructura: BibliaData = {}
        data.verses.forEach((v: { book_name: string; chapter: number; verse: number; text: string }) => {
          const nombreLibro = v.book_name
          const cap = String(v.chapter)
          const vers = String(v.verse)
          if (!estructura[nombreLibro]) estructura[nombreLibro] = {}
          if (!estructura[nombreLibro][cap]) estructura[nombreLibro][cap] = {}
          estructura[nombreLibro][cap][vers] = v.text
        })
        setBiblia(estructura)
        setCargando(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar la Biblia")
        setCargando(false)
      })
  }, [])

  const libros = Object.keys(biblia)
  const capitulos = libro ? Object.keys(biblia[libro]) : []

  if (cargando) {
    return (
      <div className="flex items-center gap-2 p-3 text-muted text-sm">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Cargando Biblia...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm">✝</span>
        <h2 className="font-display text-base font-semibold text-primary">Santa Biblia</h2>
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
        {libros.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {libro && (
        <select value={capitulo} className={selectClass} onChange={(e) => setCapitulo(e.target.value)}>
          <option value="">Capítulo</option>
          {capitulos.map((c) => (
            <option key={c} value={c}>
              Capítulo {c}
            </option>
          ))}
        </select>
      )}

      {libro && capitulo && (
        <div className="space-y-1 pt-1">
          {Object.keys(biblia[libro][capitulo]).map((v) => (
            <p
              key={v}
              className="cursor-pointer rounded-lg px-2 py-3 text-base leading-relaxed text-slate-700 transition active:bg-accent-soft active:text-primary md:py-1.5 md:text-sm"
              onClick={() =>
                agregarVersiculo?.(`${libro} ${capitulo}:${v} - ${biblia[libro][capitulo][v]}`)
              }
            >
              <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-xs font-semibold text-primary">
                {v}
              </span>
              {biblia[libro][capitulo][v]}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
