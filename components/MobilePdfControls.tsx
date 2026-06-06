"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useLecturaUiOptional } from "@/components/LecturaUiContext"
import { useCabeceraCompacta } from "@/hooks/useCabeceraCompacta"

interface MobilePdfControlsProps {
  children: ReactNode
  scrollKey?: string
}

const UMBRAL_OCULTAR = 56
const UMBRAL_MOSTRAR = 28
const TOPE_VISIBLE = 24
const PAUSA_MS = 280

export default function MobilePdfControls({ children, scrollKey }: MobilePdfControlsProps) {
  const [oculto, setOculto] = useState(false)
  const compacto = useCabeceraCompacta()
  const lecturaUi = useLecturaUiOptional()
  const ocultoRef = useRef(false)
  const lastY = useRef(0)
  const accDelta = useRef(0)
  const lastToggle = useRef(0)

  useEffect(() => {
    ocultoRef.current = false
    setOculto(false)
    lastY.current = 0
    accDelta.current = 0
    lastToggle.current = 0

    let scrollEl: HTMLElement | null = null
    let raf = 0

    const mostrar = () => {
      if (!ocultoRef.current) return
      ocultoRef.current = false
      setOculto(false)
      lecturaUi?.setHeaderOculto(false)
      lastToggle.current = Date.now()
      accDelta.current = 0
    }

    const ocultar = () => {
      if (ocultoRef.current) return
      ocultoRef.current = true
      setOculto(true)
      lecturaUi?.setHeaderOculto(true)
      lastToggle.current = Date.now()
      accDelta.current = 0
    }

    const onScroll = () => {
      if (!scrollEl) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!scrollEl) return
        const y = scrollEl.scrollTop
        const dy = y - lastY.current
        lastY.current = y

        if (y <= TOPE_VISIBLE) {
          mostrar()
          return
        }

        accDelta.current += dy
        if (Date.now() - lastToggle.current < PAUSA_MS) return

        if (accDelta.current >= UMBRAL_OCULTAR) ocultar()
        else if (accDelta.current <= -UMBRAL_MOSTRAR) mostrar()
      })
    }

    const bind = (el: HTMLElement) => {
      if (scrollEl === el) return
      scrollEl?.removeEventListener("scroll", onScroll)
      scrollEl = el
      lastY.current = el.scrollTop
      el.addEventListener("scroll", onScroll, { passive: true })
    }

    const panel = document.querySelector(".layout-pdf-panel")
    const tryBind = () => {
      const el = document.querySelector(
        ".layout-pdf-panel .rpv-core__inner-pages"
      ) as HTMLElement | null
      if (el) bind(el)
    }

    tryBind()
    const observer = panel
      ? new MutationObserver(tryBind)
      : null
    observer?.observe(panel!, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      scrollEl?.removeEventListener("scroll", onScroll)
      lecturaUi?.setHeaderOculto(false)
    }
  }, [scrollKey, lecturaUi])

  return (
    <div
      className={`shrink-0 overflow-hidden border-b border-border bg-card shadow-sm transition-[max-height,transform,opacity] duration-200 ease-out will-change-transform motion-reduce:transition-none lg:hidden ${
        oculto
          ? "pointer-events-none max-h-0 -translate-y-2 border-transparent opacity-0"
          : "max-h-[40vh] translate-y-0 opacity-100"
      }`}
    >
      <div className={compacto ? "p-1" : "space-y-2 p-2"}>{children}</div>
    </div>
  )
}
