"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  agregarEventosPointer,
  agregarPuntosInk,
  crearContextoTinta,
  esEntradaDibujo,
  esPencilPointer,
  puntosCoalescidos,
  puntosPredichos,
  type PuntoInk,
} from "@/lib/leccionInkInput"
import {
  COLOR_LAPIZ,
  GROSOR_LAPIZ,
  pintarTrazoEnCtx,
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
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<PuntoInk[]>([])
  const trazoPreview = useRef<PuntoInk[]>([])
  const pintando = useRef(false)
  const penPrioritario = useRef(false)
  const pointerId = useRef<number | null>(null)
  const rafPintar = useRef(0)
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

  const pintarVivo = useCallback(() => {
    const live = liveRef.current
    if (!live) return
    const ctx = crearContextoTinta(live)
    if (!ctx) return
    const { dpr } = dims.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, live.width / dpr, live.height / dpr)

    if (modoRef.current !== "subrayar") return

    const pts = trazoActivo.current
    const extra = trazoPreview.current
    const todos = extra.length ? pts.concat(extra) : pts
    if (todos.length > 0) {
      pintarTrazoEnCtx(ctx, todos, COLOR_LAPIZ, GROSOR_LAPIZ, 1, true)
    }
  }, [])

  const programarPintado = useCallback(() => {
    pintarVivo()
    if (rafPintar.current) return
    rafPintar.current = requestAnimationFrame(() => {
      rafPintar.current = 0
      pintarVivo()
    })
  }, [pintarVivo])

  const rectAncla = useCallback(() => anclaRef.current?.getBoundingClientRect() ?? null, [anclaRef])

  const bloquearScroll = useCallback((bloquear: boolean) => {
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
  }, [scrollRef])

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
        trazoActivo.current = agregarEventosPointer(trazoActivo.current, e, rect)
      }

      trazoPreview.current = []
      limpiarSeleccion()
      cancelAnimationFrame(rafPintar.current)
      rafPintar.current = 0
      pintando.current = false
      pointerId.current = null
      penPrioritario.current = false
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

      const ctxLive = live ? crearContextoTinta(live) : null
      if (ctxLive && live) {
        const { dpr } = dims.current
        ctxLive.clearRect(0, 0, live.width / dpr, live.height / dpr)
      }

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
      trazoPreview.current = []
      bloquearScroll(true)
      if (esPencilPointer(e)) penPrioritario.current = true

      const puntos = puntosCoalescidos(e, rect)
      const p = puntos[puntos.length - 1]
      if (!p) return

      if (modoRef.current === "borrador") {
        aplicarBorrador(p[0], p[1])
        return
      }

      trazoActivo.current = agregarPuntosInk([], puntos)
      programarPintado()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return

      const rect = rectAncla()
      if (!rect) return
      e.preventDefault()

      if (modoRef.current === "borrador") {
        const coalescidos = puntosCoalescidos(e, rect)
        for (const c of coalescidos) aplicarBorrador(c[0], c[1])
        return
      }

      trazoActivo.current = agregarEventosPointer(trazoActivo.current, e, rect)
      trazoPreview.current = puntosPredichos(e, rect)
      programarPintado()
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
      cancelAnimationFrame(rafPintar.current)
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
    programarPintado,
    rectAncla,
    bloquearScroll,
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
