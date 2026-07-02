/** Resumen breve generado a partir del texto de la lección de ese día. */
export function generarResumenDelDia(parrafos: string[]): string {
  const limpios = parrafos
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 45)
    .filter(
      (p) =>
        !/^(sábado|sabado|domingo|lunes|martes|miércoles|miercoles|jueves|viernes)\b/i.test(
          p
        ) &&
        !/^lee para el estudio/i.test(p) &&
        !/^para estudiar y meditar/i.test(p) &&
        !/^vers[ií]culo de memoria/i.test(p) &&
        !/^texto de la lectura/i.test(p)
    )

  if (!limpios.length) return ""

  const oraciones = limpios
    .join(" ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35 && s.length < 400)
    .filter((s) => !/^lee\s+/i.test(s) && !/^\d+\s*corintios/i.test(s))

  if (!oraciones.length) {
    const corto = limpios[0]
    return corto.length > 500 ? `${corto.slice(0, 497)}…` : corto
  }

  const elegidas: string[] = [oraciones[0]]
  if (oraciones.length > 3) {
    elegidas.push(oraciones[Math.floor(oraciones.length / 2)])
  }
  if (oraciones.length > 1) {
    const ultima = oraciones[oraciones.length - 1]
    if (ultima !== elegidas[0] && !elegidas.includes(ultima)) {
      elegidas.push(ultima)
    }
  }

  return elegidas.join(" ").slice(0, 650)
}
