"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface MobilePdfControlsProps {
  children: ReactNode
  /** Cambia cuando se recarga el PDF para volver a enlazar el scroll */
  scrollKey?: string
}

export default function MobilePdfControls({ children, scrollKey }: MobilePdfControlsProps) {
  const [oculto, setOculto] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    setOculto(false)
    lastY.current = 0

    let scrollEl: HTMLElement | null = null
    let poll: ReturnType<typeof setInterval> | undefined

    const onScroll = () => {
      if (!scrollEl) return
      const y = scrollEl.scrollTop
      if (y <= 12) {
        setOculto(false)
      } else if (y > lastY.current + 6) {
        setOculto(true)
      } else if (y < lastY.current - 6) {
        setOculto(false)
      }
      lastY.current = y
    }

    const bind = () => {
      const el = document.querySelector(
        ".layout-pdf-panel .rpv-core__inner-pages"
      ) as HTMLElement | null
      if (!el || el === scrollEl) return
      scrollEl?.removeEventListener("scroll", onScroll)
      scrollEl = el
      lastY.current = el.scrollTop
      el.addEventListener("scroll", onScroll, { passive: true })
      if (poll) {
        clearInterval(poll)
        poll = undefined
      }
    }

    bind()
    poll = setInterval(bind, 200)

    return () => {
      if (poll) clearInterval(poll)
      scrollEl?.removeEventListener("scroll", onScroll)
    }
  }, [scrollKey])

  return (
    <div
      className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
        oculto ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div className="space-y-2 border-b border-border bg-card p-2">{children}</div>
      </div>
    </div>
  )
}
