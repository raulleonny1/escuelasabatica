"use client"

import { useState, useEffect } from "react"

interface BibliaProps {
  agregarVersiculo?: (v: string) => void
}

type BibliaData = Record<string, Record<string, Record<string, string>>>

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
    return <div className="p-2 text-gray-500 text-sm">Cargando Biblia...</div>
  }

  if (error) {
    return (
      <div className="p-2 text-red-600 text-sm border border-red-200 rounded bg-red-50">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h2>Biblia</h2>

      <select
        value={libro}
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
        <select
          value={capitulo}
          onChange={(e) => setCapitulo(e.target.value)}
        >
          <option value="">Capítulo</option>
          {capitulos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {libro && capitulo && (
        <div>
          {Object.keys(biblia[libro][capitulo]).map((v) => (
            <p
              key={v}
              className="cursor-pointer hover:bg-yellow-100"
              onClick={() =>
                agregarVersiculo?.(`${libro} ${capitulo}:${v} - ${biblia[libro][capitulo][v]}`)
              }
            >
              <b>{v}</b> {biblia[libro][capitulo][v]}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
