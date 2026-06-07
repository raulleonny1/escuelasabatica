"use client"

import { useEffect, useMemo, useState } from "react"
import { cargarSemanaConOffline } from "@/lib/leccionOffline"
import {
  construirResumenSemanalTematico,
  type ResumenSemanalTematico,
} from "@/lib/resumenSemanalTematico"
import { hayConexion } from "@/lib/syncCola"

type Props = {
  semana: number
}

export default function ResumenSemanalViewer({ semana }: Props) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenSemanalTematico | null>(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)

    void cargarSemanaConOffline(semana)
      .then((dias) => {
        if (cancelado) return
        setResumen(construirResumenSemanalTematico(semana, dias))
        setCargando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setError(e instanceof Error ? e.message : "No se pudo cargar el resumen")
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [semana])

  const vacio = useMemo(
    () => resumen !== null && resumen.objetivos.length === 0,
    [resumen]
  )

  if (cargando) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Preparando resumen semanal…
      </div>
    )
  }

  if (error || !resumen) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center text-sm">
        <p className="font-semibold text-red-700">No se pudo cargar el resumen</p>
        <p className="max-w-sm text-slate-600">{error}</p>
        {!hayConexion() && (
          <p className="max-w-xs text-xs text-slate-500">
            Descarga la semana con internet para leer el resumen sin Wi‑Fi.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="resumen-semanal-viewer flex h-full min-h-0 bg-[#faf8f3]">
      <div className="resumen-semanal-scroll custom-scroll min-h-0 flex-1 overflow-y-auto">
        <article className="resumen-semanal-articulo mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
          <p className="resumen-semanal-etiqueta">Semana {semana} · Objetivos de la semana</p>
          <h1 className="resumen-semanal-titulo">{resumen.tituloLeccion}</h1>
          <p className="resumen-semanal-intro">{resumen.introPedagogica}</p>

          {vacio ? (
            <p className="resumen-semanal-vacio">
              Abre la lección de esta semana con internet al menos una vez para descargar el PDF de
              resumen auxiliar.
            </p>
          ) : (
            <div className="resumen-semanal-tramos">
              {resumen.objetivos.map((obj) => (
                <section key={obj.numero} className="resumen-semanal-tramo">
                  <div className="resumen-semanal-tramo-cabecera">
                    <span className="resumen-semanal-tramo-num" aria-hidden>
                      {obj.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="resumen-semanal-tramo-sub">{obj.verbo}</p>
                      <h2 className="resumen-semanal-tramo-titulo">{obj.titulo}</h2>
                    </div>
                  </div>

                  {obj.indicadores.length > 0 && (
                    <ul className="resumen-semanal-indicadores">
                      {obj.indicadores.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  )}

                  {obj.parrafos.map((p, i) => (
                    <p key={i} className="resumen-semanal-parrafo">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          )}

          {!vacio && (
            <footer className="resumen-semanal-cierre">
              <p className="resumen-semanal-cierre-etiq">Para llevar</p>
              <p className="resumen-semanal-cierre-texto">{resumen.cierre}</p>
            </footer>
          )}
        </article>
      </div>
    </div>
  )
}
