const CACHE_PDFS = "escuelasabatica-pdfs-v1"
const CACHE_WORKBOX = "escuelasabatica-pdfs"

/** Misma URL que usa fetch / Workbox (origen + ruta). */
export function urlPdfAbsoluta(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url
  }
  if (typeof window !== "undefined") {
    return new URL(url, window.location.origin).href
  }
  return url
}

async function buscarEnCache(cache: Cache, url: string): Promise<Response | undefined> {
  const abs = urlPdfAbsoluta(url)
  const hit = (await cache.match(abs)) ?? (await cache.match(url))
  return hit ?? undefined
}

export async function abrirCachePdfs(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null
  try {
    return await caches.open(CACHE_PDFS)
  } catch {
    return null
  }
}

async function abrirCacheWorkbox(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null
  try {
    return await caches.open(CACHE_WORKBOX)
  } catch {
    return null
  }
}

export async function pdfEstaEnCache(url: string): Promise<boolean> {
  const abs = urlPdfAbsoluta(url)
  const manual = await abrirCachePdfs()
  if (manual && (await buscarEnCache(manual, abs))) return true
  const wb = await abrirCacheWorkbox()
  if (wb && (await buscarEnCache(wb, abs))) return true
  return false
}

/** Guarda un PDF en Cache API (para uso sin internet). */
export async function guardarPdfEnCache(url: string): Promise<boolean> {
  if (typeof fetch === "undefined") return false
  const abs = urlPdfAbsoluta(url)
  try {
    const res = await fetch(abs)
    if (!res.ok) return false
    const cache = await abrirCachePdfs()
    if (!cache) return false
    await cache.put(abs, res.clone())
    return true
  } catch {
    return false
  }
}

/** URL lista para pdf.js: blob local si está en caché, si no la URL original. */
export async function resolverUrlPdf(url: string): Promise<string> {
  const abs = urlPdfAbsoluta(url)
  const manual = await abrirCachePdfs()
  if (manual) {
    const hit = await buscarEnCache(manual, abs)
    if (hit) {
      try {
        return URL.createObjectURL(await hit.blob())
      } catch {
        /* siguiente caché */
      }
    }
  }
  const wb = await abrirCacheWorkbox()
  if (wb) {
    const hit = await buscarEnCache(wb, abs)
    if (hit) {
      try {
        return URL.createObjectURL(await hit.blob())
      } catch {
        /* red */
      }
    }
  }
  return abs
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
