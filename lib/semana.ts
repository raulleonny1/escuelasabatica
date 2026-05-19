/** Sábado de inicio del trimestre (ajusta si cambia el calendario) */
export const TRIMESTRE_INICIO = "2026-03-28"

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
    const fecha = d.toISOString().slice(0, 10)
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
