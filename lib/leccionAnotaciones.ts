const PREFIJO_HTML = "leccion-anot-html"

export type HerramientaLeccion =
  | "cursor"
  | "amarillo"
  | "verde"
  | "azul"
  | "rosa"
  | "negrilla"
  | "subrayar"
  | "borrador"
  | "borrar"

export const HERRAMIENTAS_RESALTE: {
  id: HerramientaLeccion
  titulo: string
  color?: string
}[] = [
  { id: "cursor", titulo: "Leer" },
  { id: "amarillo", titulo: "Amarillo", color: "#fef08a" },
  { id: "verde", titulo: "Verde", color: "#bbf7d0" },
  { id: "azul", titulo: "Azul", color: "#bfdbfe" },
  { id: "rosa", titulo: "Rosa", color: "#fbcfe8" },
  { id: "negrilla", titulo: "Negrilla" },
  { id: "subrayar", titulo: "Lápiz" },
  { id: "borrador", titulo: "Borrador" },
  { id: "borrar", titulo: "Quitar color" },
]

function clave(semana: number, fecha: string) {
  return `${semana}-${fecha}`
}

export function leerHtmlAnotado(semana: number, fecha: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(`${PREFIJO_HTML}-${clave(semana, fecha)}`)
}

export function guardarHtmlAnotado(semana: number, fecha: string, html: string) {
  if (typeof window === "undefined") return
  const key = `${PREFIJO_HTML}-${clave(semana, fecha)}`
  if (!html.trim()) localStorage.removeItem(key)
  else localStorage.setItem(key, html)
}

export function esHerramientaResalte(h: HerramientaLeccion): boolean {
  return h !== "cursor" && h !== "subrayar" && h !== "borrador"
}

export function esHerramientaTinta(h: HerramientaLeccion): boolean {
  return h === "subrayar" || h === "borrador"
}

/** Envuelve un rango en un elemento (resiste rangos parciales). */
export function envolverRango(tag: string, className: string, range: Range): boolean {
  const el = document.createElement(tag)
  if (className) el.className = className

  try {
    range.surroundContents(el)
  } catch {
    const fragmento = range.extractContents()
    el.appendChild(fragmento)
    range.insertNode(el)
  }

  return true
}

/** Quita marcas y negrillas dentro del rango. */
export function quitarResalteEnRango(range: Range, contenedor: Element): boolean {
  const marks = contenedor.querySelectorAll(
    "mark, strong.leccion-resalte-negrilla, u.leccion-resalte-subrayar"
  )
  let quitados = 0
  marks.forEach((node) => {
    if (!range.intersectsNode(node)) return
    const padre = node.parentNode
    if (!padre) return
    while (node.firstChild) padre.insertBefore(node.firstChild, node)
    padre.removeChild(node)
    quitados++
  })
  return quitados > 0
}

export function aplicarHerramientaEnRango(
  herramienta: HerramientaLeccion,
  range: Range,
  contenedor: Element
): boolean {
  if (herramienta === "cursor" || herramienta === "subrayar" || herramienta === "borrador") return false
  if (herramienta === "borrar") return quitarResalteEnRango(range, contenedor)
  if (herramienta === "negrilla") {
    return envolverRango("strong", "leccion-resalte-negrilla", range)
  }
  return envolverRango("mark", `leccion-resalte-${herramienta}`, range)
}

export function rangoDentroDe(contenedor: Element, range: Range): boolean {
  return (
    contenedor.contains(range.startContainer) &&
    contenedor.contains(range.endContainer)
  )
}

export function clonarRangoSeleccion(): Range | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  return sel.getRangeAt(0).cloneRange()
}

export function restaurarRango(range: Range) {
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
}

export function aplicarHerramienta(herramienta: HerramientaLeccion): boolean {
  const range = clonarRangoSeleccion()
  if (!range) return false
  const root = range.commonAncestorContainer
  const elemento =
    root.nodeType === Node.ELEMENT_NODE ? (root as Element) : root.parentElement
  const contenedor = elemento?.closest(".leccion-anotable")
  if (!contenedor) return false
  const ok = aplicarHerramientaEnRango(herramienta, range, contenedor)
  window.getSelection()?.removeAllRanges()
  return ok
}
