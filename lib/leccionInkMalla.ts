import getStroke from "perfect-freehand"
import earcut from "earcut"
import type { MallaTinta } from "@/lib/pizarraTinta"
import { trazoUsaPresionReal, type PuntoInk } from "@/lib/leccionInkInput"
import type { TrazoLeccionLocal } from "@/lib/leccionTintaLocal"

function hexARgba(hex: string, alpha = 1): [number, number, number, number] {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha]
}

function trianguloContorno(outline: number[][]): Float32Array {
  if (outline.length < 3) return new Float32Array(0)
  const flat: number[] = []
  for (const [x, y] of outline) flat.push(x, y)
  const indices = earcut(flat)
  const verts: number[] = []
  for (const i of indices) {
    verts.push(flat[i * 2], flat[i * 2 + 1])
  }
  return new Float32Array(verts)
}

/** Convierte trazo en píxeles CSS a malla GPU (píxeles de dispositivo). */
export function mallaDesdeTrazoLeccion(
  points: PuntoInk[],
  color: string,
  size: number,
  dpr: number,
  alpha = 1
): MallaTinta | null {
  if (points.length === 0) return null

  const pix = points.map(([x, y, p]) => ({
    x: x * dpr,
    y: y * dpr,
    pressure: Math.min(1, Math.max(0.12, p)),
  }))

  const presionReal = trazoUsaPresionReal(points)
  const base = Math.max(size * dpr, 1.2 * dpr)

  if (pix.length === 1) {
    const r = Math.max(base * pix[0].pressure * 0.55, 1.2 * dpr)
    const segs = 14
    const verts: number[] = []
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2
      const a1 = ((i + 1) / segs) * Math.PI * 2
      verts.push(pix[0].x, pix[0].y)
      verts.push(pix[0].x + Math.cos(a0) * r, pix[0].y + Math.sin(a0) * r)
      verts.push(pix[0].x + Math.cos(a1) * r, pix[0].y + Math.sin(a1) * r)
    }
    return { vertices: new Float32Array(verts), color: hexARgba(color, alpha) }
  }

  const outline = getStroke(pix, {
    size: base,
    thinning: presionReal ? 0.48 : 0.55,
    smoothing: 0.62,
    streamline: 0.52,
    simulatePressure: !presionReal,
    easing: (t) => t,
    start: { taper: 2, cap: true },
    end: { taper: 2, cap: true },
  })

  const verts = trianguloContorno(outline)
  if (verts.length === 0) return null
  return { vertices: verts, color: hexARgba(color, alpha) }
}

export function mallaDesdeTrazoGuardado(
  trazo: TrazoLeccionLocal,
  dpr: number,
  alpha = 1
): MallaTinta | null {
  return mallaDesdeTrazoLeccion(trazo.points, trazo.color, trazo.size, dpr, alpha)
}
