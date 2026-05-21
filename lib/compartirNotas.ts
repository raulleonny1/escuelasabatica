import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"
import { getPresenceDocId } from "./chat"
import { fechaDesdeIdComentario, type NotaClase } from "./comentarios"

export type PreferenciaCompartir = {
  presenceId: string
  nombre: string
  aceptaCompartir: boolean
}

function compartirCol(claseId: string) {
  return collection(db, "clases", normalizarCodigoClase(claseId), "compartirNotas")
}

function compartirDoc(claseId: string, presenceId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "compartirNotas", presenceId)
}

export function subscribePreferenciasCompartir(
  claseId: string,
  onData: (lista: PreferenciaCompartir[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  return onSnapshot(compartirCol(claseId), (snap) => {
    const lista: PreferenciaCompartir[] = []
    snap.forEach((d) => {
      const data = d.data()
      lista.push({
        presenceId: d.id,
        nombre: ((data.nombre as string) ?? "").trim(),
        aceptaCompartir: Boolean(data.aceptaCompartir),
      })
    })
    onData(lista)
  })
}

export function miPreferenciaCompartir(
  lista: PreferenciaCompartir[],
  nombre: string
): PreferenciaCompartir | null {
  const id = getPresenceDocId(nombre)
  return lista.find((p) => p.presenceId === id) ?? null
}

export async function guardarPreferenciaCompartir(
  claseId: string,
  nombre: string,
  aceptaCompartir: boolean
) {
  const presenceId = getPresenceDocId(nombre)
  await setDoc(compartirDoc(claseId, presenceId), {
    nombre: nombre.trim().slice(0, 32),
    aceptaCompartir,
    updatedAt: serverTimestamp(),
  })
}

export type NotaClaseEntrada = {
  fecha: string
  nota: NotaClase
}

/** Notas de otros participantes que aceptaron compartir. Requiere que tú también hayas aceptado. */
export function listarNotasCompartidasDelGrupo(
  notasClase: Record<string, NotaClase>,
  preferencias: PreferenciaCompartir[],
  miNombre: string,
  yoAceptoCompartir: boolean
): NotaClaseEntrada[] {
  if (!yoAceptoCompartir) return []

  const miClave = miNombre.trim().toLowerCase()
  const autoresQueComparten = new Set(
    preferencias
      .filter((p) => p.aceptaCompartir && p.nombre.trim())
      .map((p) => p.nombre.trim().toLowerCase())
  )

  return Object.entries(notasClase)
    .filter(([docId, nota]) => {
      if (!nota.texto?.trim()) return false
      const autor = (nota.autor ?? "").trim().toLowerCase()
      if (!autor || autor === miClave) return false
      return autoresQueComparten.has(autor)
    })
    .map(([docId, nota]) => ({ fecha: fechaDesdeIdComentario(docId), nota }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Comentarios de otros (que comparten) para un día concreto. */
export function comentariosOtrosEnFecha(
  notasClase: Record<string, NotaClase>,
  preferencias: PreferenciaCompartir[],
  miNombre: string,
  fecha: string,
  yoAceptoCompartir: boolean
): NotaClaseEntrada[] {
  return listarNotasCompartidasDelGrupo(
    notasClase,
    preferencias,
    miNombre,
    yoAceptoCompartir
  ).filter((e) => e.fecha === fecha)
}
