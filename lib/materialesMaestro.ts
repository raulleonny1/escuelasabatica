export type MaterialMaestro = {
  id: string
  categoria: string
  titulo: string
  descripcion?: string
  archivo?: string
  url?: string
}

type Manifest = {
  version?: number
  items: MaterialMaestro[]
}

const MANIFEST_URL = "/materiales-maestro/manifest.json"

export async function cargarMaterialesMaestro(): Promise<MaterialMaestro[]> {
  const res = await fetch(MANIFEST_URL, { cache: "no-store" })
  if (!res.ok) return []
  const data = (await res.json()) as Manifest
  if (!Array.isArray(data.items)) return []
  return data.items.filter((item) => item.id && item.titulo && item.categoria)
}

export function agruparPorCategoria(items: MaterialMaestro[]): Record<string, MaterialMaestro[]> {
  const map: Record<string, MaterialMaestro[]> = {}
  for (const item of items) {
    if (!map[item.categoria]) map[item.categoria] = []
    map[item.categoria].push(item)
  }
  return map
}

export function urlMaterial(item: MaterialMaestro): string | null {
  if (item.url?.trim()) return item.url.trim()
  if (item.archivo?.trim()) return item.archivo.trim()
  return null
}
