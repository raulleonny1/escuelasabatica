"use client"

import { useEffect, useState } from "react"
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core"
import { findPageIndexForDay, getFechaLecturaParaSemana } from "@/lib/leccionPdf"
import "@react-pdf-viewer/core/lib/styles/index.css"

interface PdfViewerProps {
  url: string
  irAlDiaLectura?: boolean
  semana?: number
}

function detectarModoTactil(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1023px)").matches
  )
}

export default function PdfViewer({ url, irAlDiaLectura, semana }: PdfViewerProps) {
  const [touchMode] = useState(detectarModoTactil)
  const [montado, setMontado] = useState(false)
  const [paginaInicial, setPaginaInicial] = useState(0)
  const [paginaLista, setPaginaLista] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    let cancelado = false
    setPaginaLista(false)
    setPaginaInicial(0)

    if (!irAlDiaLectura || !semana) {
      setPaginaLista(true)
      return
    }

    async function resolverPagina() {
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"
        const doc = await pdfjs.getDocument(url).promise
        const fecha = getFechaLecturaParaSemana(semana!)
        const index = await findPageIndexForDay(doc, fecha)
        if (!cancelado) setPaginaInicial(index)
        await doc.destroy()
      } catch {
        if (!cancelado) setPaginaInicial(0)
      } finally {
        if (!cancelado) setPaginaLista(true)
      }
    }

    resolverPagina()
    return () => {
      cancelado = true
    }
  }, [url, irAlDiaLectura, semana])

  if (!montado || !paginaLista) {
    return (
      <div className="pdf-viewer-shell flex h-full min-h-[200px] items-center justify-center lg:min-h-[480px]">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pdf-viewer-shell h-full w-full min-h-[200px] lg:min-h-[480px]">
      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          key={`${url}-${paginaInicial}`}
          fileUrl={url}
          initialPage={paginaInicial}
          defaultScale={touchMode ? SpecialZoomLevel.PageWidth : SpecialZoomLevel.PageFit}
          renderLoader={(percent) => (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">
              Cargando PDF… {Math.round(percent)}%
            </div>
          )}
          renderError={(loadError) => (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="font-semibold text-red-700">No se pudo abrir el PDF</p>
              <p className="text-sm text-slate-600">
                {loadError.message || "Archivo no encontrado"}
              </p>
              <p className="text-xs text-slate-400 break-all">{url}</p>
            </div>
          )}
        />
      </Worker>
    </div>
  )
}
