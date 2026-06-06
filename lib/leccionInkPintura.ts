import getStroke from "perfect-freehand"
import { trazoUsaPresionReal, type PuntoInk } from "@/lib/leccionInkInput"
import type { TrazoLeccionLocal } from "@/lib/leccionTintaLocal"

export const COLOR_LAPIZ = "#92400e"
export const GROSOR_LAPIZ = 2.75

function contornoTrazo(points: PuntoInk[], size: number) {
  const presionReal = trazoUsaPresionReal(points)
  return getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size,
      thinning: presionReal ? 0.35 : 0.4,
      smoothing: 0.55,
      streamline: 0.62,
      simulatePressure: !presionReal,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    }
  )
}

export function pintarTrazoEnCtx(
  ctx: CanvasRenderingContext2D,
  points: PuntoInk[],
  color: string,
  size: number,
  opacidad = 1
) {
  if (points.length === 0) return

  ctx.save()
  ctx.globalAlpha = opacidad
  ctx.fillStyle = color

  if (points.length === 1) {
    const [x, y] = points[0]
    ctx.beginPath()
    ctx.arc(x, y, size * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  const outline = contornoTrazo(points, size)
  if (outline.length < 4) {
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
    pintarTrazoEnCtx(ctx, t.points, t.color, t.size)
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
