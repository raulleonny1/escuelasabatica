"use client"

import { useEffect, useState } from "react"
import { esMaestro, leerSesion } from "@/lib/sesionUsuario"
import {
  agruparPorCategoria,
  cargarMaterialesMaestro,
  urlMaterial,
  type MaterialMaestro,
} from "@/lib/materialesMaestro"

interface MaterialesMaestroProps {
  onVerEnPantalla?: (url: string, titulo: string) => void
}

export default function MaterialesMaestro({ onVerEnPantalla }: MaterialesMaestroProps) {
  const [abierto, setAbierto] = useState(true)
  const [items, setItems] = useState<MaterialMaestro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!esMaestro()) return
    let activo = true
    setCargando(true)
    cargarMaterialesMaestro()
      .then((lista) => {
        if (!activo) return
        setItems(lista)
        setError(lista.length === 0 ? "No hay materiales en el catálogo." : null)
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar el catálogo de materiales.")
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  if (!esMaestro()) return null

  const sesion = leerSesion()
  const grupos = agruparPorCategoria(items)
  const categorias = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es"))

  return (
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-accent-soft/30 shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-primary/15 bg-primary/10 px-3 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="text-base" aria-hidden>
              📁
            </span>
            Materiales auxiliares
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Solo visible para maestros · no alumnos</p>
        </div>
        <span className="shrink-0 text-primary text-lg" aria-hidden>
          {abierto ? "▾" : "▸"}
        </span>
      </button>

      {abierto && (
        <div className="px-3 py-3">
          {sesion && (
            <p className="mb-2 text-xs text-slate-600">
              Hola, <span className="font-medium text-primary">{sesion.nombre}</span> — recursos
              para preparar y dirigir tu clase.
            </p>
          )}

          {cargando && (
            <p className="flex items-center gap-2 py-4 text-sm text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Cargando materiales…
            </p>
          )}

          {error && !cargando && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p>
          )}

          {!cargando && categorias.length > 0 && (
            <div className="space-y-4">
              {categorias.map((cat) => (
                <div key={cat}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {cat}
                  </p>
                  <ul className="space-y-2">
                    {grupos[cat].map((item) => {
                      const href = urlMaterial(item)
                      const esPdf = href?.toLowerCase().endsWith(".pdf")
                      return (
                        <li
                          key={item.id}
                          className="rounded-lg border border-border bg-white/90 p-2.5 shadow-sm"
                        >
                          <p className="text-sm font-medium text-slate-800">{item.titulo}</p>
                          {item.descripcion && (
                            <p className="mt-0.5 text-xs leading-snug text-slate-500">
                              {item.descripcion}
                            </p>
                          )}
                          {href ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {esPdf && onVerEnPantalla && (
                                <button
                                  type="button"
                                  onClick={() => onVerEnPantalla(href, item.titulo)}
                                  className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white active:opacity-90"
                                >
                                  Ver en pantalla
                                </button>
                              )}
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-slate-700 active:bg-white"
                              >
                                {esPdf ? "Abrir PDF" : "Abrir enlace"}
                              </a>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-[11px] text-amber-700">
                              Archivo pendiente — revisa manifest.json y la carpeta
                              materiales-maestro.
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 border-t border-border/80 pt-2 text-[10px] leading-relaxed text-slate-400">
            Para añadir PDFs: carpeta{" "}
            <code className="rounded bg-surface px-1">public/materiales-maestro/</code> y edita{" "}
            <code className="rounded bg-surface px-1">manifest.json</code>.
          </p>
        </div>
      )}
    </section>
  )
}
