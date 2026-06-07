"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatearParrafosDia, type BloqueLeccion } from "@/lib/leccionFormato"
import {
  aplicarHerramientaEnRango,
  esHerramientaResalte,
  esHerramientaTinta,
  guardarHtmlAnotado,
  leerHtmlAnotado,
  restaurarRango,
  rangoDentroDe,
  type HerramientaLeccion,
} from "@/lib/leccionAnotaciones"
import {
  referenciaEtiqueta,
  segmentarConPasajes,
  type ReferenciaBiblica,
  type SegmentoTexto,
} from "@/lib/pasajeBiblico"
import PasajeFlorido from "@/components/PasajeFlorido"
import type { PreguntaRespondida } from "@/lib/leccionAuxiliar"

type Props = {
  semana: number
  fecha: string
  tituloDia?: string
  parrafos: string[]
  resumen?: string
  preguntas?: PreguntaRespondida[]
  herramienta: HerramientaLeccion
}

function SegmentosInline({
  segmentos,
  onPasaje,
}: {
  segmentos: SegmentoTexto[]
  onPasaje: (ref: ReferenciaBiblica) => void
}) {
  return (
    <>
      {segmentos.map((seg, i) =>
        seg.tipo === "texto" ? (
          <span key={i}>{seg.valor}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onPasaje(seg.ref)}
            className="pasaje-enlace"
            title={`Leer ${referenciaEtiqueta(seg.ref)}`}
          >
            {seg.ref.textoOriginal}
          </button>
        )
      )}
    </>
  )
}

function Bloque({
  bloque,
  onPasaje,
}: {
  bloque: BloqueLeccion
  onPasaje: (ref: ReferenciaBiblica) => void
}) {
  switch (bloque.tipo) {
    case "tituloLeccion":
      return <h2 className="leccion-titulo-leccion">{bloque.texto}</h2>
    case "titulo":
      return (
        <h3 className="leccion-titulo-seccion">
          <span className="leccion-titulo-linea" aria-hidden />
          {bloque.texto}
        </h3>
      )
    case "subtitulo":
      return <h4 className="leccion-subtitulo">{bloque.texto}</h4>
    case "versiculoMemoria":
      return (
        <aside className="leccion-versiculo-memoria" aria-label="Versículo de memoria">
          <span className="leccion-versiculo-memoria-ornamento" aria-hidden>
            ✦
          </span>
          <p className="leccion-versiculo-memoria-texto">
            <SegmentosInline segmentos={bloque.segmentos} onPasaje={onPasaje} />
          </p>
        </aside>
      )
    case "cita":
      return (
        <blockquote className="leccion-cita">
          <SegmentosInline segmentos={bloque.segmentos} onPasaje={onPasaje} />
        </blockquote>
      )
    case "parrafo":
      return (
        <p
          className={`leccion-parrafo${bloque.inicial ? " leccion-parrafo-inicial" : ""}`}
        >
          <SegmentosInline segmentos={bloque.segmentos} onPasaje={onPasaje} />
        </p>
      )
  }
}

const LeccionCuerpoDia = memo(function LeccionCuerpoDia({
  bloques,
  resumenLimpio,
  segmentosResumen,
  preguntas,
  onPasaje,
}: {
  bloques: BloqueLeccion[]
  resumenLimpio: string
  segmentosResumen: SegmentoTexto[]
  preguntas: PreguntaRespondida[]
  onPasaje: (ref: ReferenciaBiblica) => void
}) {
  return (
    <>
      {bloques.length > 0 && (
        <div className="leccion-formato">
          {bloques.map((bloque, i) => (
            <Bloque key={i} bloque={bloque} onPasaje={onPasaje} />
          ))}
        </div>
      )}

      {resumenLimpio && (
        <section className="leccion-bloque-dia" aria-label="Resumen del día">
          <h3 className="leccion-titulo-seccion">
            <span className="leccion-titulo-linea" aria-hidden />
            Resumen del día
          </h3>
          <p className="leccion-parrafo leccion-parrafo-inicial leccion-resumen-dia">
            <SegmentosInline segmentos={segmentosResumen} onPasaje={onPasaje} />
          </p>
        </section>
      )}

      {preguntas.length > 0 && (
        <section className="leccion-bloque-dia" aria-label="Preguntas con respuestas">
          <h3 className="leccion-titulo-seccion">
            <span className="leccion-titulo-linea" aria-hidden />
            Preguntas con respuestas
          </h3>
          <div className="leccion-preguntas-respondidas">
            {preguntas.map((p, i) => {
              const segmentosP = segmentarConPasajes(p.pregunta)
              const segmentosR = p.respuesta ? segmentarConPasajes(p.respuesta) : []
              return (
                <div key={i} className="leccion-qa">
                  <p className="leccion-qa-pregunta">
                    {p.numero && <span className="leccion-qa-num">{p.numero}. </span>}
                    <SegmentosInline segmentos={segmentosP} onPasaje={onPasaje} />
                  </p>
                  {p.respuesta && (
                    <p className="leccion-qa-respuesta">
                      <span className="leccion-qa-respuesta-etq">Respuesta: </span>
                      <SegmentosInline segmentos={segmentosR} onPasaje={onPasaje} />
                    </p>
                  )}
                  {p.pasajes && (
                    <p className="leccion-qa-pasajes">
                      <span className="leccion-qa-pasajes-etq">Pasajes bíblicos:</span>{" "}
                      {p.pasajes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
})

export default function LeccionContenidoFormateado({
  semana,
  fecha,
  tituloDia,
  parrafos,
  resumen = "",
  preguntas = [],
  herramienta,
}: Props) {
  const bloques = useMemo(() => formatearParrafosDia(parrafos), [parrafos])
  const resumenLimpio = resumen.trim()
  const segmentosResumen = useMemo(
    () => (resumenLimpio ? segmentarConPasajes(resumenLimpio) : []),
    [resumenLimpio]
  )

  const [pasajeActivo, setPasajeActivo] = useState<ReferenciaBiblica | null>(null)
  const [htmlAnotado, setHtmlAnotado] = useState<string | null>(null)

  const anotableRef = useRef<HTMLDivElement>(null)
  const herramientaRef = useRef(herramienta)
  const rangoGuardado = useRef<Range | null>(null)

  herramientaRef.current = herramienta

  useEffect(() => {
    setHtmlAnotado(leerHtmlAnotado(semana, fecha))
    rangoGuardado.current = null
  }, [semana, fecha])

  const persistirHtml = useCallback(() => {
    const el = anotableRef.current
    if (!el) return
    const html = el.innerHTML
    guardarHtmlAnotado(semana, fecha, html)
    setHtmlAnotado(html)
  }, [semana, fecha])

  const abrirPasaje = useCallback((ref: ReferenciaBiblica) => {
    if (herramientaRef.current !== "cursor") return
    setPasajeActivo(ref)
  }, [])

  const intentarAplicarResalte = useCallback(() => {
    const h = herramientaRef.current
    if (!esHerramientaResalte(h)) return

    const root = anotableRef.current
    if (!root) return

    const aplicar = (range: Range) => {
      if (!rangoDentroDe(root, range)) return false
      const copia = range.cloneRange()
      restaurarRango(copia)
      const ok = aplicarHerramientaEnRango(h, copia, root)
      window.getSelection()?.removeAllRanges()
      rangoGuardado.current = null
      if (ok) persistirHtml()
      return ok
    }

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          aplicar(sel.getRangeAt(0))
          return
        }
        if (rangoGuardado.current) {
          aplicar(rangoGuardado.current)
        }
      }, 60)
    })
  }, [persistirHtml])

  useEffect(() => {
    const root = anotableRef.current
    if (!root) return

    const onSelectionChange = () => {
      if (!esHerramientaResalte(herramientaRef.current)) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      if (rangoDentroDe(root, range)) {
        rangoGuardado.current = range.cloneRange()
      }
    }

    document.addEventListener("selectionchange", onSelectionChange)
    return () => document.removeEventListener("selectionchange", onSelectionChange)
  }, [semana, fecha])

  const alSoltarSeleccion = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!esHerramientaResalte(herramientaRef.current)) return
      if ("changedTouches" in e && e.changedTouches.length > 1) return
      intentarAplicarResalte()
    },
    [intentarAplicarResalte]
  )

  if (bloques.length === 0 && !resumenLimpio && preguntas.length === 0) {
    return <p className="text-center text-sm text-muted">Sin contenido para este día.</p>
  }

  const claseAnotable = esHerramientaResalte(herramienta)
    ? " leccion-anotable-marcando"
    : esHerramientaTinta(herramienta)
      ? " leccion-anotable-tinta"
      : ""

  return (
    <>
      <article className="leccion-pagina">
        {tituloDia && <p className="leccion-dia-encabezado">{tituloDia}</p>}

        <div
          ref={anotableRef}
          className={`leccion-anotable${claseAnotable}`}
          onMouseUp={alSoltarSeleccion}
          onTouchEnd={alSoltarSeleccion}
        >
          {htmlAnotado !== null ? (
            <div
              className="leccion-anotable-html"
              dangerouslySetInnerHTML={{ __html: htmlAnotado }}
            />
          ) : (
            <LeccionCuerpoDia
              bloques={bloques}
              resumenLimpio={resumenLimpio}
              segmentosResumen={segmentosResumen}
              preguntas={preguntas}
              onPasaje={abrirPasaje}
            />
          )}
        </div>
      </article>
      <PasajeFlorido pasaje={pasajeActivo} onCerrar={() => setPasajeActivo(null)} />
    </>
  )
}
