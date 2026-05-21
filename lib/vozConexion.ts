/** Evita dos salas Jitsi si hay panel escritorio + móvil montados a la vez */

let panelActivo: string | null = null

export function reclamarConexionVoz(panelId: string): boolean {
  if (panelActivo === null || panelActivo === panelId) {
    panelActivo = panelId
    return true
  }
  return false
}

export function liberarConexionVoz(panelId: string) {
  if (panelActivo === panelId) panelActivo = null
}
