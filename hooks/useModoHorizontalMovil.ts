"use client"

import { useEffect, useState } from "react"

/** Móvil en horizontal (poca altura): cabecera compacta */
export function useModoHorizontalMovil(): boolean {
  const [activo, setActivo] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 1023px) and (orientation: landscape) and (max-height: 520px)"
    )
    const sync = () => setActivo(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return activo
}
