"use client"

import { useEffect, useState } from "react"
import {
  esDispositivoInstalable,
  solicitarBannerInstalacion,
  yaInstaladaPwa,
} from "@/lib/pwa"

/** Botón visible en móvil/tablet para volver a abrir las instrucciones de instalación */
export default function PwaInstallButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!yaInstaladaPwa() && esDispositivoInstalable())
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={solicitarBannerInstalacion}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm active:bg-white/25 sm:text-xs"
      aria-label="Instalar aplicación en este dispositivo"
    >
      <span aria-hidden>📲</span>
      Instalar app
    </button>
  )
}
