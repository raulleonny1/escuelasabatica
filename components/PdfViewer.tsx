"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Viewer,
  Worker,
  SpecialZoomLevel,
  ScrollMode,
  type DocumentLoadEvent,
} from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation"
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode"
import { findPageIndexForDay, getFechaLecturaParaSemana } from "@/lib/leccionPdf"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"

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

function PdfDocument({
  url,
  touchMode,
  irAlDiaLectura,
  semana,
}: {
  url: string
  touchMode: boolean
  irAlDiaLectura?: boolean
  semana?: number
}) {
  const scrollModePluginInstance = useMemo(() => scrollModePlugin(), [])
  const pageNavigationPluginInstance = useMemo(() => pageNavigationPlugin(), [])
  const defaultLayoutPluginInstance = useMemo(
    () =>
      defaultLayoutPlugin({
        sidebarTabs: () => [],
      }),
    []
  )

  const onDocumentLoad = useCallback(
    async (e: DocumentLoadEvent) => {
      scrollModePluginInstance.switchScrollMode(
        touchMode ? ScrollMode.Vertical : ScrollMode.Page
      )

      if (irAlDiaLectura && semana) {
        try {
          const fecha = getFechaLecturaParaSemana(semana)
          const pageIndex = await findPageIndexForDay(e.doc, fecha)
          requestAnimationFrame(() => {
            pageNavigationPluginInstance.jumpToPage(pageIndex)
          })
        } catch {
          // Si falla la búsqueda, queda en la página 1
        }
      }
    },
    [touchMode, irAlDiaLectura, semana, scrollModePluginInstance, pageNavigationPluginInstance]
  )

  return (
    <Viewer
      fileUrl={url}
      plugins={[defaultLayoutPluginInstance, scrollModePluginInstance, pageNavigationPluginInstance]}
      defaultScale={touchMode ? SpecialZoomLevel.PageWidth : SpecialZoomLevel.PageFit}
      onDocumentLoad={onDocumentLoad}
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
  )
}

export default function PdfViewer({ url, irAlDiaLectura, semana }: PdfViewerProps) {
  const [touchMode] = useState(detectarModoTactil)
  const [viewerListo, setViewerListo] = useState(false)

  useEffect(() => {
    setViewerListo(true)
  }, [])

  const documentKey = `${url}-${touchMode ? "touch" : "desktop"}`

  if (!viewerListo) {
    return (
      <div className="pdf-viewer-shell flex h-full min-h-[200px] items-center justify-center lg:min-h-[480px]">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pdf-viewer-shell h-full w-full min-h-[200px] lg:min-h-[480px]">
      <Worker workerUrl="/pdf.worker.min.js">
        <PdfDocument
          key={documentKey}
          url={url}
          touchMode={touchMode}
          irAlDiaLectura={irAlDiaLectura}
          semana={semana}
        />
      </Worker>
    </div>
  )
}
