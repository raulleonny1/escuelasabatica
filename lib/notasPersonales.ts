import { safeLocalGet, safeLocalSet } from "./storage"
import { normalizarCodigoClase } from "./clase"

function storageKey(claseId: string) {
  return `notasPersonales_${normalizarCodigoClase(claseId)}`
}

export function leerNotasPersonales(claseId: string): Record<string, string> {
  const raw = safeLocalGet(storageKey(claseId))
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

export function guardarNotaPersonal(claseId: string, fecha: string, texto: string) {
  const data = leerNotasPersonales(claseId)
  const limpio = texto.trim()
  if (!limpio) {
    delete data[fecha]
  } else {
    data[fecha] = limpio
  }
  safeLocalSet(storageKey(claseId), JSON.stringify(data))
  return data
}

export function eliminarNotaPersonal(claseId: string, fecha: string) {
  const data = leerNotasPersonales(claseId)
  delete data[fecha]
  safeLocalSet(storageKey(claseId), JSON.stringify(data))
  return data
}
