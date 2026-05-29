"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

type LecturaUiContextValue = {
  headerOculto: boolean
  setHeaderOculto: (oculto: boolean) => void
}

const LecturaUiContext = createContext<LecturaUiContextValue | null>(null)

export function LecturaUiProvider({ children }: { children: ReactNode }) {
  const [headerOculto, setHeaderOcultoState] = useState(false)

  const setHeaderOculto = useCallback((oculto: boolean) => {
    setHeaderOcultoState(oculto)
  }, [])

  return (
    <LecturaUiContext.Provider value={{ headerOculto, setHeaderOculto }}>
      {children}
    </LecturaUiContext.Provider>
  )
}

export function useLecturaUi() {
  const ctx = useContext(LecturaUiContext)
  if (!ctx) throw new Error("useLecturaUi debe usarse dentro de LecturaUiProvider")
  return ctx
}

export function useLecturaUiOptional() {
  return useContext(LecturaUiContext)
}
