"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core"
import { zoomPlugin } from "@react-pdf-viewer/zoom"
import { findPageIndexForDay, getFechaLecturaParaSemana } from "@/lib/leccionPdf"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/zoom/lib/styles/index.css"

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

function distanciaPinch(touches: TouchList) {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function clampEscala(n: number) {
  return Math.min(3.5, Math.max(0.75, n))
}

function SyncEscala({
  onEscala,
  CurrentScale,
}: {
  onEscala: (s: number) => void
  CurrentScale: ReturnType<typeof zoomPlugin>["CurrentScale"]
}) {
  return (
    <CurrentScale>
      {({ scale }) => <SyncEscalaEffect scale={scale} onEscala={onEscala} />}
    </CurrentScale>
  )
}

function SyncEscalaEffect({
  scale,
  onEscala,
}: {
  scale: number
  onEscala: (s: number) => void
}) {
  useEffect(() => {
    onEscala(scale)
  }, [scale, onEscala])
  return null
}

export default function PdfViewer({ url, irAlDiaLectura, semana }: PdfViewerProps) {
  const [touchMode] = useState(detectarModoTactil)
  const [montado, setMontado] = useState(false)
  const [paginaInicial, setPaginaInicial] = useState(0)
  const [paginaLista, setPaginaLista] = useState(false)
  const [escala, setEscala] = useState(1)
  const shellRef = useRef<HTMLDivElement>(null)
  const escalaRef = useRef(1)
  const pinchInicio = useRef({ dist: 0, escala: 1 })

  const zoomPluginInstance = zoomPlugin({ enableShortcuts: true })
  const { zoomTo, CurrentScale, ZoomIn, ZoomOut } = zoomPluginInstance

  const aplicarZoom = useCallback(
    (nueva: number) => {
      const v = clampEscala(nueva)
      escalaRef.current = v
      setEscala(v)
      zoomTo(v)
    },
    [zoomTo]
  )

  const syncEscala = useCallback((s: number) => {
    escalaRef.current = s
    setEscala(s)
  }, [])

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

  useEffect(() => {
    const root = shellRef.current
    if (!root || !montado || !paginaLista) return

    let scrollEl: HTMLElement | null = null
    let poll: ReturnType<typeof setInterval> | undefined

    const enlazarPinch = () => {
      const el = root.querySelector(".rpv-core__inner-pages") as HTMLElement | null
      if (!el || el === scrollEl) return
      scrollEl?.removeEventListener("touchstart", onTouchStart)
      scrollEl?.removeEventListener("touchmove", onTouchMove)
      scrollEl = el
      scrollEl.addEventListener("touchstart", onTouchStart, { passive: true })
      scrollEl.addEventListener("touchmove", onTouchMove, { passive: false })
      if (poll) {
        clearInterval(poll)
        poll = undefined
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchInicio.current = {
          dist: distanciaPinch(e.touches),
          escala: escalaRef.current,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      e.stopPropagation()
      const { dist, escala: base } = pinchInicio.current
      if (dist <= 0) return
      const ratio = distanciaPinch(e.touches) / dist
      aplicarZoom(base * ratio)
    }

    enlazarPinch()
    poll = setInterval(enlazarPinch, 300)

    return () => {
      if (poll) clearInterval(poll)
      scrollEl?.removeEventListener("touchstart", onTouchStart)
      scrollEl?.removeEventListener("touchmove", onTouchMove)
    }
  }, [montado, paginaLista, url, aplicarZoom])

  useEffect(() => {
    const bloquearZoomPagina = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      const target = e.target as Node | null
      if (shellRef.current?.contains(target)) return
      e.preventDefault()
    }
    document.addEventListener("touchmove", bloquearZoomPagina, { passive: false })
    return () => document.removeEventListener("touchmove", bloquearZoomPagina)
  }, [])

  if (!montado || !paginaLista) {
    return (
      <div className="pdf-viewer-shell flex h-full min-h-[200px] items-center justify-center lg:min-h-[480px]">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const pct = Math.round(escala * 100)

  return (
    <div ref={shellRef} className="pdf-viewer-shell relative h-full w-full min-h-[200px] lg:min-h-[480px]">
      <div className="sr-only" aria-hidden>
        <SyncEscala onEscala={syncEscala} CurrentScale={CurrentScale} />
      </div>

      <div className="pdf-zoom-bar pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-white/95 px-1 py-1 shadow-lg backdrop-blur-sm">
        <ZoomOut>
          {(props) => (
            <button
              type="button"
              onClick={props.onClick}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium text-slate-700 active:bg-slate-100"
              aria-label="Reducir texto del PDF"
            >
              −
            </button>
          )}
        </ZoomOut>
        <span className="min-w-[3rem] px-1 text-center text-xs font-semibold tabular-nums text-slate-600">
          {pct}%
        </span>
        <ZoomIn>
          {(props) => (
            <button
              type="button"
              onClick={props.onClick}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium text-slate-700 active:bg-slate-100"
              aria-label="Agrandar texto del PDF"
            >
              +
            </button>
          )}
        </ZoomIn>
      </div>

      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          key={`${url}-${paginaInicial}`}
          fileUrl={url}
          initialPage={paginaInicial}
          defaultScale={touchMode ? SpecialZoomLevel.PageWidth : SpecialZoomLevel.PageFit}
          plugins={[zoomPluginInstance]}
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
