/** Orden canónico Reina-Valera 1909 (66 libros) */
export const LIBROS_RVR_1909 = [
  "Génesis",
  "Éxodo",
  "Levítico",
  "Números",
  "Deuteronomio",
  "Josué",
  "Jueces",
  "Rut",
  "1 Samuel",
  "2 Samuel",
  "1 Reyes",
  "2 Reyes",
  "1 Crónicas",
  "2 Crónicas",
  "Esdras",
  "Nehemías",
  "Esther",
  "Job",
  "Salmos",
  "Proverbios",
  "Ecclesiastés",
  "Canción de canciones",
  "Isaías",
  "Jeremías",
  "Lamentaciones",
  "Ezequiel",
  "Daniel",
  "Oseas",
  "Joel",
  "Amós",
  "Abdías",
  "Jonás",
  "Miqueas",
  "Nahum",
  "Habacuc",
  "Sofonías",
  "Haggeo",
  "Zacarías",
  "Malaquías",
  "Mateo",
  "Marcos",
  "Lucas",
  "Juan",
  "Hechos",
  "Romanos",
  "1 Corintios",
  "2 Corintios",
  "Gálatas",
  "Efesios",
  "Filipenses",
  "Colosenses",
  "1 Tesalonicenses",
  "2 Tesalonicenses",
  "1 Timoteo",
  "2 Timoteo",
  "Tito",
  "Filemón",
  "Hebreos",
  "Santiago",
  "1 Pedro",
  "2 Pedro",
  "1 Juan",
  "2 Juan",
  "3 Juan",
  "Judas",
  "Revelación",
] as const

export const ANTIGUO_TESTAMENTO = LIBROS_RVR_1909.slice(0, 39)
export const NUEVO_TESTAMENTO = LIBROS_RVR_1909.slice(39)

export type BibliaData = Record<string, Record<string, Record<string, string>>>

export type VersoJson = {
  book_name: string
  book: number
  chapter: number
  verse: number
  text: string
}

export function ordenarClavesNumericas(claves: string[]): string[] {
  return [...claves].sort((a, b) => Number(a) - Number(b))
}

export function ordenarLibros(libros: string[]): string[] {
  const indice = new Map<string, number>(LIBROS_RVR_1909.map((nombre, i) => [nombre, i]))
  return [...libros].sort((a, b) => {
    const ia = indice.get(a) ?? 999
    const ib = indice.get(b) ?? 999
    if (ia !== ib) return ia - ib
    return a.localeCompare(b, "es")
  })
}

export function construirBibliaDesdeVersos(verses: VersoJson[]): BibliaData {
  const estructura: BibliaData = {}
  for (const v of verses) {
    const cap = String(v.chapter)
    const vers = String(v.verse)
    if (!estructura[v.book_name]) estructura[v.book_name] = {}
    if (!estructura[v.book_name][cap]) estructura[v.book_name][cap] = {}
    estructura[v.book_name][cap][vers] = v.text
  }
  return estructura
}

export function contarVersiculos(biblia: BibliaData): number {
  let total = 0
  for (const libro of Object.values(biblia)) {
    for (const capitulo of Object.values(libro)) {
      total += Object.keys(capitulo).length
    }
  }
  return total
}
