"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  url?: string
}

interface State {
  error: Error | null
}

/** Evita que un fallo del visor PDF tumbe toda la aplicación */
export default class PdfErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error en visor PDF:", error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.url !== this.props.url && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="font-semibold text-red-700">No se pudo mostrar el PDF</p>
          <p className="text-sm text-slate-600">{this.state.error.message}</p>
          {this.props.url && (
            <p className="text-xs text-slate-400 break-all">{this.props.url}</p>
          )}
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
