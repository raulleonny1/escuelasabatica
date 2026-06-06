import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"

export type HerramientaPizarra = "lapiz" | "borrador" | "subrayar" | "encerrar"
export type TipoTrazo = "trazo" | "subrayado" | "circulo" | "rectangulo" | "punto"

export type TrazoPizarra = {
  id: string
  pts: string
  color: string
  grosor: number
  herramienta: HerramientaPizarra
  tipo: TipoTrazo
  pagina: number
  orden: number
}

export type EstadoPizarra = {
  abierta: boolean
  limpiarEn: number
  abiertaPor: string
  actualizadoMs: number
  paginaActual: number
  totalPaginas: number
}

function claseNorm(claseId: string) {
  return normalizarCodigoClase(claseId)
}

function estadoRef(claseId: string) {
  return doc(db, "clases", claseNorm(claseId), "pizarra", "estado")
}

function trazosCol(claseId: string) {
  return collection(db, "clases", claseNorm(claseId), "pizarraTrazos")
}

function mapEstado(data: Record<string, unknown>): EstadoPizarra {
  const ts = data.actualizadoAt as { toMillis?: () => number } | undefined
  return {
    abierta: data.abierta === true,
    limpiarEn: (data.limpiarEn as number) ?? 0,
    abiertaPor: (data.abiertaPor as string) ?? "",
    actualizadoMs: ts?.toMillis?.() ?? 0,
    paginaActual: (data.paginaActual as number) ?? 0,
    totalPaginas: Math.max(1, (data.totalPaginas as number) ?? 1),
  }
}

export function subscribeEstadoPizarra(
  claseId: string,
  onData: (estado: EstadoPizarra | null) => void
): Unsubscribe {
  if (!claseId) {
    onData(null)
    return () => {}
  }
  return onSnapshot(estadoRef(claseId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(mapEstado(snap.data()))
  })
}

export function subscribeTrazosPizarra(
  claseId: string,
  pagina: number,
  onData: (trazos: TrazoPizarra[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }
  const q = query(trazosCol(claseId), orderBy("orden", "asc"), limit(500))
  return onSnapshot(q, (snap) => {
    const trazos = snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          pts: (data.pts as string) ?? "",
          color: (data.color as string) ?? "#1e293b",
          grosor: (data.grosor as number) ?? 3,
          herramienta: (data.herramienta as HerramientaPizarra) ?? "lapiz",
          tipo: (data.tipo as TipoTrazo) ?? "trazo",
          pagina: (data.pagina as number) ?? 0,
          orden: (data.orden as number) ?? 0,
        }
      })
      .filter((t) => t.pagina === pagina)
    onData(trazos)
  })
}

export async function pulsoPizarraActiva(claseId: string, maestroNombre: string) {
  await publicarEstadoPizarra(claseId, maestroNombre, true)
}

export async function publicarEstadoPizarra(
  claseId: string,
  maestroNombre: string,
  abierta: boolean,
  extras?: { limpiarEn?: number; paginaActual?: number; totalPaginas?: number }
) {
  const payload: Record<string, unknown> = {
    abierta,
    abiertaPor: maestroNombre.trim().slice(0, 32),
    actualizadoAt: serverTimestamp(),
  }
  if (extras?.limpiarEn !== undefined) payload.limpiarEn = extras.limpiarEn
  if (extras?.paginaActual !== undefined) payload.paginaActual = extras.paginaActual
  if (extras?.totalPaginas !== undefined) payload.totalPaginas = extras.totalPaginas
  await setDoc(estadoRef(claseId), payload, { merge: true })
}

let ordenTrazo = 0

export async function guardarTrazoPizarra(
  claseId: string,
  trazo: Omit<TrazoPizarra, "id" | "orden">
) {
  ordenTrazo += 1
  const id = `t-${Date.now()}-${ordenTrazo}`
  await setDoc(doc(trazosCol(claseId), id), {
    ...trazo,
    orden: Date.now(),
  })
}

export async function eliminarTrazosPizarra(claseId: string, ids: string[]) {
  if (!ids.length) return
  const batch = writeBatch(db)
  ids.forEach((id) => batch.delete(doc(trazosCol(claseId), id)))
  await batch.commit()
}

export async function limpiarPaginaPizarra(
  claseId: string,
  maestroNombre: string,
  pagina: number
) {
  const snap = await getDocs(trazosCol(claseId))
  const batch = writeBatch(db)
  let hay = false
  snap.docs.forEach((d) => {
    const p = (d.data().pagina as number | undefined) ?? 0
    if (p === pagina) {
      batch.delete(d.ref)
      hay = true
    }
  })
  if (hay) await batch.commit()
  const limpiarEn = Date.now()
  await publicarEstadoPizarra(claseId, maestroNombre, true, { limpiarEn })
  return limpiarEn
}

/** @deprecated Usar limpiarPaginaPizarra */
export async function limpiarPizarra(claseId: string, maestroNombre: string) {
  return limpiarPaginaPizarra(claseId, maestroNombre, 0)
}

export async function cambiarPaginaPizarra(
  claseId: string,
  maestroNombre: string,
  pagina: number
) {
  await publicarEstadoPizarra(claseId, maestroNombre, true, { paginaActual: pagina })
}

export async function nuevaPaginaPizarra(claseId: string, maestroNombre: string) {
  const snap = await getDoc(estadoRef(claseId))
  const data = snap.exists() ? snap.data() : {}
  const total = Math.max(1, ((data.totalPaginas as number) ?? 1) + 1)
  const nueva = total - 1
  await publicarEstadoPizarra(claseId, maestroNombre, true, {
    paginaActual: nueva,
    totalPaginas: total,
  })
  return { pagina: nueva, total }
}

/** Convierte coordenadas de píxel a enteros 0–1000 (responsive entre dispositivos). */
export function normalizarPunto(x: number, y: number, w: number, h: number) {
  return {
    x: Math.round((x / w) * 1000),
    y: Math.round((y / h) * 1000),
  }
}

export function desnormalizarPunto(x: number, y: number, w: number, h: number) {
  return { x: (x / 1000) * w, y: (y / 1000) * h }
}

/** Coordenadas precisas mientras se dibuja (touch); se redondean al guardar. */
export function normalizarPuntoFino(x: number, y: number, w: number, h: number) {
  return { x: (x / w) * 1000, y: (y / h) * 1000 }
}

export function ptsAString(points: { x: number; y: number }[]) {
  return points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ")
}

export function ptsDesdeString(pts: string): { x: number; y: number }[] {
  if (!pts.trim()) return []
  return pts.split(" ").map((par) => {
    const [xs, ys] = par.split(",")
    return { x: Number(xs), y: Number(ys) }
  })
}

function bboxPts(pts: { x: number; y: number }[]) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

function trazoCerrado(
  pts: { x: number; y: number }[],
  width: number,
  height: number
): boolean {
  const first = pts[0]
  const last = pts[pts.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) < Math.max(width, height) * 0.35
}

function margenEsquina(width: number, height: number): number {
  return Math.max(10, Math.min(width, height) * 0.12)
}

/** Cuántas esquinas del bbox visitó el trazo (0–4). */
function esquinasVisitadas(
  pts: { x: number; y: number }[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  margin: number
): number {
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
  let visitadas = 0
  for (const c of corners) {
    if (pts.some((p) => Math.hypot(p.x - c.x, p.y - c.y) <= margin)) visitadas++
  }
  return visitadas
}

/** Baja = trazo redondo; alta = trazo con esquinas. */
function variacionRadial(
  pts: { x: number; y: number }[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): number {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const radios = pts.map((p) => Math.hypot(p.x - cx, p.y - cy))
  const media = radios.reduce((a, r) => a + r, 0) / radios.length
  if (media < 1) return 1
  const varianza = radios.reduce((a, r) => a + (r - media) ** 2, 0) / radios.length
  return Math.sqrt(varianza) / media
}

/** Círculo: puntos repartidos en casi todos los sectores; cuadrado: huecos. */
function angulosBienRepartidos(
  pts: { x: number; y: number }[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const sectores = new Array(8).fill(false)
  for (const p of pts) {
    const a = Math.atan2(p.y - cy, p.x - cx)
    const bin = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 8) % 8
    sectores[bin] = true
  }
  return sectores.filter(Boolean).length >= 6
}

/** Rectángulo: muchos tramos horizontales o verticales. */
function fraccionTramosRectos(pts: { x: number; y: number }[]): number {
  if (pts.length < 4) return 0
  let rectos = 0
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    if (Math.hypot(dx, dy) < 4) continue
    total++
    const horizontal = Math.abs(dy) <= Math.abs(dx) * 0.35
    const vertical = Math.abs(dx) <= Math.abs(dy) * 0.35
    if (horizontal || vertical) rectos++
  }
  return total > 0 ? rectos / total : 0
}

function puntajesFormaCerrada(
  pts: { x: number; y: number }[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { circulo: number; rectangulo: number } {
  const width = maxX - minX
  const height = maxY - minY
  const marginEsquina = margenEsquina(width, height)
  const esquinas = esquinasVisitadas(pts, minX, maxX, minY, maxY, marginEsquina)
  const variacion = variacionRadial(pts, minX, maxX, minY, maxY)
  const tramosRectos = fraccionTramosRectos(pts)
  const angulosOk = angulosBienRepartidos(pts, minX, maxX, minY, maxY)

  let circulo = 0
  let rectangulo = 0

  // Rectángulo: necesita esquinas claras o lados rectos
  if (esquinas >= 4) rectangulo += 4
  else if (esquinas >= 3) rectangulo += 3
  else if (esquinas === 2 && tramosRectos >= 0.45) rectangulo += 2

  if (tramosRectos >= 0.55) rectangulo += 2
  else if (tramosRectos >= 0.42 && esquinas >= 2) rectangulo += 1

  // Círculo: sin esquinas, trazo redondo, ángulos repartidos
  if (esquinas === 0) circulo += 3
  else if (esquinas === 1) circulo += 1

  if (variacion < 0.11) circulo += 3
  else if (variacion < 0.14) circulo += 2
  else if (variacion < 0.17) circulo += 1

  if (angulosOk) circulo += 2

  if (tramosRectos >= 0.38) circulo -= 2
  if (esquinas >= 2) circulo -= esquinas

  return { circulo, rectangulo }
}

/** Solo devuelve forma si hay confianza clara; si no, null (trazo libre). */
function detectarFormaCerrada(
  pts: { x: number; y: number }[]
): "circulo" | "rectangulo" | null {
  const { minX, maxX, minY, maxY } = bboxPts(pts)
  const width = maxX - minX
  const height = maxY - minY
  if (width < 20 || height < 20) return null
  if (!trazoCerrado(pts, width, height)) return null

  const { circulo, rectangulo } = puntajesFormaCerrada(pts, minX, maxX, minY, maxY)

  if (rectangulo >= 3 && rectangulo > circulo + 1) return "rectangulo"
  if (circulo >= 4 && circulo > rectangulo + 1) return "circulo"

  return null
}

/** Detecta subrayado, círculo, rectángulo o trazo libre. */
export function detectarGestoPizarra(pts: { x: number; y: number }[]): TipoTrazo {
  if (pts.length < 4) return "trazo"

  const { minX, maxX, minY, maxY } = bboxPts(pts)
  const width = maxX - minX
  const height = maxY - minY
  if (width < 15 && height < 15) return "trazo"

  // Subrayar: línea horizontal abierta
  if (width > height * 2 && width > 35) {
    const ySpread = maxY - minY
    if (ySpread < width * 0.3 && !trazoCerrado(pts, width, height)) return "subrayado"
  }

  const forma = detectarFormaCerrada(pts)
  if (forma === "circulo") return "circulo"
  if (forma === "rectangulo") return "rectangulo"

  return "trazo"
}

export function ptsParaSubrayado(pts: { x: number; y: number }[]) {
  const { minX, maxX, maxY } = bboxPts(pts)
  const y = maxY + 4
  return [
    { x: minX, y },
    { x: maxX, y },
  ]
}

export function ptsParaCirculo(pts: { x: number; y: number }[]) {
  const { minX, maxX, minY, maxY } = bboxPts(pts)
  const pad = 6
  return [
    { x: minX - pad, y: minY - pad },
    { x: maxX + pad, y: maxY + pad },
  ]
}

export function ptsParaRectangulo(pts: { x: number; y: number }[]) {
  const { minX, maxX, minY, maxY } = bboxPts(pts)
  const pad = 4
  return [
    { x: minX - pad, y: minY - pad },
    { x: maxX + pad, y: maxY + pad },
  ]
}

/** Trazo muy corto = toque para marcar un punto. */
export function esTrazoPunto(pts: { x: number; y: number }[]): boolean {
  if (pts.length <= 1) return true
  const { minX, maxX, minY, maxY } = bboxPts(pts)
  return maxX - minX < 14 && maxY - minY < 14
}

export function ptsParaPunto(pts: { x: number; y: number }[]) {
  return [pts[0]]
}

export function resolverTrazoConGesto(
  pts: { x: number; y: number }[],
  herramienta: HerramientaPizarra
): { pts: string; tipo: TipoTrazo } {
  if (
    (herramienta === "lapiz" || herramienta === "borrador") &&
    esTrazoPunto(pts)
  ) {
    return { pts: ptsAString(ptsParaPunto(pts)), tipo: "punto" }
  }
  if (herramienta === "subrayar") {
    return { pts: ptsAString(ptsParaSubrayado(pts)), tipo: "subrayado" }
  }
  if (herramienta === "encerrar") {
    const forma = detectarFormaCerrada(pts)
    if (forma === "rectangulo") {
      return { pts: ptsAString(ptsParaRectangulo(pts)), tipo: "rectangulo" }
    }
    // Encerrar: círculo por defecto si no es claramente rectángulo
    return { pts: ptsAString(ptsParaCirculo(pts)), tipo: "circulo" }
  }
  if (herramienta === "borrador") {
    return { pts: ptsAString(pts), tipo: "trazo" }
  }
  if (herramienta === "lapiz") {
    if (esTrazoPunto(pts)) {
      return { pts: ptsAString(ptsParaPunto(pts)), tipo: "punto" }
    }
    return { pts: ptsAString(pts), tipo: "trazo" }
  }

  return { pts: ptsAString(pts), tipo: "trazo" }
}
