"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  agregarPuntosInk,
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
  repintarTrazos,
  trazoDesdePuntos,
} from "@/lib/leccionInkPintura"
import {
  borrarTrazosEnPunto,
  guardarTrazosLeccion,
  leerTrazosLeccion,
  type TrazoLeccionLocal,
} from "@/lib/leccionTintaLocal"

type Props = {
  semana: number
  fecha: string
  modo: Extract<HerramientaLeccion, "subrayar" | "borrador"> | null
  anclaRef: RefObject<HTMLElement | null>
  scrollRef?: RefObject<HTMLElement | null>
}

export default function LeccionInkCapa({
  semana,
  fecha,
  modo,
  anclaRef,
  scrollRef,
}: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const ctxLiveRef = useRef<CanvasRenderingContext2D | null>(null)
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<PuntoInk[]>([])
  const ultimoPunto = useRef<PuntoInk | null>(null)
  const pintando = useRef(false)
  const penPrioritario = useRef(false)
  const pointerId = useRef<number | null>(null)
  const dims = useRef({ w: 0, h: 0, dpr: 1 })
  const modoRef = useRef(modo)
  const scrollPrevio = useRef<string | null>(null)
  modoRef.current = modo

  const puedeDibujar = modo !== null

  const sincronizarCanvas = useCallback(() => {
    const ancla = anclaRef.current
    const base = baseRef.current
    const live = liveRef.current
    if (!ancla || !base || !live) return false

    const w = Math.max(ancla.scrollWidth, ancla.clientWidth)
    const h = Math.max(ancla.scrollHeight, ancla.clientHeight)
    if (w <= 0 || h <= 0) return false

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    dims.current = { w, h, dpr }

    for (const canvas of [base, live]) {
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    ctxLiveRef.current = null
    const ctx = crearContextoTinta(base)
    if (ctx) repintarTrazos(ctx, trazosRef.current, dpr)
    return true
  }, [anclaRef])

  useEffect(() => {
    trazosRef.current = leerTrazosLeccion(semana, fecha)
    sincronizarCanvas()
  }, [semana, fecha, sincronizarCanvas])

  useEffect(() => {
    const ancla = anclaRef.current
    if (!ancla) return
    const obs = new ResizeObserver(() => {
      if (!pintando.current) sincronizarCanvas()
    })
    obs.observe(ancla)
    return () => obs.disconnect()
  }, [anclaRef, sincronizarCanvas])

  const persistir = useCallback(() => {
    guardarTrazosLeccion(semana, fecha, trazosRef.current)
  }, [semana, fecha])

  const ctxVivo = useCallback(() => {
    const live = liveRef.current
    if (!live) return null
    if (!ctxLiveRef.current) {
      ctxLiveRef.current = crearContextoTinta(live)
      const { dpr } = dims.current
      ctxLiveRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    return ctxLiveRef.current
  }, [])

  const limpiarCapaViva = useCallback(() => {
    const live = liveRef.current
    const ctx = ctxVivo()
    if (!live || !ctx) return
    const { dpr } = dims.current
    ctx.clearRect(0, 0, live.width / dpr, live.height / dpr)
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
      const ctx = baseRef.current ? crearContextoTinta(baseRef.current) : null
      if (ctx) repintarTrazos(ctx, trazosRef.current, dims.current.dpr)
    },
    [persistir]
  )

  /** Dibuja cada muestra coalescida al instante (sin recalcular todo el trazo). */
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
    const live = liveRef.current
    if (!live || !puedeDibujar) return

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
          const ctx = baseRef.current ? crearContextoTinta(baseRef.current) : null
          if (ctx) repintarTrazos(ctx, trazosRef.current, dims.current.dpr)
        }
      } else {
        trazoActivo.current = []
      }

      limpiarCapaViva()
      ctxLiveRef.current = null

      try {
        live.releasePointerCapture(e.pointerId)
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
      live.setPointerCapture(e.pointerId)
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

    live.addEventListener("pointerdown", onPointerDown, { passive: false })
    live.addEventListener("pointermove", onPointerMove, { passive: false })
    live.addEventListener("pointerup", onPointerUp, { passive: false })
    live.addEventListener("pointercancel", onPointerUp, { passive: false })
    live.addEventListener("lostpointercapture", onLostCapture)

    return () => {
      bloquearScroll(false)
      live.removeEventListener("pointerdown", onPointerDown)
      live.removeEventListener("pointermove", onPointerMove)
      live.removeEventListener("pointerup", onPointerUp)
      live.removeEventListener("pointercancel", onPointerUp)
      live.removeEventListener("lostpointercapture", onLostCapture)
    }
  }, [
    puedeDibujar,
    aplicarBorrador,
    persistir,
    rectAncla,
    bloquearScroll,
    limpiarCapaViva,
    procesarMuestras,
  ])

  return (
    <div
      className={`leccion-ink-capas${puedeDibujar ? " leccion-ink-capa-activa" : ""}${
        modo === "borrador" ? " leccion-ink-capa-borrador" : ""
      }`}
      aria-hidden
    >
      <canvas ref={baseRef} className="leccion-ink-base" />
      <canvas ref={liveRef} className="leccion-ink-live" />
    </div>
  )
}
