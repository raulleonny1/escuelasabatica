/** Reexporta la guía de clase (antes «sesión de estudio»). */
export {
  ESTUDIO_INICIADO_EVENT,
  GUIA_CLASE_EVENT,
  etiquetaTipoMaterial,
  publicarGuiaMaestro,
  subscribeGuiaClase,
  subscribeSesionEstudio,
  type GuiaClase,
  type PestanaClase,
  type PublicarGuiaInput,
  type SesionEstudio,
} from "./guiaClase"

export { getEstudioDeHoy, iniciarSesionEstudio } from "./sesionEstudioLegacy"
