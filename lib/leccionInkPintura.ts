import getStroke from "perfect-freehand"
import { trazoUsaPresionReal, type PuntoInk } from "@/lib/leccionInkInput"
import type { TrazoLeccionLocal } from "@/lib/leccionTintaLocal"

export const COLOR_LAPIZ = "#92400e"
export const GROSOR_LAPIZ = 2.75

type OpcionesTrazo = {
  size: number
  smoothing: number
  streamline: number
}

function contornoTrazo(points: PuntoInk[], opts: OpcionesTrazo) {
  const presionReal = trazoUsaPresionReal(points)
  return getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size: opts.size,
      thinning: presionReal ? 0.4 : 0.45,
      smoothing: opts.smoothing,
      streamline: opts.streamline,
      simulatePressure: !presionReal,
      easing: (t) => Math.sin((t * Math.PI) / 2),
      start: { taper: 2, cap: true },
      end: { taper: 2, cap: true },
    }
  )
}

const OPCIONES_VIVO: OpcionesTrazo = {
  size: GROSOR_LAPIZ,
  smoothing: 0.42,
  streamline: 0.38,
}

const OPCIONES_FINAL: OpcionesTrazo = {
  size: GROSOR_LAPIZ,
  smoothing: 0.58,
  streamline: 0.55,
}

export function pintarTrazoEnCtx(
  ctx: CanvasRenderingContext2D,
  points: PuntoInk[],
  color: string,
  size: number,
  opacidad = 1,
  enVivo = false
) {
  if (points.length === 0) return

  ctx.save()
  ctx.globalAlpha = opacidad
  ctx.fillStyle = color

  if (points.length === 1) {
    const [x, y, pr] = points[0]
    const r = size * (0.38 + pr * 0.12)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  const opts = enVivo
    ? { ...OPCIONES_VIVO, size }
    : { ...OPCIONES_FINAL, size }

  const outline = contornoTrazo(points, opts)
  if (outline.length < 4) {
    const [x, y] = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2)
    ctx.fill()
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
    pintarTrazoEnCtx(ctx, t.points, t.color, t.size, 1, false)
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
