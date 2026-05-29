"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

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
      lastToggle.current = Date.now()
      accDelta.current = 0
    }

    const ocultar = () => {
      if (ocultoRef.current) return
      ocultoRef.current = true
      setOculto(true)
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
    }
  }, [scrollKey])

  return (
    <div
      className={`absolute inset-x-0 top-0 z-20 border-b border-border bg-card shadow-sm transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none lg:hidden ${
        oculto ? "-translate-y-full pointer-events-none" : "translate-y-0"
      }`}
    >
      <div className="space-y-2 p-2">{children}</div>
    </div>
  )
}
