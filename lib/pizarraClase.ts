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
export type TipoTrazo = "trazo" | "subrayado" | "circulo"

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

export function ptsAString(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ")
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

/** Detecta si un trazo libre parece subrayado o un círculo de encerrado. */
export function detectarGestoPizarra(pts: { x: number; y: number }[]): TipoTrazo {
  if (pts.length < 4) return "trazo"

  const { minX, maxX, minY, maxY } = bboxPts(pts)
  const width = maxX - minX
  const height = maxY - minY
  if (width < 15 && height < 15) return "trazo"

  const first = pts[0]
  const last = pts[pts.length - 1]
  const distStartEnd = Math.hypot(first.x - last.x, first.y - last.y)

  // Encerrar: trazo cerrado con forma más o menos ovalada
  if (
    width > 25 &&
    height > 25 &&
    distStartEnd < Math.max(width, height) * 0.4 &&
    width / height > 0.35 &&
    width / height < 2.8
  ) {
    return "circulo"
  }

  // Subrayar: trazo horizontal y plano
  if (width > height * 2 && width > 35) {
    const ySpread = maxY - minY
    if (ySpread < width * 0.3) return "subrayado"
  }

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

export function resolverTrazoConGesto(
  pts: { x: number; y: number }[],
  herramienta: HerramientaPizarra
): { pts: string; tipo: TipoTrazo } {
  if (herramienta === "subrayar") {
    return { pts: ptsAString(ptsParaSubrayado(pts)), tipo: "subrayado" }
  }
  if (herramienta === "encerrar") {
    return { pts: ptsAString(ptsParaCirculo(pts)), tipo: "circulo" }
  }
  if (herramienta === "borrador") {
    return { pts: ptsAString(pts), tipo: "trazo" }
  }

  const tipo = detectarGestoPizarra(pts)
  if (tipo === "subrayado") {
    return { pts: ptsAString(ptsParaSubrayado(pts)), tipo: "subrayado" }
  }
  if (tipo === "circulo") {
    return { pts: ptsAString(ptsParaCirculo(pts)), tipo: "circulo" }
  }
  return { pts: ptsAString(pts), tipo: "trazo" }
}
