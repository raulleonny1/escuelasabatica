import type { DiaLeccionCompleto } from "@/lib/leccionAuxiliar"
import { cargarSemanaCompletaDesdeRed } from "@/lib/leccionAuxiliar"
import { getPdfUrl, SEMANAS_CON_LECCION, semanaTieneLeccion } from "@/lib/pdfUrls"
import { guardarSemanaOffline, leerSemanaOffline } from "@/lib/offlineDb"
import { pdfEstaEnCache, precachePdfsSemana } from "@/lib/offlinePdf"
import { TOTAL_SEMANAS } from "@/lib/semana"
import { hayConexion } from "@/lib/syncCola"

function diasDesdeRegistro(registro: { dias: unknown } | null): DiaLeccionCompleto[] | null {
  if (!registro?.dias || !Array.isArray(registro.dias)) return null
  return registro.dias as DiaLeccionCompleto[]
}

/** Carga semana: caché local primero; actualiza en segundo plano si hay internet. */
export async function cargarSemanaConOffline(semana: number): Promise<DiaLeccionCompleto[]> {
  const guardada = await leerSemanaOffline(semana)
  const diasGuardados = diasDesdeRegistro(guardada)

  if (diasGuardados?.length) {
    if (hayConexion()) {
      void descargarSemanaParaOffline(semana).catch(() => {})
    }
    return diasGuardados
  }

  if (!hayConexion()) {
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

  if (semanaTieneLeccion(semana)) {
    const dias = await cargarSemanaCompletaDesdeRed(semana)
    await guardarSemanaOffline(semana, dias)
  }
}

/** Guarda en el dispositivo todas las semanas con lector de texto (8–13) y PDFs del trimestre. */
export async function descargarTrimestreParaOffline(
  onProgreso?: (hecho: number, total: number) => void
): Promise<void> {
  if (!hayConexion()) return

  const semanasTexto = [...SEMANAS_CON_LECCION]
  const semanasPdf = Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1).filter(
    (s) => !semanaTieneLeccion(s)
  )
  const total = semanasTexto.length + semanasPdf.length
  let hecho = 0

  for (const s of semanasTexto) {
    try {
      await descargarSemanaParaOffline(s)
    } catch {
      /* continuar con las demás */
    }
    hecho++
    onProgreso?.(hecho, total)
  }

  for (const s of semanasPdf) {
    try {
      await precachePdfsSemana(s)
    } catch {
      /* continuar */
    }
    hecho++
    onProgreso?.(hecho, total)
  }
}

export async function semanaDisponibleOffline(semana: number): Promise<boolean> {
  const guardada = await leerSemanaOffline(semana)
  if (diasDesdeRegistro(guardada)) return true
  const urls = ["leccion", "resumen", "preguntas"].map((t) => getPdfUrl(semana, t))
  const enCache = await Promise.all(urls.map((u) => pdfEstaEnCache(u)))
  return enCache.some(Boolean)
}
