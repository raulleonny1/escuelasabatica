/** Acceso seguro a localStorage/sessionStorage (modo privado, bloqueos, SSR) */

export function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // ignorar
  }
}

export function safeLocalGet(key: string): string | null {
  if (typeof window === "undefined") return null
  return safeGetItem(window.localStorage, key)
}

export function safeLocalSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false
  return safeSetItem(window.localStorage, key, value)
}

export function safeLocalRemove(key: string): void {
  if (typeof window === "undefined") return
  safeRemoveItem(window.localStorage, key)
}

export function safeSessionGet(key: string): string | null {
  if (typeof window === "undefined") return null
  return safeGetItem(window.sessionStorage, key)
}

export function safeSessionSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false
  return safeSetItem(window.sessionStorage, key, value)
}

export function safeSessionRemove(key: string): void {
  if (typeof window === "undefined") return
  safeRemoveItem(window.sessionStorage, key)
}

export function nuevoIdSesion(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
