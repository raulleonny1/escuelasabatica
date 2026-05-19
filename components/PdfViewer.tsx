"use client"

import { useEffect, useState } from "react"
import { Viewer, Worker, SpecialZoomLevel, ScrollMode } from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"

interface PdfViewerProps {
  url: string
}

function PdfDocument({ url, touchMode }: { url: string; touchMode: boolean }) {
  const scrollModePluginInstance = scrollModePlugin()
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
  })

  return (
    <Viewer
      fileUrl={url}
      plugins={[defaultLayoutPluginInstance, scrollModePluginInstance]}
      defaultScale={touchMode ? SpecialZoomLevel.PageWidth : SpecialZoomLevel.PageFit}
      onDocumentLoad={() => {
        scrollModePluginInstance.switchScrollMode(
          touchMode ? ScrollMode.Vertical : ScrollMode.Page
        )
      }}
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

export default function PdfViewer({ url }: PdfViewerProps) {
  const [touchMode, setTouchMode] = useState(false)

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches
      const narrow = window.matchMedia("(max-width: 1023px)").matches
      setTouchMode(coarse || narrow)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return (
    <div className="pdf-viewer-shell h-full w-full min-h-[200px] lg:min-h-[480px]">
      <Worker workerUrl="/pdf.worker.min.js">
        <PdfDocument key={url} url={url} touchMode={touchMode} />
      </Worker>
    </div>
  )
}
