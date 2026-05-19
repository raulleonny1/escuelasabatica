"use client"

import { useEffect, useState } from "react"

/** true cuando viewport >= 1024px (clase lg de Tailwind) */
export function useMediaLg(): boolean {
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setIsLg(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return isLg
}
