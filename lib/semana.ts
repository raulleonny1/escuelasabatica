/** Sábado de inicio del trimestre (ajusta si cambia el calendario) */
export const TRIMESTRE_INICIO = "2026-03-28"
export const TOTAL_SEMANAS = 13

export function fechaLocalHoy(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Semana de lección según la fecha de hoy (1–13) */
export function getSemanaActual(totalSemanas = TOTAL_SEMANAS): number {
  const inicio = new Date(TRIMESTRE_INICIO + "T12:00:00")
  const hoy = new Date(fechaLocalHoy() + "T12:00:00")
  const diffDias = Math.floor((hoy.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDias < 0) return 1
  const semana = Math.floor(diffDias / 7) + 1
  return Math.min(Math.max(semana, 1), totalSemanas)
}

/** Hoy si cae en la semana; si no, el sábado de esa semana */
export function getFechaDestacadaEnSemana(semana: number): string {
  const hoy = fechaLocalHoy()
  const dias = getFechasSemana(semana)
  if (dias.some((d) => d.fecha === hoy)) return hoy
  return dias[0]?.fecha ?? hoy
}

export type DiaSemana = {
  fecha: string
  diaCorto: string
  diaNum: number
  mesCorto: string
}

export function getFechasSemana(semana: number): DiaSemana[] {
  const inicio = new Date(TRIMESTRE_INICIO + "T12:00:00")
  inicio.setDate(inicio.getDate() + (semana - 1) * 7)

  const nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const fecha = `${y}-${m}-${day}`
    return {
      fecha,
      diaCorto: nombres[d.getDay()],
      diaNum: d.getDate(),
      mesCorto: meses[d.getMonth()],
    }
  })
}

export function fechaEnSemana(fecha: string, semana: number): boolean {
  return getFechasSemana(semana).some((d) => d.fecha === fecha)
}
