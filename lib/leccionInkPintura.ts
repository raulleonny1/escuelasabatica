import getStroke from "perfect-freehand"
import { trazoUsaPresionReal, type PuntoInk } from "@/lib/leccionInkInput"
import type { TrazoLeccionLocal } from "@/lib/leccionTintaLocal"

export const COLOR_LAPIZ = "#92400e"
export const GROSOR_LAPIZ = 2.75

function grosorEnPunto(presion: number, size: number): number {
  const pr = presion > 0 && presion <= 1 ? presion : 0.45
  return size * (0.72 + pr * 0.28)
}

/** Punto suelto — instantáneo, sin perfect-freehand. */
export function pintarPuntoRapido(
  ctx: CanvasRenderingContext2D,
  p: PuntoInk,
  color: string,
  size: number
) {
  const [x, y] = p
  const r = grosorEnPunto(p[2], size) * 0.48
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Segmento recto redondeado — O(1), trazo continuo en vivo. */
export function pintarSegmentoRapido(
  ctx: CanvasRenderingContext2D,
  a: PuntoInk,
  b: PuntoInk,
  color: string,
  size: number
) {
  const w = (grosorEnPunto(a[2], size) + grosorEnPunto(b[2], size)) / 2
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.stroke()
}

/** Dibuja solo los segmentos nuevos desde `desdeIdx`. Devuelve nuevo índice. */
export function pintarIncrementoRapido(
  ctx: CanvasRenderingContext2D,
  points: PuntoInk[],
  desdeIdx: number,
  color: string,
  size: number
): number {
  if (points.length === 0) return 0
  if (points.length === 1) {
    pintarPuntoRapido(ctx, points[0], color, size)
    return 1
  }

  let i = Math.max(1, desdeIdx)
  if (desdeIdx <= 0) {
    pintarPuntoRapido(ctx, points[0], color, size)
    i = 1
  }

  for (; i < points.length; i++) {
    pintarSegmentoRapido(ctx, points[i - 1], points[i], color, size)
  }
  return points.length
}

function contornoTrazoFinal(points: PuntoInk[], size: number) {
  const presionReal = trazoUsaPresionReal(points)
  return getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size,
      thinning: presionReal ? 0.4 : 0.45,
      smoothing: 0.55,
      streamline: 0.5,
      simulatePressure: !presionReal,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    }
  )
}

/** Trazo final suavizado — solo al soltar (perfect-freehand). */
export function pintarTrazoFinalEnCtx(
  ctx: CanvasRenderingContext2D,
  points: PuntoInk[],
  color: string,
  size: number
) {
  if (points.length === 0) return

  ctx.save()
  ctx.fillStyle = color

  if (points.length === 1) {
    pintarPuntoRapido(ctx, points[0], color, size)
    ctx.restore()
    return
  }

  const outline = contornoTrazoFinal(points, size)
  if (outline.length < 4) {
    pintarIncrementoRapido(ctx, points, 0, color, size)
    ctx.restore()
    return
  }

  ctx.beginPath()
  ctx.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1])
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function repintarTrazos(
  ctx: CanvasRenderingContext2D,
  trazos: TrazoLeccionLocal[],
  dpr: number
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr)
  for (const t of trazos) {
    pintarTrazoFinalEnCtx(ctx, t.points, t.color, t.size)
  }
}

export function trazoDesdePuntos(
  points: PuntoInk[],
  size = GROSOR_LAPIZ
): TrazoLeccionLocal {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    points,
    color: COLOR_LAPIZ,
    size,
  }
}
