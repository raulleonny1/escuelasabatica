"use client"

import { useEffect, useMemo, useState } from "react"
import { formatearParrafosDia } from "@/lib/leccionFormato"
import { type DiaLeccionCompleto } from "@/lib/leccionAuxiliar"
import { cargarSemanaConOffline } from "@/lib/leccionOffline"
import { getFechasSemana } from "@/lib/semana"
import { hayConexion } from "@/lib/syncCola"

type Props = {
  semana: number
}

function tituloLeccion(dias: DiaLeccionCompleto[], semana: number): string {
  for (const dia of dias) {
    for (const b of formatearParrafosDia(dia.parrafos)) {
      if (b.tipo === "tituloLeccion") return b.texto.trim()
    }
  }
  const t = dias[0]?.titulo?.trim()
  if (t && t.length > 5) return t
  return `Semana ${semana}`
}

export default function ResumenSemanalViewer({ semana }: Props) {
  const [dias, setDias] = useState<DiaLeccionCompleto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fechasSemana = useMemo(() => getFechasSemana(semana), [semana])

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)

    void cargarSemanaConOffline(semana)
      .then((bloques) => {
        if (cancelado) return
        setDias(bloques)
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

  const entradas = useMemo(() => {
    return fechasSemana.map((f, i) => {
      const bloque = dias.find((d) => d.fecha === f.fecha) ?? dias[i]
      return {
        fecha: f.fecha,
        etiqueta: `${f.diaCorto} ${f.diaNum} ${f.mesCorto}`,
        resumen: bloque?.resumen?.trim() ?? "",
      }
    })
  }, [dias, fechasSemana])

  const hayResumenes = entradas.some((e) => e.resumen.length > 0)
  const titulo = tituloLeccion(dias, semana)

  if (cargando) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Preparando resumen semanal…
      </div>
    )
  }

  if (error) {
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
          <p className="resumen-semanal-etiqueta">Semana {semana} · Resumen de la lección</p>
          <h1 className="resumen-semanal-titulo">{titulo}</h1>
          <p className="resumen-semanal-intro">
            Resumen oficial de cada día, tomado del material auxiliar de la lección.
          </p>

          {!hayResumenes ? (
            <p className="resumen-semanal-vacio">
              Aún no hay resumen descargado para esta semana. Conéctate a internet y abre la lección
              para cargar el PDF auxiliar de resumen.
            </p>
          ) : (
            <div className="resumen-semanal-tramos">
              {entradas.map((entrada, i) =>
                entrada.resumen ? (
                  <section key={entrada.fecha} className="resumen-semanal-tramo">
                    <div className="resumen-semanal-tramo-cabecera">
                      <span className="resumen-semanal-tramo-num" aria-hidden>
                        {i + 1}
                      </span>
                      <h2 className="resumen-semanal-tramo-titulo">{entrada.etiqueta}</h2>
                    </div>
                    <p className="resumen-semanal-parrafo">{entrada.resumen}</p>
                  </section>
                ) : null
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
