const CACHE_PDFS = "escuelasabatica-pdfs-v1"

export async function abrirCachePdfs(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null
  try {
    return await caches.open(CACHE_PDFS)
  } catch {
    return null
  }
}

export async function pdfEstaEnCache(url: string): Promise<boolean> {
  const cache = await abrirCachePdfs()
  if (!cache) return false
  const hit = await cache.match(url)
  return !!hit
}

/** Guarda un PDF en Cache API (para uso sin internet). */
export async function guardarPdfEnCache(url: string): Promise<boolean> {
  if (typeof fetch === "undefined") return false
  try {
    const res = await fetch(url, { cache: "force-cache" })
    if (!res.ok) return false
    const cache = await abrirCachePdfs()
    if (!cache) return false
    await cache.put(url, res.clone())
    return true
  } catch {
    return false
  }
}

/** URL lista para pdf.js: blob local si está en caché, si no la URL original. */
export async function resolverUrlPdf(url: string): Promise<string> {
  const cache = await abrirCachePdfs()
  if (!cache) return url
  try {
    const hit = await cache.match(url)
    if (!hit) return url
    const blob = await hit.blob()
    return URL.createObjectURL(blob)
  } catch {
    return url
  }
}

export function revocarUrlPdfBlob(src: string) {
  if (src.startsWith("blob:")) URL.revokeObjectURL(src)
}

export async function precachePdfsSemana(
  semana: number,
  tipos: string[] = ["leccion", "resumen", "preguntas", "visual"]
): Promise<number> {
  let ok = 0
  await Promise.all(
    tipos.map(async (tipo) => {
      const archivo = tipo === "leccion" ? "leccion" : tipo
      const url = `/pdfs/semana${semana}/${archivo}.pdf`
      if (await guardarPdfEnCache(url)) ok++
    })
  )
  return ok
}
