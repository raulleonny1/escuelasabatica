"use client"

import { useMemo, useState } from "react"
import { Viewer, Worker, SpecialZoomLevel, ScrollMode } from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"

interface PdfViewerProps {
  url: string
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null)

  const plugins = useMemo(() => {
    const scrollModePluginInstance = scrollModePlugin()
    const defaultLayoutPluginInstance = defaultLayoutPlugin()
    return {
      scrollModePluginInstance,
      defaultLayoutPluginInstance,
      all: [defaultLayoutPluginInstance, scrollModePluginInstance],
    }
  }, [url])

  const handleDocumentLoad = () => {
    setError(null)
    plugins.scrollModePluginInstance.switchScrollMode(ScrollMode.Page)
  }

  return (
    <div className="pdf-viewer-wrap relative h-full min-h-[320px] w-full">
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 p-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-5 text-center shadow-lg">
            <p className="font-semibold text-red-700">No se pudo abrir el PDF</p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <p className="mt-2 text-xs text-slate-500 break-all">{url}</p>
          </div>
        </div>
      )}
      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={plugins.all}
          defaultScale={SpecialZoomLevel.PageFit}
          onDocumentLoad={handleDocumentLoad}
          renderError={(loadError) => {
            const msg = loadError.message || "Archivo no encontrado o dañado"
            setError(msg)
            return (
              <div className="flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-slate-600">
                {msg}
              </div>
            )
          }}
        />
      </Worker>
    </div>
  )
}
