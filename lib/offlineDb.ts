const DB_NAME = "escuelasabatica-offline"
const DB_VERSION = 1

export type SyncOp = {
  id?: number
  tipo: "guardarComentario" | "eliminarComentario"
  claseId: string
  fecha: string
  autor: string
  texto?: string
  semana?: number
  createdAt: number
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"))
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("semanas")) {
        db.createObjectStore("semanas", { keyPath: "semana" })
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir IndexedDB"))
  })
}

function txStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error(`Error en ${storeName}`))
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error ?? new Error(`Transacción ${storeName}`))
      })
  )
}

export type SemanaOffline = {
  semana: number
  dias: unknown
  descargadoEn: number
}

export async function leerSemanaOffline(semana: number): Promise<SemanaOffline | null> {
  try {
    return (await txStore<SemanaOffline | undefined>("semanas", "readonly", (s) =>
      s.get(semana)
    )) ?? null
  } catch {
    return null
  }
}

export async function guardarSemanaOffline(semana: number, dias: unknown) {
  const registro: SemanaOffline = {
    semana,
    dias,
    descargadoEn: Date.now(),
  }
  await txStore("semanas", "readwrite", (s) => s.put(registro))
}

export async function listarSemanasOffline(): Promise<number[]> {
  try {
    const rows = await txStore<SemanaOffline[]>("semanas", "readonly", (s) => s.getAll())
    return rows.map((r) => r.semana).sort((a, b) => a - b)
  } catch {
    return []
  }
}

export async function encolarOperacionSync(
  op: Omit<SyncOp, "id" | "createdAt">
): Promise<void> {
  const registro: SyncOp = { ...op, createdAt: Date.now() }
  await txStore("syncQueue", "readwrite", (s) => s.add(registro))
}

export async function leerColaSync(): Promise<SyncOp[]> {
  try {
    const ops = await txStore<SyncOp[]>("syncQueue", "readonly", (s) => s.getAll())
    return ops.sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    return []
  }
}

export async function eliminarOperacionSync(id: number) {
  await txStore("syncQueue", "readwrite", (s) => s.delete(id))
}

export async function tamanoColaSync(): Promise<number> {
  const ops = await leerColaSync()
  return ops.length
}
