"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import { esEntradaPen } from "@/lib/pizarraTinta"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  agregarPuntosInk,
  crearContextoTinta,
  esEntradaDibujo,
  puntosCoalescidos,
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
}

export default function LeccionInkCapa({ semana, fecha, modo, anclaRef }: Props) {
  const capasRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<PuntoInk[]>([])
  const pintando = useRef(false)
  const penPrioritario = useRef(false)
  const pointerId = useRef<number | null>(null)
  const rafPintar = useRef(0)
  const dims = useRef({ w: 0, h: 0, dpr: 1 })
  const modoRef = useRef(modo)
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

    const pts = trazoActivo.current
    if (pts.length > 0 && modoRef.current === "subrayar") {
      pintarTrazoEnCtx(ctx, pts, COLOR_LAPIZ, GROSOR_LAPIZ)
    }
  }, [])

  const programarPintado = useCallback(() => {
    if (rafPintar.current) return
    rafPintar.current = requestAnimationFrame(() => {
      rafPintar.current = 0
      pintarVivo()
    })
  }, [pintarVivo])

  const rectAncla = useCallback(() => anclaRef.current?.getBoundingClientRect() ?? null, [anclaRef])

  const rechazarEntrada = useCallback((e: PointerEvent) => {
    return penPrioritario.current && e.pointerType !== "pen"
  }, [])

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
    const capas = capasRef.current
    if (!capas || !puedeDibujar) return

    const limpiarSeleccion = () => {
      window.getSelection()?.removeAllRanges()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!modoRef.current || !esEntradaDibujo(e)) return
      if (rechazarEntrada(e)) {
        e.preventDefault()
        return
      }

      const rect = rectAncla()
      if (!rect) return

      e.preventDefault()
      e.stopPropagation()
      limpiarSeleccion()
      capas.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId
      pintando.current = true
      if (esEntradaPen(e.pointerType)) penPrioritario.current = true

      const puntos = puntosCoalescidos(e, rect)
      const p = puntos[puntos.length - 1]
      if (!p) return

      if (modoRef.current === "borrador") {
        aplicarBorrador(p[0], p[1])
        return
      }

      trazoActivo.current = [p]
      programarPintado()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return
      if (rechazarEntrada(e)) return

      const rect = rectAncla()
      if (!rect) return
      e.preventDefault()
      e.stopPropagation()

      const coalescidos = puntosCoalescidos(e, rect)
      if (coalescidos.length === 0) return

      if (modoRef.current === "borrador") {
        for (const c of coalescidos) aplicarBorrador(c[0], c[1])
        return
      }

      trazoActivo.current = agregarPuntosInk(trazoActivo.current, coalescidos, 0.8)
      programarPintado()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return

      e.preventDefault()
      e.stopPropagation()
      limpiarSeleccion()

      cancelAnimationFrame(rafPintar.current)
      rafPintar.current = 0
      pintando.current = false
      pointerId.current = null
      if (esEntradaPen(e.pointerType)) penPrioritario.current = false

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

      const live = liveRef.current
      const ctxLive = live ? crearContextoTinta(live) : null
      if (ctxLive && live) {
        const { dpr } = dims.current
        ctxLive.clearRect(0, 0, live.width / dpr, live.height / dpr)
      }

      try {
        capas.releasePointerCapture(e.pointerId)
      } catch {
        /* ya liberado */
      }
    }

    const onSelectStart = (e: Event) => {
      e.preventDefault()
    }

    capas.addEventListener("pointerdown", onPointerDown, { passive: false })
    capas.addEventListener("pointermove", onPointerMove, { passive: false })
    capas.addEventListener("pointerup", onPointerUp, { passive: false })
    capas.addEventListener("pointercancel", onPointerUp, { passive: false })
    capas.addEventListener("selectstart", onSelectStart)

    return () => {
      cancelAnimationFrame(rafPintar.current)
      capas.removeEventListener("pointerdown", onPointerDown)
      capas.removeEventListener("pointermove", onPointerMove)
      capas.removeEventListener("pointerup", onPointerUp)
      capas.removeEventListener("pointercancel", onPointerUp)
      capas.removeEventListener("selectstart", onSelectStart)
    }
  }, [puedeDibujar, aplicarBorrador, persistir, programarPintado, rectAncla, rechazarEntrada])

  return (
    <div
      ref={capasRef}
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
