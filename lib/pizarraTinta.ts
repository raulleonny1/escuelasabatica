import getStroke from "perfect-freehand"
import type { HerramientaPizarra, TipoTrazo, TrazoPizarra } from "./pizarraClase"
import {
  desnormalizarPunto,
  normalizarPuntoFino,
  ptsDesdeString,
  resolverTrazoConGesto,
} from "./pizarraClase"

/** Punto de tinta vectorial: coordenadas normalizadas 0–1000 + presión + tiempo. */
export type PuntoTinta = {
  x: number
  y: number
  p: number
  t: number
  tx?: number
  ty?: number
}

export type TrazoTinta = Pick<
  TrazoPizarra,
  "id" | "color" | "grosor" | "herramienta" | "tipo" | "pagina" | "orden"
> & {
  puntos: PuntoTinta[]
}

export type MallaTinta = {
  vertices: Float32Array
  color: [number, number, number, number]
  modo: "fill" | "line" | "erase"
}

const BG: [number, number, number, number] = [250 / 255, 248 / 255, 243 / 255, 1]

export function esEntradaValidaPizarra(pointerType: string): boolean {
  return pointerType === "pen" || pointerType === "mouse"
}

export function muestrearPuntero(
  e: PointerEvent,
  rect: DOMRect,
  t0: number
): PuntoTinta {
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const n = normalizarPuntoFino(x, y, rect.width, rect.height)
  const p = e.pressure > 0 && e.pressure <= 1 ? e.pressure : 0.5
  return {
    x: n.x,
    y: n.y,
    p,
    t: Math.round(performance.now() - t0),
    tx: e.tiltX || undefined,
    ty: e.tiltY || undefined,
  }
}

export function agregarPuntoTinta(
  pts: PuntoTinta[],
  p: PuntoTinta,
  minDist = 0.6
): PuntoTinta[] {
  if (pts.length === 0) return [p]
  const last = pts[pts.length - 1]
  if (Math.hypot(p.x - last.x, p.y - last.y) < minDist) return pts
  return [...pts, p]
}

/** Predicción de trazo (1–2 frames) para reducir latencia percibida. */
export function predecirPuntosTinta(pts: PuntoTinta[], frames = 2): PuntoTinta[] {
  if (pts.length < 2) return []
  const a = pts[pts.length - 2]
  const b = pts[pts.length - 1]
  const vx = b.x - a.x
  const vy = b.y - a.y
  const out: PuntoTinta[] = []
  for (let i = 1; i <= frames; i++) {
    out.push({
      x: b.x + vx * i * 0.82,
      y: b.y + vy * i * 0.82,
      p: b.p,
      t: b.t + 12 * i,
      tx: b.tx,
      ty: b.ty,
    })
  }
  return out
}

export function ptsInkAString(points: PuntoTinta[]): string {
  return points
    .map((p) => {
      const base = `${Math.round(p.x)},${Math.round(p.y)},${p.p.toFixed(2)},${p.t}`
      if (p.tx != null && p.ty != null) return `${base},${Math.round(p.tx)},${Math.round(p.ty)}`
      return base
    })
    .join(";")
}

export function ptsInkDesdeString(pts: string): PuntoTinta[] {
  if (!pts.trim()) return []
  if (!pts.includes(";") && pts.includes(" ")) {
    return ptsDesdeString(pts).map((p, i) => ({ ...p, p: 0.5, t: i * 16 }))
  }
  return pts.split(";").map((par) => {
    const parts = par.split(",").map(Number)
    const [x, y, pr = 0.5, t = 0, tx, ty] = parts
    const punto: PuntoTinta = { x, y, p: pr, t }
    if (Number.isFinite(tx) && Number.isFinite(ty)) {
      punto.tx = tx
      punto.ty = ty
    }
    return punto
  })
}

export function trazoFirestoreATinta(trazo: TrazoPizarra): TrazoTinta {
  return {
    id: trazo.id,
    color: trazo.color,
    grosor: trazo.grosor,
    herramienta: trazo.herramienta,
    tipo: trazo.tipo,
    pagina: trazo.pagina,
    orden: trazo.orden,
    puntos: ptsInkDesdeString(trazo.pts),
  }
}

export function trazoTintaAFirestore(
  trazo: Omit<TrazoTinta, "id" | "orden">
): Omit<TrazoPizarra, "id" | "orden"> {
  return {
    pts: ptsInkAString(trazo.puntos),
    color: trazo.color,
    grosor: trazo.grosor,
    herramienta: trazo.herramienta,
    tipo: trazo.tipo,
    pagina: trazo.pagina,
  }
}

function hexARgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]
}

function puntosAPixeles(puntos: PuntoTinta[], w: number, h: number) {
  return puntos.map((p) => {
    const { x, y } = desnormalizarPunto(p.x, p.y, w, h)
    return { x, y, pressure: p.p }
  })
}

function trianguloAbanico(outline: number[][]): Float32Array {
  if (outline.length < 3) return new Float32Array(0)
  const verts: number[] = []
  const [x0, y0] = outline[0]
  for (let i = 1; i < outline.length - 1; i++) {
    verts.push(x0, y0, outline[i][0], outline[i][1], outline[i + 1][0], outline[i + 1][1])
  }
  return new Float32Array(verts)
}

function mallaTrazoLibre(
  puntos: PuntoTinta[],
  color: string,
  grosor: number,
  w: number,
  h: number,
  borrador = false
): MallaTinta | null {
  if (puntos.length === 0) return null
  const pix = puntosAPixeles(puntos, w, h)
  const base = grosor * (w / 1000) * 2.2
  const simulate = pix.every((p) => Math.abs(p.pressure - 0.5) < 0.02)

  if (pix.length === 1) {
    const r = Math.max(base * pix[0].pressure * 1.4, 2)
    const segs = 16
    const verts: number[] = []
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2
      const a1 = ((i + 1) / segs) * Math.PI * 2
      verts.push(pix[0].x, pix[0].y)
      verts.push(pix[0].x + Math.cos(a0) * r, pix[0].y + Math.sin(a0) * r)
      verts.push(pix[0].x + Math.cos(a1) * r, pix[0].y + Math.sin(a1) * r)
    }
    return {
      vertices: new Float32Array(verts),
      color: borrador ? [0, 0, 0, 1] : hexARgba(color),
      modo: borrador ? "erase" : "fill",
    }
  }

  const outline = getStroke(pix, {
    size: base,
    thinning: 0.62,
    smoothing: 0.58,
    streamline: 0.42,
    simulatePressure: simulate,
    easing: (t) => t,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  })

  const verts = trianguloAbanico(outline)
  if (verts.length === 0) return null
  return {
    vertices: verts,
    color: borrador ? [0, 0, 0, 1] : hexARgba(color),
    modo: borrador ? "erase" : "fill",
  }
}

function mallaLinea(
  a: PuntoTinta,
  b: PuntoTinta,
  color: string,
  grosor: number,
  w: number,
  h: number,
  factor = 1
): MallaTinta | null {
  return mallaTrazoLibre([a, b], color, grosor * factor, w, h)
}

function mallaElipse(
  a: PuntoTinta,
  b: PuntoTinta,
  color: string,
  grosor: number,
  w: number,
  h: number
): MallaTinta | null {
  const pa = desnormalizarPunto(a.x, a.y, w, h)
  const pb = desnormalizarPunto(b.x, b.y, w, h)
  const cx = (pa.x + pb.x) / 2
  const cy = (pa.y + pb.y) / 2
  const rx = Math.abs(pb.x - pa.x) / 2
  const ry = Math.abs(pb.y - pa.y) / 2
  if (rx < 2 || ry < 2) return null
  const segs = 48
  const pts: PuntoTinta[] = []
  for (let i = 0; i <= segs; i++) {
    const ang = (i / segs) * Math.PI * 2
    const x = cx + Math.cos(ang) * rx
    const y = cy + Math.sin(ang) * ry
    const n = normalizarPuntoFino(x, y, w, h)
    pts.push({ x: n.x, y: n.y, p: 0.5, t: i * 8 })
  }
  return mallaTrazoLibre(pts, color, grosor, w, h)
}

function mallaRectangulo(
  a: PuntoTinta,
  b: PuntoTinta,
  color: string,
  grosor: number,
  w: number,
  h: number
): MallaTinta | null {
  const pa = desnormalizarPunto(a.x, a.y, w, h)
  const pb = desnormalizarPunto(b.x, b.y, w, h)
  const x0 = Math.min(pa.x, pb.x)
  const y0 = Math.min(pa.y, pb.y)
  const x1 = Math.max(pa.x, pb.x)
  const y1 = Math.max(pa.y, pb.y)
  const corners = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
    { x: x0, y: y0 },
  ].map(({ x, y }) => {
    const n = normalizarPuntoFino(x, y, w, h)
    return { x: n.x, y: n.y, p: 0.5, t: 0 }
  })
  return mallaTrazoLibre(corners, color, grosor, w, h)
}

export function mallaDesdeTrazo(
  trazo: TrazoTinta,
  w: number,
  h: number
): MallaTinta | null {
  const { puntos, color, grosor, herramienta, tipo } = trazo
  if (puntos.length === 0) return null

  if (herramienta === "borrador") {
    return mallaTrazoLibre(puntos, color, grosor, w, h, true)
  }
  if (tipo === "punto") {
    return mallaTrazoLibre(puntos, color, grosor, w, h)
  }
  if (tipo === "subrayado" && puntos.length >= 2) {
    return mallaLinea(puntos[0], puntos[1], color, grosor, w, h, 1.8)
  }
  if (tipo === "circulo" && puntos.length >= 2) {
    return mallaElipse(puntos[0], puntos[1], color, grosor, w, h)
  }
  if (tipo === "rectangulo" && puntos.length >= 2) {
    return mallaRectangulo(puntos[0], puntos[1], color, grosor, w, h)
  }
  return mallaTrazoLibre(puntos, color, grosor, w, h)
}

/** Borrado vectorial parcial: quita trazos que intersectan el path del borrador. */
export function aplicarBorradoVectorial(
  trazos: TrazoTinta[],
  trazoBorrador: PuntoTinta[],
  grosorBorrador: number
): TrazoTinta[] {
  if (trazoBorrador.length === 0) return trazos
  const radio = grosorBorrador * 1.2
  return trazos.filter((trazo) => {
    if (trazo.herramienta === "borrador") return false
    for (const p of trazo.puntos) {
      for (const e of trazoBorrador) {
        if (Math.hypot(p.x - e.x, p.y - e.y) < radio) return false
      }
    }
    return true
  })
}

export function resolverTrazoTinta(
  puntos: PuntoTinta[],
  herramienta: HerramientaPizarra,
  color: string,
  grosor: number,
  grosorBorrador: number,
  pagina: number
): Omit<TrazoTinta, "id" | "orden"> | null {
  const ptsPlano = puntos.map(({ x, y }) => ({ x, y }))
  const res = resolverTrazoConGesto(ptsPlano, herramienta)
  if (res.tipo !== "punto" && puntos.length < 2) return null

  const puntosResueltos = ptsInkDesdeString(res.pts)
  const esBorrador = herramienta === "borrador"

  return {
    puntos: esBorrador ? puntos : puntosResueltos,
    color: esBorrador ? "#000000" : color,
    grosor: esBorrador ? grosorBorrador : grosor,
    herramienta: esBorrador ? "borrador" : "lapiz",
    tipo: res.tipo,
    pagina,
  }
}

export { BG as COLOR_FONDO_PIZARRA }
