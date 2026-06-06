"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getFechaDestacadaEnSemana, getFechasSemana } from "@/lib/semana"
import LeccionContenidoFormateado from "@/components/LeccionContenidoFormateado"
import LeccionBarraEdicion from "@/components/LeccionBarraEdicion"
import LeccionInkCapa from "@/components/LeccionInkCapa"
import { esHerramientaTinta, type HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  cargarSemanaCompleta,
  diaTieneContenido,
  type DiaLeccionCompleto,
} from "@/lib/leccionAuxiliar"

type Props = {
  semana: number
  fechaInicial?: string
  onFechaChange?: (fecha: string) => void
}

export default function LeccionTextoViewer({
  semana,
  fechaInicial,
  onFechaChange,
}: Props) {
  const [dias, setDias] = useState<DiaLeccionCompleto[]>([])
  const [fechaActiva, setFechaActiva] = useState(
    () => fechaInicial ?? getFechaDestacadaEnSemana(semana)
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [herramienta, setHerramienta] = useState<HerramientaLeccion>("cursor")
  const contenidoRef = useRef<HTMLDivElement>(null)
  const lienzoRef = useRef<HTMLDivElement>(null)

  const modoTinta =
    herramienta === "subrayar" || herramienta === "borrador" ? herramienta : null

  const fechasSemana = getFechasSemana(semana)

  useEffect(() => {
    setFechaActiva(fechaInicial ?? getFechaDestacadaEnSemana(semana))
  }, [semana, fechaInicial])

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)

    void cargarSemanaCompleta(semana)
      .then((bloques) => {
        if (cancelado) return
        setDias(bloques)
        setCargando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setError(e instanceof Error ? e.message : "No se pudo cargar la semana")
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [semana])

  const seleccionarDia = useCallback(
    (fecha: string) => {
      setFechaActiva(fecha)
      onFechaChange?.(fecha)
      contenidoRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    },
    [onFechaChange]
  )

  const diaActivo = dias.find((d) => d.fecha === fechaActiva) ?? dias[0]

  const parrafosDia =
    diaActivo?.parrafos?.length
      ? diaActivo.parrafos
      : diaActivo?.contenido
        ? diaActivo.contenido.split(/\n{2,}/).filter(Boolean)
        : []

  if (cargando) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Preparando lección…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-red-700">
        <p className="font-semibold">No se pudo cargar la lección</p>
        <p className="text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="leccion-viewer flex h-full min-h-0 bg-[#faf8f3]">
      <aside className="leccion-dias-sidebar shrink-0 border-r border-border bg-white/95">
        <p className="leccion-dias-sidebar-titulo">Semana {semana}</p>
        <nav className="leccion-dias-nav custom-scroll" aria-label="Días de la semana">
          {fechasSemana.map((d) => {
            const activo = d.fecha === fechaActiva
            const bloque = dias.find((b) => b.fecha === d.fecha)
            const tieneTexto = bloque ? diaTieneContenido(bloque) : false
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={() => seleccionarDia(d.fecha)}
                aria-current={activo ? "true" : undefined}
                className={`leccion-dia-btn${activo ? " leccion-dia-btn-activo" : ""}${!tieneTexto ? " leccion-dia-btn-vacio" : ""}`}
              >
                <span className="leccion-dia-btn-corto">{d.diaCorto}</span>
                <span className="leccion-dia-btn-num">{d.diaNum}</span>
              </button>
            )
          })}
        </nav>

        <LeccionBarraEdicion herramienta={herramienta} onHerramienta={setHerramienta} />
      </aside>

      <div
        ref={contenidoRef}
        className="leccion-viewer-scroll custom-scroll min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        {diaActivo && diaTieneContenido(diaActivo) ? (
          <div
            ref={lienzoRef}
            className={`leccion-lienzo${esHerramientaTinta(herramienta) ? " leccion-lienzo-tinta" : ""}`}
          >
            <LeccionContenidoFormateado
              key={`${semana}-${fechaActiva}`}
              semana={semana}
              fecha={fechaActiva}
              tituloDia={diaActivo.titulo || diaActivo.etiqueta}
              parrafos={parrafosDia}
              resumen={diaActivo.resumen}
              preguntas={diaActivo.preguntas}
              herramienta={herramienta}
            />
            <LeccionInkCapa
              semana={semana}
              fecha={fechaActiva}
              modo={modoTinta}
              anclaRef={lienzoRef}
            />
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted">
            No hay contenido para este día en la semana {semana}.
          </p>
        )}
      </div>
    </div>
  )
}
