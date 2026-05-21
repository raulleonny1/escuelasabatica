import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import { safeLocalGet, safeLocalRemove, safeLocalSet } from "./storage"

const CLASE_ID_KEY = "claseId"
const CLASE_NOMBRE_KEY = "claseNombre"

/** Sala compartida para quien estudia sin código de clase propio */
export const CLASE_INDEPENDIENTE_ID = "independiente"
export const CLASE_INDEPENDIENTE_NOMBRE = "Estudio personal"
export const ABRIR_MODAL_CLASE_EVENT = "abrir-modal-clase"

export function esModoIndependiente(claseId?: string): boolean {
  const id = claseId ?? leerClaseId()
  return normalizarCodigoClase(id) === CLASE_INDEPENDIENTE_ID
}

const PALABRAS = [
  "luz",
  "paz",
  "fe",
  "gozo",
  "vida",
  "amor",
  "ruta",
  "sol",
  "mar",
  "rio",
  "cielo",
  "esperanza",
]

/** Código seguro para rutas Firestore: mi-clase-2026 */
export function normalizarCodigoClase(codigo: string): string {
  const slug = codigo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  return slug || "clase-general"
}

export function generarCodigoClase(): string {
  const a = PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
  const b = PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
  const n = String(Math.floor(10 + Math.random() * 89))
  return normalizarCodigoClase(`${a}-${b}-${n}`)
}

export function leerClaseId(): string {
  return safeLocalGet(CLASE_ID_KEY)?.trim() ?? ""
}

export function leerClaseNombre(): string {
  return safeLocalGet(CLASE_NOMBRE_KEY)?.trim() ?? ""
}

export function salirDeClaseLocal() {
  safeLocalRemove(CLASE_ID_KEY)
  safeLocalRemove(CLASE_NOMBRE_KEY)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("clase-guardada"))
  }
}

export function guardarClaseLocal(claseId: string, nombreVisible: string) {
  safeLocalSet(CLASE_ID_KEY, normalizarCodigoClase(claseId))
  safeLocalSet(CLASE_NOMBRE_KEY, nombreVisible.trim().slice(0, 48))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("clase-guardada"))
  }
}

export function claseRef(claseId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId))
}

export async function registrarClase(claseId: string, nombreVisible: string) {
  const id = normalizarCodigoClase(claseId)
  const ref = doc(db, "clases", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre: nombreVisible.trim().slice(0, 48),
      codigo: id,
      createdAt: serverTimestamp(),
    })
  } else {
    await setDoc(
      ref,
      { nombre: nombreVisible.trim().slice(0, 48) },
      { merge: true }
    )
  }
  guardarClaseLocal(id, nombreVisible)
  return id
}

export async function unirseAClase(codigo: string, nombreVisible?: string) {
  const id = normalizarCodigoClase(codigo)
  const ref = doc(db, "clases", id)
  const snap = await getDoc(ref)
  const nombre =
    nombreVisible?.trim() ||
    (snap.exists() ? (snap.data().nombre as string) : "") ||
    id.replace(/-/g, " ")
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre: nombre.slice(0, 48),
      codigo: id,
      createdAt: serverTimestamp(),
    })
  }
  guardarClaseLocal(id, nombre)
  return { id, nombre }
}

export function formatoCodigoLegible(claseId: string): string {
  if (esModoIndependiente(claseId)) return ""
  return normalizarCodigoClase(claseId).toUpperCase().replace(/-/g, " ")
}

export function activarModoIndependiente() {
  guardarClaseLocal(CLASE_INDEPENDIENTE_ID, CLASE_INDEPENDIENTE_NOMBRE)
}

/** Crea la sala en Firestore si no existe (chat y notas en la nube para modo solo) */
export async function asegurarSalaIndependiente() {
  const id = CLASE_INDEPENDIENTE_ID
  const ref = doc(db, "clases", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre: CLASE_INDEPENDIENTE_NOMBRE,
      codigo: id,
      tipo: "sala-abierta",
      createdAt: serverTimestamp(),
    })
  }
  activarModoIndependiente()
  return id
}
