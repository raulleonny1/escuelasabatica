import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  getDocs,
  limit,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"

export type HerramientaPizarra = "lapiz" | "borrador"

export type TrazoPizarra = {
  id: string
  pts: string
  color: string
  grosor: number
  herramienta: HerramientaPizarra
  orden: number
}

export type EstadoPizarra = {
  abierta: boolean
  limpiarEn: number
  abiertaPor: string
  actualizadoMs: number
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
  onData: (trazos: TrazoPizarra[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }
  const q = query(trazosCol(claseId), orderBy("orden", "asc"), limit(500))
  return onSnapshot(q, (snap) => {
    const trazos = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        pts: (data.pts as string) ?? "",
        color: (data.color as string) ?? "#1e293b",
        grosor: (data.grosor as number) ?? 3,
        herramienta: (data.herramienta as HerramientaPizarra) ?? "lapiz",
        orden: (data.orden as number) ?? 0,
      }
    })
    onData(trazos)
  })
}

export async function publicarEstadoPizarra(
  claseId: string,
  maestroNombre: string,
  abierta: boolean,
  limpiarEn?: number
) {
  const payload: Record<string, unknown> = {
    abierta,
    abiertaPor: maestroNombre.trim().slice(0, 32),
    actualizadoAt: serverTimestamp(),
  }
  if (limpiarEn !== undefined) payload.limpiarEn = limpiarEn
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

export async function limpiarPizarra(claseId: string, maestroNombre: string) {
  const snap = await getDocs(trazosCol(claseId))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  const limpiarEn = Date.now()
  await publicarEstadoPizarra(claseId, maestroNombre, true, limpiarEn)
  return limpiarEn
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
