import {
  eliminarComentarioClase,
  guardarComentarioClase,
} from "@/lib/comentarios"
import {
  eliminarOperacionSync,
  encolarOperacionSync,
  leerColaSync,
  tamanoColaSync,
} from "@/lib/offlineDb"

export function hayConexion(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true
}

export async function encolarGuardarComentario(
  claseId: string,
  fecha: string,
  texto: string,
  autor: string,
  semana?: number
) {
  await encolarOperacionSync({
    tipo: "guardarComentario",
    claseId,
    fecha,
    autor,
    texto,
    semana,
  })
}

export async function encolarEliminarComentario(
  claseId: string,
  fecha: string,
  autor: string
) {
  await encolarOperacionSync({
    tipo: "eliminarComentario",
    claseId,
    fecha,
    autor,
  })
}

export async function procesarColaSync(): Promise<number> {
  if (!hayConexion()) return 0

  const ops = await leerColaSync()
  let sincronizados = 0

  for (const op of ops) {
    if (op.id == null) continue
    try {
      if (op.tipo === "guardarComentario") {
        await guardarComentarioClase(
          op.claseId,
          op.fecha,
          op.texto ?? "",
          op.autor,
          op.semana
        )
      } else {
        await eliminarComentarioClase(op.claseId, op.fecha, op.autor)
      }
      await eliminarOperacionSync(op.id)
      sincronizados++
    } catch {
      break
    }
  }

  return sincronizados
}

export async function pendientesSync(): Promise<number> {
  return tamanoColaSync()
}

export function iniciarSyncAutomatica(onSync?: (n: number) => void) {
  const intentar = () => {
    void procesarColaSync().then((n) => {
      if (n > 0) onSync?.(n)
    })
  }

  intentar()

  if (typeof window === "undefined") return () => {}

  window.addEventListener("online", intentar)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") intentar()
  })

  const intervalo = window.setInterval(intentar, 60_000)

  return () => {
    window.removeEventListener("online", intentar)
    window.clearInterval(intervalo)
  }
}
