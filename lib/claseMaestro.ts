import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { CLASE_INDEPENDIENTE_ID, normalizarCodigoClase } from "./clase"
import { fechaLocalHoy } from "./semana"

export type DatosClaseMaestro = {
  nombre: string
  codigo: string
  maestroNombre: string
  alumnos: string[]
}

export type RegistroAsistencia = {
  fecha: string
  presentes: string[]
  registradoPor: string
  updatedAt: Date | null
}

function claseDoc(claseId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId))
}

function asistenciaDoc(claseId: string, fecha: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "asistencia", fecha)
}

export async function crearSalaMaestro(
  maestroNombre: string,
  nombreClase: string,
  codigo: string,
  alumnos: string[]
): Promise<{ id: string; nombre: string }> {
  const id = normalizarCodigoClase(codigo)
  const lista = alumnos
    .map((a) => a.trim().slice(0, 32))
    .filter(Boolean)
    .filter((a, i, arr) => arr.findIndex((x) => x.toLowerCase() === a.toLowerCase()) === i)

  await setDoc(claseDoc(id), {
    nombre: nombreClase.trim().slice(0, 48),
    codigo: id,
    maestroNombre: maestroNombre.trim().slice(0, 32),
    alumnos: lista,
    tipo: "clase-privada",
    createdAt: serverTimestamp(),
  })

  return { id, nombre: nombreClase.trim() }
}

/** Vuelve a entrar a una sala que el maestro ya creó (mismo código en Firestore). */
export async function entrarSalaMaestroExistente(
  maestroNombre: string,
  codigo: string
): Promise<{ id: string; nombre: string }> {
  const id = normalizarCodigoClase(codigo)
  if (!id || id === CLASE_INDEPENDIENTE_ID) {
    throw new Error("Código no válido.")
  }

  const snap = await getDoc(claseDoc(id))
  if (!snap.exists()) {
    throw new Error("No existe una sala con ese código. Verifica o crea una nueva.")
  }

  const d = snap.data()
  const nombre = ((d.nombre as string) ?? "").trim() || id.replace(/-/g, " ")

  await setDoc(
    claseDoc(id),
    {
      maestroNombre: maestroNombre.trim().slice(0, 32),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return { id, nombre }
}

export function subscribeDatosClase(
  claseId: string,
  onData: (datos: DatosClaseMaestro | null) => void
): Unsubscribe {
  if (!claseId) {
    onData(null)
    return () => {}
  }

  return onSnapshot(claseDoc(claseId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    const d = snap.data()
    onData({
      nombre: (d.nombre as string) ?? "",
      codigo: (d.codigo as string) ?? claseId,
      maestroNombre: (d.maestroNombre as string) ?? "",
      alumnos: Array.isArray(d.alumnos) ? (d.alumnos as string[]) : [],
    })
  })
}

export async function actualizarListaAlumnos(claseId: string, alumnos: string[]) {
  const lista = alumnos
    .map((a) => a.trim().slice(0, 32))
    .filter(Boolean)
    .filter((a, i, arr) => arr.findIndex((x) => x.toLowerCase() === a.toLowerCase()) === i)

  await setDoc(
    claseDoc(claseId),
    { alumnos: lista, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

export async function guardarAsistencia(
  claseId: string,
  fecha: string,
  presentes: string[],
  registradoPor: string
) {
  const unicos = presentes
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p, i, arr) => arr.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === i)

  await setDoc(asistenciaDoc(claseId, fecha), {
    fecha,
    presentes: unicos,
    registradoPor: registradoPor.trim().slice(0, 32),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeAsistencia(
  claseId: string,
  fecha: string,
  onData: (registro: RegistroAsistencia | null) => void
): Unsubscribe {
  if (!claseId || !fecha) {
    onData(null)
    return () => {}
  }

  return onSnapshot(asistenciaDoc(claseId, fecha), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    const d = snap.data()
    const ts = d.updatedAt as { toDate?: () => Date } | undefined
    onData({
      fecha: (d.fecha as string) ?? fecha,
      presentes: Array.isArray(d.presentes) ? (d.presentes as string[]) : [],
      registradoPor: (d.registradoPor as string) ?? "",
      updatedAt: ts?.toDate?.() ?? null,
    })
  })
}

export function fechaAsistenciaHoy(): string {
  return fechaLocalHoy()
}
