"use client"

import { useEffect, useState } from "react"

/** iPad y tablets: cabecera en una o dos filas para dejar más visor. */
export function useCabeceraCompacta(): boolean {
  const [compacto, setCompacto] = useState(false)

  useEffect(() => {
    const tablet =
      "(max-width: 1023px), ((min-width: 1024px) and (max-width: 1366px) and (pointer: coarse))"
    const mq = window.matchMedia(tablet)
    const sync = () => setCompacto(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return compacto
}
