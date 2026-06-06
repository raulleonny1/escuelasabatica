import type { DiaLeccionCompleto } from "@/lib/leccionAuxiliar"
import { cargarSemanaCompletaDesdeRed } from "@/lib/leccionAuxiliar"
import { getPdfUrl, semanaTieneLeccion } from "@/lib/pdfUrls"
import { guardarSemanaOffline, leerSemanaOffline } from "@/lib/offlineDb"
import { pdfEstaEnCache, precachePdfsSemana } from "@/lib/offlinePdf"
import { hayConexion } from "@/lib/syncCola"

function diasDesdeRegistro(registro: { dias: unknown } | null): DiaLeccionCompleto[] | null {
  if (!registro?.dias || !Array.isArray(registro.dias)) return null
  return registro.dias as DiaLeccionCompleto[]
}

/** Carga semana: red si hay internet; si no, IndexedDB. */
export async function cargarSemanaConOffline(semana: number): Promise<DiaLeccionCompleto[]> {
  const guardada = await leerSemanaOffline(semana)
  const diasGuardados = diasDesdeRegistro(guardada)

  if (!hayConexion()) {
    if (diasGuardados) return diasGuardados
    throw new Error(
      "Sin internet y esta semana no está descargada. Conéctate una vez para guardarla en el iPad."
    )
  }

  try {
    const dias = await cargarSemanaCompletaDesdeRed(semana)
    await guardarSemanaOffline(semana, dias)
    void precachePdfsSemana(semana)
    return dias
  } catch (err) {
    if (diasGuardados) return diasGuardados
    throw err instanceof Error ? err : new Error("No se pudo cargar la semana")
  }
}

/** Descarga PDFs + texto parseado para usar sin internet. */
export async function descargarSemanaParaOffline(semana: number): Promise<void> {
  if (!hayConexion()) {
    if (diasDesdeRegistro(await leerSemanaOffline(semana))) return
    throw new Error("Sin internet — no se puede descargar ahora")
  }

  const pdfs = semanaTieneLeccion(semana)
    ? ["leccion", "resumen", "preguntas", "visual"]
    : ["leccion", "resumen", "preguntas", "visual"]

  await precachePdfsSemana(semana, pdfs)

  const dias = await cargarSemanaCompletaDesdeRed(semana)
  await guardarSemanaOffline(semana, dias)
}

export async function semanaDisponibleOffline(semana: number): Promise<boolean> {
  const guardada = await leerSemanaOffline(semana)
  if (diasDesdeRegistro(guardada)) return true
  const urls = ["leccion", "resumen", "preguntas"].map((t) => getPdfUrl(semana, t))
  const enCache = await Promise.all(urls.map((u) => pdfEstaEnCache(u)))
  return enCache.some(Boolean)
}
