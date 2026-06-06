"use client"

import { useCallback, useState } from "react"
import { formatearParrafosDia, type BloqueLeccion } from "@/lib/leccionFormato"
import {
  referenciaEtiqueta,
  segmentarConPasajes,
  type ReferenciaBiblica,
  type SegmentoTexto,
} from "@/lib/pasajeBiblico"
import PasajeFlorido from "@/components/PasajeFlorido"
import type { PreguntaRespondida } from "@/lib/leccionAuxiliar"

type Props = {
  tituloDia?: string
  parrafos: string[]
  resumen?: string
  preguntas?: PreguntaRespondida[]
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

export default function LeccionContenidoFormateado({
  tituloDia,
  parrafos,
  resumen = "",
  preguntas = [],
}: Props) {
  const bloques = formatearParrafosDia(parrafos)
  const [pasajeActivo, setPasajeActivo] = useState<ReferenciaBiblica | null>(null)
  const abrirPasaje = useCallback((ref: ReferenciaBiblica) => setPasajeActivo(ref), [])

  const resumenLimpio = resumen.trim()
  const segmentosResumen = resumenLimpio ? segmentarConPasajes(resumenLimpio) : []

  if (bloques.length === 0 && !resumenLimpio && preguntas.length === 0) {
    return <p className="text-center text-sm text-muted">Sin contenido para este día.</p>
  }

  return (
    <>
      <article className="leccion-pagina">
        {tituloDia && <p className="leccion-dia-encabezado">{tituloDia}</p>}

        {bloques.length > 0 && (
          <div className="leccion-formato">
            {bloques.map((bloque, i) => (
              <Bloque key={i} bloque={bloque} onPasaje={abrirPasaje} />
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
              <SegmentosInline segmentos={segmentosResumen} onPasaje={abrirPasaje} />
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
                      <SegmentosInline segmentos={segmentosP} onPasaje={abrirPasaje} />
                    </p>
                    {p.respuesta && (
                      <p className="leccion-qa-respuesta">
                        <span className="leccion-qa-respuesta-etq">Respuesta: </span>
                        <SegmentosInline segmentos={segmentosR} onPasaje={abrirPasaje} />
                      </p>
                    )}
                    {p.pasajes && (
                      <p className="leccion-qa-pasajes">
                        <span className="leccion-qa-pasajes-etq">Pasajes bíblicos:</span> {p.pasajes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </article>
      <PasajeFlorido pasaje={pasajeActivo} onCerrar={() => setPasajeActivo(null)} />
    </>
  )
}
