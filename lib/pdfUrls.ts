import { TOTAL_SEMANAS } from "@/lib/semana"

/** Semanas con lector de texto formateado (1–13). */
export const SEMANAS_CON_LECCION = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export type SemanaConLeccion = (typeof SEMANAS_CON_LECCION)[number]

export function semanaTieneLeccion(semana: number): boolean {
  return (SEMANAS_CON_LECCION as readonly number[]).includes(semana)
}

export function getPdfUrl(semana: number, tipo: string): string {
  const archivo = tipo === "leccion" ? "leccion" : tipo
  return `/pdfs/semana${semana}/${archivo}.pdf`
}

export { TOTAL_SEMANAS }
