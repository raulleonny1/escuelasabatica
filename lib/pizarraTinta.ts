import getStroke from "perfect-freehand"
import type { HerramientaPizarra, TipoTrazo, TrazoPizarra } from "./pizarraClase"
import {
  desnormalizarPunto,
  normalizarPuntoFino,
  ptsDesdeString,
  resolverTrazoConGesto,
} from "./pizarraClase"

/** Punto de tinta vectorial (coordenadas normalizadas 0–1000). */
export type InkPoint = {
  x: number
  y: number
  pressure: number
  time: number
  tiltX: number
  tiltY: number
}

/** Trazo vectorial independiente — nunca rasterizado. */
export type InkStroke = {
  id: string
  points: InkPoint[]
  color: string
  baseWidth: number
  pagina: number
  orden: number
  herramienta: HerramientaPizarra
  tipo: TipoTrazo
}

export type MallaTinta = {
  vertices: Float32Array
  color: [number, number, number, number]
}

export type AccionPizarra =
  | { tipo: "addStroke"; stroke: InkStroke }
  | { tipo: "removeStroke"; stroke: InkStroke }
  | { tipo: "splitStroke"; original: InkStroke; strokes: InkStroke[] }

export const COLOR_FONDO_PIZARRA: [number, number, number, number] = [
  250 / 255,
  248 / 255,
  243 / 255,
  1,
]

const LATENCIA_WARN_MS = 20

export function esEntradaPen(pointerType: string): boolean {
  return pointerType === "pen"
}

export function muestrearPunteroPen(
  e: PointerEvent,
  rect: DOMRect,
  t0: number
): InkPoint {
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const n = normalizarPuntoFino(x, y, rect.width, rect.height)
  const pressure = e.pressure > 0 && e.pressure <= 1 ? e.pressure : 0.45
  return {
    x: n.x,
    y: n.y,
    pressure,
    time: Math.round(performance.now() - t0),
    tiltX: e.tiltX ?? 0,
    tiltY: e.tiltY ?? 0,
  }
}

export function agregarPuntoInk(
  pts: InkPoint[],
  p: InkPoint,
  minDist = 0.35
): InkPoint[] {
  if (pts.length === 0) return [p]
  const last = pts[pts.length - 1]
  if (Math.hypot(p.x - last.x, p.y - last.y) < minDist) return pts
  return [...pts, p]
}

/** Predicción con últimos 2–3 puntos. */
export function predecirPuntosInk(pts: InkPoint[], frames = 2): InkPoint[] {
  if (pts.length < 2) return []
  const n = Math.min(pts.length, 3)
  const slice = pts.slice(-n)
  const a = slice[slice.length - 2]
  const b = slice[slice.length - 1]
  const vx = b.x - a.x
  const vy = b.y - a.y
  const out: InkPoint[] = []
  for (let i = 1; i <= frames; i++) {
    out.push({
      x: b.x + vx * i * 0.85,
      y: b.y + vy * i * 0.85,
      pressure: b.pressure,
      time: b.time + 10 * i,
      tiltX: b.tiltX,
      tiltY: b.tiltY,
    })
  }
  return out
}

export function registrarLatenciaTinta(inicio: number, etiqueta: string) {
  const ms = performance.now() - inicio
  if (ms > LATENCIA_WARN_MS) {
    console.warn(`[pizarra] latencia ${etiqueta}: ${ms.toFixed(1)} ms`)
  }
}

export function ptsInkAString(points: InkPoint[]): string {
  return points
    .map(
      (p) =>
        `${Math.round(p.x)},${Math.round(p.y)},${p.pressure.toFixed(2)},${p.time},${Math.round(p.tiltX)},${Math.round(p.tiltY)}`
    )
    .join(";")
}

export function ptsInkDesdeString(pts: string): InkPoint[] {
  if (!pts.trim()) return []
  if (!pts.includes(";") && pts.includes(" ")) {
    return ptsDesdeString(pts).map((p, i) => ({
      x: p.x,
      y: p.y,
      pressure: 0.5,
      time: i * 16,
      tiltX: 0,
      tiltY: 0,
    }))
  }
  return pts.split(";").map((par) => {
    const parts = par.split(",").map(Number)
    const [x, y, pr = 0.5, t = 0, tx = 0, ty = 0] = parts
    return { x, y, pressure: pr, time: t, tiltX: tx, tiltY: ty }
  })
}

export function strokeFirestoreAInk(trazo: TrazoPizarra): InkStroke {
  return {
    id: trazo.id,
    points: ptsInkDesdeString(trazo.pts),
    color: trazo.color,
    baseWidth: trazo.grosor,
    pagina: trazo.pagina,
    orden: trazo.orden,
    herramienta: trazo.herramienta,
    tipo: trazo.tipo,
  }
}

export function strokeInkAFirestore(
  stroke: Omit<InkStroke, "id" | "orden">
): Omit<TrazoPizarra, "id" | "orden"> {
  return {
    pts: ptsInkAString(stroke.points),
    color: stroke.color,
    grosor: stroke.baseWidth,
    herramienta: stroke.herramienta,
    tipo: stroke.tipo,
    pagina: stroke.pagina,
  }
}

function hexARgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]
}

function puntosAPixeles(points: InkPoint[], w: number, h: number, dpr: number) {
  return points.map((p) => {
    const { x, y } = desnormalizarPunto(p.x, p.y, w, h)
    return { x: x * dpr, y: y * dpr, pressure: p.pressure }
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

/** Grosor dinámico: baseWidth × pressure por punto. */
export function mallaDesdeStroke(
  stroke: Pick<InkStroke, "points" | "color" | "baseWidth" | "tipo" | "herramienta">,
  w: number,
  h: number,
  dpr: number
): MallaTinta | null {
  const { points, color, baseWidth, tipo, herramienta } = stroke
  if (points.length === 0) return null

  const escala = (w / 1000) * dpr * 2.4
  const pix = puntosAPixeles(points, w, h, dpr).map((p) => ({
    ...p,
    pressure: Math.min(1, Math.max(0.05, p.pressure)),
  }))
  const base = baseWidth * escala

  if (tipo === "subrayado" && points.length >= 2) {
    return mallaLibre([points[0], points[1]], color, baseWidth * 1.6, w, h, dpr)
  }

  if (pix.length === 1) {
    const r = Math.max(base * pix[0].pressure * 0.9, 2 * dpr)
    const segs = 20
    const verts: number[] = []
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2
      const a1 = ((i + 1) / segs) * Math.PI * 2
      verts.push(pix[0].x, pix[0].y)
      verts.push(pix[0].x + Math.cos(a0) * r, pix[0].y + Math.sin(a0) * r)
      verts.push(pix[0].x + Math.cos(a1) * r, pix[0].y + Math.sin(a1) * r)
    }
    return { vertices: new Float32Array(verts), color: hexARgba(color) }
  }

  const outline = getStroke(pix, {
    size: base,
    thinning: 0.72,
    smoothing: 0.62,
    streamline: 0.38,
    simulatePressure: false,
    easing: (t) => t,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  })

  const verts = trianguloAbanico(outline)
  if (verts.length === 0) return null
  return { vertices: verts, color: hexARgba(color) }
}

function mallaLibre(
  points: InkPoint[],
  color: string,
  baseWidth: number,
  w: number,
  h: number,
  dpr: number
): MallaTinta | null {
  return mallaDesdeStroke(
    { points, color, baseWidth, tipo: "trazo", herramienta: "lapiz" },
    w,
    h,
    dpr
  )
}

function puntoCercaEraser(p: InkPoint, eraser: InkPoint[], radio: number): boolean {
  for (const e of eraser) {
    if (Math.hypot(p.x - e.x, p.y - e.y) < radio) return true
  }
  return false
}

/** Borrador vectorial: divide trazos en segmentos A / B. */
export function borrarSegmentosInk(
  trazos: InkStroke[],
  eraserPoints: InkPoint[],
  eraserWidth: number
): {
  trazos: InkStroke[]
  eliminados: string[]
  agregados: InkStroke[]
  acciones: AccionPizarra[]
} {
  if (eraserPoints.length === 0) {
    return { trazos, eliminados: [], agregados: [], acciones: [] }
  }

  const radio = eraserWidth * 1.4
  const resultado: InkStroke[] = []
  const eliminados: string[] = []
  const agregados: InkStroke[] = []
  const acciones: AccionPizarra[] = []

  for (const trazo of trazos) {
    if (trazo.herramienta === "borrador") continue

    const vivos: InkPoint[][] = []
    let run: InkPoint[] = []

    for (const p of trazo.points) {
      if (puntoCercaEraser(p, eraserPoints, radio)) {
        if (run.length > 0) {
          vivos.push(run)
          run = []
        }
      } else {
        run.push(p)
      }
    }
    if (run.length > 0) vivos.push(run)

    if (vivos.length === 0) {
      eliminados.push(trazo.id)
      acciones.push({ tipo: "removeStroke", stroke: trazo })
      continue
    }

    if (vivos.length === 1 && vivos[0].length === trazo.points.length) {
      resultado.push(trazo)
      continue
    }

    eliminados.push(trazo.id)
    const nuevos: InkStroke[] = vivos.map((pts, i) => ({
      ...trazo,
      id: `${trazo.id}-s${i}-${Date.now()}`,
      points: pts,
      tipo: pts.length === 1 ? "punto" : "trazo",
    }))
    agregados.push(...nuevos)
    resultado.push(...nuevos)
    acciones.push({ tipo: "splitStroke", original: trazo, strokes: nuevos })
  }

  return { trazos: resultado, eliminados, agregados, acciones }
}

export function resolverStrokeInk(
  points: InkPoint[],
  herramienta: HerramientaPizarra,
  color: string,
  baseWidth: number,
  eraserWidth: number,
  pagina: number
): Omit<InkStroke, "id" | "orden"> | null {
  const ptsPlano = points.map(({ x, y }) => ({ x, y }))
  const res = resolverTrazoConGesto(ptsPlano, herramienta)
  if (res.tipo !== "punto" && points.length < 2) return null

  const esBorrador = herramienta === "borrador"
  const puntosFinales = esBorrador ? points : ptsInkDesdeString(res.pts)

  return {
    points: puntosFinales,
    color: esBorrador ? "#000000" : color,
    baseWidth: esBorrador ? eraserWidth : baseWidth,
    pagina,
    herramienta: esBorrador ? "borrador" : "lapiz",
    tipo: res.tipo,
  }
}

export class PilaUndoRedo {
  private undoStack: AccionPizarra[] = []
  private redoStack: AccionPizarra[] = []

  push(accion: AccionPizarra) {
    this.undoStack.push(accion)
    this.redoStack = []
  }

  puedeUndo() {
    return this.undoStack.length > 0
  }

  puedeRedo() {
    return this.redoStack.length > 0
  }

  undo(): AccionPizarra | null {
    const a = this.undoStack.pop()
    if (!a) return null
    this.redoStack.push(a)
    return a
  }

  redo(): AccionPizarra | null {
    const a = this.redoStack.pop()
    if (!a) return null
    this.undoStack.push(a)
    return a
  }

  limpiar() {
    this.undoStack = []
    this.redoStack = []
  }
}

/** Compatibilidad con nombres anteriores */
export type PuntoTinta = InkPoint
export type TrazoTinta = InkStroke & { puntos: InkPoint[]; grosor: number }

export function trazoFirestoreATinta(trazo: TrazoPizarra): TrazoTinta {
  const s = strokeFirestoreAInk(trazo)
  return { ...s, puntos: s.points, grosor: s.baseWidth }
}

export function trazoTintaAFirestore(trazo: Omit<TrazoTinta, "id" | "orden">) {
  return strokeInkAFirestore({
    points: trazo.puntos ?? trazo.points,
    color: trazo.color,
    baseWidth: trazo.grosor ?? trazo.baseWidth,
    pagina: trazo.pagina,
    herramienta: trazo.herramienta,
    tipo: trazo.tipo,
  })
}

export function mallaDesdeTrazo(trazo: TrazoTinta, w: number, h: number, dpr = 1): MallaTinta | null {
  return mallaDesdeStroke(
    {
      points: trazo.puntos ?? trazo.points,
      color: trazo.color,
      baseWidth: trazo.grosor ?? trazo.baseWidth,
      tipo: trazo.tipo,
      herramienta: trazo.herramienta,
    },
    w,
    h,
    dpr
  )
}

export const muestrearPuntero = (
  e: PointerEvent,
  rect: DOMRect,
  t0: number
): PuntoTinta => muestrearPunteroPen(e, rect, t0)

export const agregarPuntoTinta = agregarPuntoInk
export const predecirPuntosTinta = predecirPuntosInk
export const aplicarBorradoVectorial = (
  trazos: TrazoTinta[],
  borrador: PuntoTinta[],
  g: number
) => borrarSegmentosInk(trazos, borrador, g).trazos

export const resolverTrazoTinta = (
  puntos: PuntoTinta[],
  herramienta: HerramientaPizarra,
  color: string,
  grosor: number,
  grosorBorrador: number,
  pagina: number
) => resolverStrokeInk(puntos, herramienta, color, grosor, grosorBorrador, pagina)

export function esEntradaValidaPizarra(pointerType: string): boolean {
  return esEntradaPen(pointerType)
}

export { COLOR_FONDO_PIZARRA as BG }
