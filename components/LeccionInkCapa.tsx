"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  agregarPuntosInk,
  calcularDimensionesCanvas,
  crearContextoTinta,
  esEntradaDibujo,
  esPencilPointer,
  puntoDesdePointer,
  puntosCoalescidos,
  type PuntoInk,
} from "@/lib/leccionInkInput"
import {
  COLOR_LAPIZ,
  GROSOR_LAPIZ,
  pintarIncrementoRapido,
  pintarSegmentoRapido,
  trazoDesdePuntos,
} from "@/lib/leccionInkPintura"
import {
  borrarTrazosEnPunto,
  guardarTrazosLeccion,
  leerTrazosLeccion,
} from "@/lib/leccionTintaLocal"

type Props = {
  semana: number
  fecha: string
  modo: Extract<HerramientaLeccion, "subrayar" | "borrador">
  anclaRef: RefObject<HTMLElement | null>
  scrollRef?: RefObject<HTMLElement | null>
  onTrazosChange?: (cantidad: number) => void
}

/** Solo canvas en vivo — las rayas guardadas las muestra LeccionInkSvgOverlay. */
export default function LeccionInkCapa({
  semana,
  fecha,
  modo,
  anclaRef,
  scrollRef,
  onTrazosChange,
}: Props) {
  const capasRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const ctxLiveRef = useRef<CanvasRenderingContext2D | null>(null)
  const trazosRef = useRef(leerTrazosLeccion(semana, fecha))
  const trazoActivo = useRef<PuntoInk[]>([])
  const ultimoPunto = useRef<PuntoInk | null>(null)
  const pintando = useRef(false)
  const penPrioritario = useRef(false)
  const pointerId = useRef<number | null>(null)
  const dims = useRef({ w: 0, h: 0, renderScale: 1 })
  const modoRef = useRef(modo)
  const scrollPrevio = useRef<string | null>(null)
  modoRef.current = modo

  const sincronizarCanvas = useCallback(() => {
    const ancla = anclaRef.current
    const live = liveRef.current
    if (!ancla || !live) return false

    const w = Math.max(ancla.scrollWidth, ancla.clientWidth)
    const h = Math.max(ancla.scrollHeight, ancla.clientHeight)
    if (w <= 0 || h <= 0) return false

    const medidas = calcularDimensionesCanvas(w, h)
    dims.current = {
      w: medidas.w,
      h: medidas.h,
      renderScale: medidas.renderScale,
    }

    live.width = medidas.pixelW
    live.height = medidas.pixelH
    live.style.width = `${medidas.w}px`
    live.style.height = `${medidas.h}px`

    ctxLiveRef.current = null
    const ctx = crearContextoTinta(live)
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, medidas.pixelW, medidas.pixelH)
    }
    return true
  }, [anclaRef])

  useEffect(() => {
    trazosRef.current = leerTrazosLeccion(semana, fecha)
  }, [semana, fecha])

  useEffect(() => {
    const ancla = anclaRef.current
    if (!ancla) return
    const obs = new ResizeObserver(() => {
      if (pintando.current) sincronizarCanvas()
    })
    obs.observe(ancla)
    return () => obs.disconnect()
  }, [anclaRef, sincronizarCanvas])

  const persistir = useCallback(() => {
    guardarTrazosLeccion(semana, fecha, trazosRef.current)
    onTrazosChange?.(trazosRef.current.length)
  }, [semana, fecha, onTrazosChange])

  const ctxVivo = useCallback(() => {
    const live = liveRef.current
    if (!live) return null
    if (!ctxLiveRef.current) {
      ctxLiveRef.current = crearContextoTinta(live)
      const { renderScale } = dims.current
      ctxLiveRef.current?.setTransform(renderScale, 0, 0, renderScale, 0, 0)
    }
    return ctxLiveRef.current
  }, [])

  const limpiarCapaViva = useCallback(() => {
    const live = liveRef.current
    const ctx = ctxVivo()
    if (!live || !ctx) return
    const { w, h } = dims.current
    ctx.setTransform(
      dims.current.renderScale,
      0,
      0,
      dims.current.renderScale,
      0,
      0
    )
    ctx.clearRect(0, 0, w, h)
  }, [ctxVivo])

  const rectAncla = useCallback(() => anclaRef.current?.getBoundingClientRect() ?? null, [anclaRef])

  const bloquearScroll = useCallback(
    (bloquear: boolean) => {
      const scroll = scrollRef?.current
      if (!scroll) return
      if (bloquear) {
        scrollPrevio.current = scroll.style.overflow
        scroll.style.overflow = "hidden"
        scroll.style.touchAction = "none"
      } else {
        scroll.style.overflow = scrollPrevio.current ?? ""
        scroll.style.touchAction = ""
        scrollPrevio.current = null
      }
    },
    [scrollRef]
  )

  const aplicarBorrador = useCallback(
    (x: number, y: number) => {
      const { trazos, huboCambio } = borrarTrazosEnPunto(trazosRef.current, x, y)
      if (!huboCambio) return
      trazosRef.current = trazos
      persistir()
    },
    [persistir]
  )

  const procesarMuestras = useCallback(
    (e: PointerEvent, rect: DOMRect, guardar: boolean) => {
      const ctx = ctxVivo()
      if (!ctx) return

      const eventos =
        typeof e.getCoalescedEvents === "function" && e.getCoalescedEvents().length > 0
          ? e.getCoalescedEvents()
          : [e]

      for (const ev of eventos) {
        const p = puntoDesdePointer(ev, rect)
        const prev = ultimoPunto.current

        if (prev) {
          pintarSegmentoRapido(ctx, prev, p, COLOR_LAPIZ, GROSOR_LAPIZ)
        } else {
          pintarIncrementoRapido(ctx, [p], 0, COLOR_LAPIZ, GROSOR_LAPIZ)
        }

        ultimoPunto.current = p
        if (guardar) {
          trazoActivo.current = agregarPuntosInk(trazoActivo.current, [p], 0.9)
        }
      }
    },
    [ctxVivo]
  )

  useEffect(() => {
    return () => {
      bloquearScroll(false)
    }
  }, [bloquearScroll])

  useEffect(() => {
    const capas = capasRef.current
    const live = liveRef.current
    if (!capas || !live) return

    const limpiarSeleccion = () => {
      window.getSelection()?.removeAllRanges()
    }

    const finalizarTrazo = (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return

      const rect = rectAncla()
      if (rect && modoRef.current === "subrayar") {
        procesarMuestras(e, rect, true)
      }

      limpiarSeleccion()
      pintando.current = false
      pointerId.current = null
      penPrioritario.current = false
      ultimoPunto.current = null
      bloquearScroll(false)

      if (modoRef.current === "subrayar") {
        const pts = trazoActivo.current
        trazoActivo.current = []
        if (pts.length >= 1) {
          trazosRef.current = [...trazosRef.current, trazoDesdePuntos(pts)]
          persistir()
        }
      } else {
        trazoActivo.current = []
      }

      limpiarCapaViva()
      ctxLiveRef.current = null
      live.classList.remove("leccion-ink-live-trazo")

      try {
        capas.releasePointerCapture(e.pointerId)
      } catch {
        /* ya liberado */
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!modoRef.current || !esEntradaDibujo(e)) return
      if (penPrioritario.current && !esPencilPointer(e)) {
        e.preventDefault()
        return
      }

      const rect = rectAncla()
      if (!rect) return

      e.preventDefault()
      limpiarSeleccion()
      sincronizarCanvas()
      live.classList.add("leccion-ink-live-trazo")
      capas.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId
      pintando.current = true
      trazoActivo.current = []
      ultimoPunto.current = null
      ctxLiveRef.current = null
      limpiarCapaViva()
      bloquearScroll(true)
      if (esPencilPointer(e)) penPrioritario.current = true

      if (modoRef.current === "borrador") {
        const puntos = puntosCoalescidos(e, rect)
        const p = puntos[puntos.length - 1]
        if (p) aplicarBorrador(p[0], p[1])
        return
      }

      procesarMuestras(e, rect, true)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return

      const rect = rectAncla()
      if (!rect) return
      e.preventDefault()

      if (modoRef.current === "borrador") {
        for (const c of puntosCoalescidos(e, rect)) aplicarBorrador(c[0], c[1])
        return
      }

      procesarMuestras(e, rect, true)
    }

    const onPointerUp = (e: PointerEvent) => {
      finalizarTrazo(e)
    }

    const onLostCapture = (e: PointerEvent) => {
      if (pintando.current && pointerId.current === e.pointerId) {
        finalizarTrazo(e)
      }
    }

    capas.addEventListener("pointerdown", onPointerDown, { passive: false })
    capas.addEventListener("pointermove", onPointerMove, { passive: false })
    capas.addEventListener("pointerup", onPointerUp, { passive: false })
    capas.addEventListener("pointercancel", onPointerUp, { passive: false })
    capas.addEventListener("lostpointercapture", onLostCapture)

    return () => {
      bloquearScroll(false)
      capas.removeEventListener("pointerdown", onPointerDown)
      capas.removeEventListener("pointermove", onPointerMove)
      capas.removeEventListener("pointerup", onPointerUp)
      capas.removeEventListener("pointercancel", onPointerUp)
      capas.removeEventListener("lostpointercapture", onLostCapture)
    }
  }, [
    aplicarBorrador,
    persistir,
    rectAncla,
    bloquearScroll,
    limpiarCapaViva,
    procesarMuestras,
    sincronizarCanvas,
  ])

  return (
    <div
      ref={capasRef}
      className={`leccion-ink-capas leccion-ink-capa-activa${
        modo === "borrador" ? " leccion-ink-capa-borrador" : ""
      }`}
      aria-hidden
    >
      <canvas ref={liveRef} className="leccion-ink-live leccion-ink-live-oculto" />
    </div>
  )
}
