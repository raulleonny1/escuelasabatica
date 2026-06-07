"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getFechaDestacadaEnSemana, getFechasSemana } from "@/lib/semana"
import LeccionContenidoFormateado from "@/components/LeccionContenidoFormateado"
import LeccionBarraEdicion from "@/components/LeccionBarraEdicion"
import LeccionInkCapa from "@/components/LeccionInkCapa"
import { esHerramientaTinta, type HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  diaTieneContenido,
  type DiaLeccionCompleto,
} from "@/lib/leccionAuxiliar"
import {
  cargarSemanaConOffline,
  descargarSemanaParaOffline,
  semanaDisponibleOffline,
} from "@/lib/leccionOffline"
import { hayConexion } from "@/lib/syncCola"
import { leerTrazosLeccion } from "@/lib/leccionTintaLocal"

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
  const [offlineLista, setOfflineLista] = useState<boolean | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [herramienta, setHerramienta] = useState<HerramientaLeccion>("cursor")
  const [tieneTinta, setTieneTinta] = useState(false)
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

    void cargarSemanaConOffline(semana)
      .then((bloques) => {
        if (cancelado) return
        setDias(bloques)
        setCargando(false)
        setError(null)
      })
      .catch((e) => {
        if (cancelado) return
        setError(e instanceof Error ? e.message : "No se pudo cargar la semana")
        setCargando(false)
      })

    void semanaDisponibleOffline(semana).then((ok) => {
      if (!cancelado) setOfflineLista(ok)
    })

    return () => {
      cancelado = true
    }
  }, [semana])

  useEffect(() => {
    if (!hayConexion()) return
    void descargarSemanaParaOffline(semana)
      .then(() => setOfflineLista(true))
      .catch(() => {})
  }, [semana])

  useEffect(() => {
    setTieneTinta(leerTrazosLeccion(semana, fechaActiva).length > 0)
  }, [semana, fechaActiva])

  useEffect(() => {
    if (!esHerramientaTinta(herramienta)) return
    window.getSelection()?.removeAllRanges()
  }, [herramienta])

  const seleccionarDia = useCallback(
    (fecha: string) => {
      setFechaActiva(fecha)
      onFechaChange?.(fecha)
      contenidoRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    },
    [onFechaChange]
  )

  const descargarSemana = useCallback(async () => {
    if (!hayConexion()) return
    setDescargando(true)
    setError(null)
    try {
      await descargarSemanaParaOffline(semana)
      const bloques = await cargarSemanaConOffline(semana)
      setDias(bloques)
      setOfflineLista(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar la semana")
    } finally {
      setDescargando(false)
    }
  }, [semana])

  const diaActivo = dias.find((d) => d.fecha === fechaActiva) ?? dias[0]

  const parrafosDia =
    diaActivo?.parrafos?.length
      ? diaActivo.parrafos
      : diaActivo?.contenido
        ? diaActivo.contenido.split(/\n{2,}/).filter(Boolean)
        : []

  const mostrarCapaTinta = modoTinta !== null || tieneTinta

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
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center text-sm">
        <p className="font-semibold text-red-700">No se pudo cargar la lección</p>
        <p className="max-w-sm text-slate-600">{error}</p>
        {!hayConexion() ? (
          <p className="max-w-xs text-xs text-slate-500">
            Conéctate a internet, abre esta semana y pulsa «Descargar semana» para leerla sin Wi‑Fi.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void descargarSemana()}
            disabled={descargando}
            className="leccion-offline-btn"
          >
            {descargando ? "Descargando…" : "Descargar semana ahora"}
          </button>
        )}
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

        <div className="leccion-offline-panel">
          {offlineLista ? (
            <p className="leccion-offline-estado leccion-offline-estado-ok" role="status">
              Disponible sin internet
            </p>
          ) : hayConexion() ? (
            <button
              type="button"
              onClick={() => void descargarSemana()}
              disabled={descargando}
              className="leccion-offline-btn leccion-offline-btn-sidebar"
            >
              {descargando ? "Guardando…" : "Descargar semana"}
            </button>
          ) : (
            <p className="leccion-offline-estado" role="status">
              Sin internet — no descargada
            </p>
          )}
        </div>
      </aside>

      <div
        ref={contenidoRef}
        className="leccion-viewer-scroll custom-scroll min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        {!hayConexion() && offlineLista && (
          <p className="leccion-offline-aviso" role="status">
            Sin internet — leyendo semana guardada en este dispositivo.
          </p>
        )}
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
            {mostrarCapaTinta && (
              <LeccionInkCapa
                semana={semana}
                fecha={fechaActiva}
                modo={modoTinta}
                anclaRef={lienzoRef}
                scrollRef={contenidoRef}
                onTrazosChange={(n) => setTieneTinta(n > 0)}
              />
            )}
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
