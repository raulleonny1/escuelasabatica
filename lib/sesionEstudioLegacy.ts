import { publicarGuiaMaestro, type PublicarGuiaInput } from "./guiaClase"
import {
  fechaLocalHoy,
  getFechaDestacadaEnSemana,
  getFechasSemana,
  getSemanaActual,
} from "./semana"

export function getEstudioDeHoy() {
  const semana = getSemanaActual()
  const fecha = getFechaDestacadaEnSemana(semana)
  const dias = getFechasSemana(semana)
  const dia = dias.find((d) => d.fecha === fecha)
  return {
    semana,
    fecha,
    diaLabel: dia ? `${dia.diaCorto} ${dia.diaNum} ${dia.mesCorto}` : fecha,
    esHoy: fecha === fechaLocalHoy(),
  }
}

/** @deprecated usar publicarGuiaMaestro */
export async function iniciarSesionEstudio(
  claseId: string,
  iniciadaPor: string,
  semana?: number,
  fecha?: string,
  _nombreClase?: string
) {
  const hoy = getEstudioDeHoy()
  const guia: PublicarGuiaInput = {
    semana: semana ?? hoy.semana,
    fecha: fecha ?? hoy.fecha,
    tipo: "leccion",
    pestana: "pdf",
  }
  await publicarGuiaMaestro(claseId, iniciadaPor, guia)
  return { semana: guia.semana, fecha: guia.fecha, diaLabel: hoy.diaLabel }
}
