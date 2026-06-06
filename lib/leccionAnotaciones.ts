const PREFIJO_HTML = "leccion-anot-html"

export type HerramientaLeccion =
  | "cursor"
  | "amarillo"
  | "verde"
  | "azul"
  | "rosa"
  | "negrilla"
  | "subrayar"
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
  { id: "subrayar", titulo: "Subrayar" },
  { id: "borrar", titulo: "Quitar" },
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

/** Envuelve la selección actual en un elemento (resiste rangos parciales). */
export function envolverSeleccion(tag: string, className: string): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false

  const range = sel.getRangeAt(0)
  const el = document.createElement(tag)
  if (className) el.className = className

  try {
    range.surroundContents(el)
  } catch {
    const fragmento = range.extractContents()
    el.appendChild(fragmento)
    range.insertNode(el)
  }

  sel.removeAllRanges()
  return true
}

/** Quita marcas y negrillas dentro del rango seleccionado. */
export function quitarResalteSeleccion(): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false

  const range = sel.getRangeAt(0)
  const root = range.commonAncestorContainer
  const elemento =
    root.nodeType === Node.ELEMENT_NODE
      ? (root as Element)
      : root.parentElement
  if (!elemento) return false

  const contenedor = elemento.closest(".leccion-anotable")
  if (!contenedor) return false

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

  sel.removeAllRanges()
  return quitados > 0
}

export function aplicarHerramienta(herramienta: HerramientaLeccion): boolean {
  if (herramienta === "cursor") return false
  if (herramienta === "borrar") return quitarResalteSeleccion()
  if (herramienta === "negrilla") {
    return envolverSeleccion("strong", "leccion-resalte-negrilla")
  }
  if (herramienta === "subrayar") {
    return envolverSeleccion("u", "leccion-resalte-subrayar")
  }
  return envolverSeleccion("mark", `leccion-resalte-${herramienta}`)
}
