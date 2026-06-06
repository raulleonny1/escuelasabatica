"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatearParrafosDia, type BloqueLeccion } from "@/lib/leccionFormato"
import {
  aplicarHerramienta,
  guardarHtmlAnotado,
  guardarNotaEscrita,
  leerHtmlAnotado,
  leerNotaEscrita,
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
  onEnfocarNota?: () => void
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
  semana,
  fecha,
  tituloDia,
  parrafos,
  resumen = "",
  preguntas = [],
  herramienta,
  onEnfocarNota,
}: Props) {
  const bloques = formatearParrafosDia(parrafos)
  const [pasajeActivo, setPasajeActivo] = useState<ReferenciaBiblica | null>(null)
  const [notaEscrita, setNotaEscrita] = useState("")
  const anotableRef = useRef<HTMLDivElement>(null)
  const notaRef = useRef<HTMLTextAreaElement>(null)
  const htmlRestaurado = useRef(false)

  const abrirPasaje = useCallback((ref: ReferenciaBiblica) => {
    if (herramienta !== "cursor") return
    setPasajeActivo(ref)
  }, [herramienta])

  const resumenLimpio = resumen.trim()
  const segmentosResumen = resumenLimpio ? segmentarConPasajes(resumenLimpio) : []

  const persistirHtml = useCallback(() => {
    const el = anotableRef.current
    if (!el) return
    guardarHtmlAnotado(semana, fecha, el.innerHTML)
  }, [semana, fecha])

  useEffect(() => {
    htmlRestaurado.current = false
    setNotaEscrita(leerNotaEscrita(semana, fecha))
  }, [semana, fecha])

  useEffect(() => {
    const el = anotableRef.current
    if (!el || htmlRestaurado.current) return

    const guardado = leerHtmlAnotado(semana, fecha)
    if (guardado) {
      requestAnimationFrame(() => {
        if (anotableRef.current) {
          anotableRef.current.innerHTML = guardado
          htmlRestaurado.current = true
        }
      })
    } else {
      htmlRestaurado.current = true
    }
  }, [semana, fecha, bloques.length, resumenLimpio, preguntas.length])

  useEffect(() => {
    if (herramienta !== "nota") return
    notaRef.current?.focus()
    onEnfocarNota?.()
  }, [herramienta, onEnfocarNota])

  const alSoltarSeleccion = useCallback(() => {
    if (herramienta === "cursor" || herramienta === "nota") return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const root = anotableRef.current
    if (!root) return
    if (
      !root.contains(sel.anchorNode) ||
      !root.contains(sel.focusNode)
    ) {
      return
    }
    if (aplicarHerramienta(herramienta)) {
      persistirHtml()
    }
  }, [herramienta, persistirHtml])

  const alCambiarNota = (texto: string) => {
    setNotaEscrita(texto)
    guardarNotaEscrita(semana, fecha, texto)
  }

  if (bloques.length === 0 && !resumenLimpio && preguntas.length === 0) {
    return <p className="text-center text-sm text-muted">Sin contenido para este día.</p>
  }

  const claseAnotable =
    herramienta !== "cursor" && herramienta !== "nota"
      ? " leccion-anotable-marcando"
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
        </div>

        <section
          className={`leccion-apunte-escrito${herramienta === "nota" ? " leccion-apunte-escrito-activo" : ""}`}
          aria-label="Mis apuntes del día"
        >
          <h3 className="leccion-titulo-seccion">
            <span className="leccion-titulo-linea" aria-hidden />
            Mis apuntes
          </h3>
          <textarea
            ref={notaRef}
            value={notaEscrita}
            onChange={(e) => alCambiarNota(e.target.value)}
            placeholder="Escribe aquí tus ideas, reflexiones o respuestas…"
            className="leccion-apunte-textarea"
            rows={4}
          />
        </section>
      </article>
      <PasajeFlorido pasaje={pasajeActivo} onCerrar={() => setPasajeActivo(null)} />
    </>
  )
}
