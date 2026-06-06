"use client"

import {
  HERRAMIENTAS_RESALTE,
  type HerramientaLeccion,
} from "@/lib/leccionAnotaciones"

type Props = {
  herramienta: HerramientaLeccion
  onHerramienta: (h: HerramientaLeccion) => void
}

export default function LeccionBarraEdicion({ herramienta, onHerramienta }: Props) {
  return (
    <div className="leccion-barra-edicion" role="toolbar" aria-label="Resaltar y escribir">
      <p className="leccion-barra-edicion-titulo">Marcar</p>
      {HERRAMIENTAS_RESALTE.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.titulo}
          aria-label={t.titulo}
          aria-pressed={herramienta === t.id}
          onClick={() => onHerramienta(t.id)}
          className={`leccion-herramienta-btn${
            herramienta === t.id ? " leccion-herramienta-btn-activa" : ""
          }${t.id === "negrilla" ? " leccion-herramienta-negrilla" : ""}${
            t.id === "nota" ? " leccion-herramienta-nota" : ""
          }${t.id === "borrar" ? " leccion-herramienta-borrar" : ""}${
            t.id === "cursor" ? " leccion-herramienta-cursor" : ""
          }`}
        >
          {t.color ? (
            <span
              className="leccion-herramienta-muestra"
              style={{ backgroundColor: t.color }}
              aria-hidden
            />
          ) : t.id === "negrilla" ? (
            <span className="leccion-herramienta-icono" aria-hidden>
              B
            </span>
          ) : t.id === "nota" ? (
            <span className="leccion-herramienta-icono" aria-hidden>
              ✎
            </span>
          ) : t.id === "borrar" ? (
            <span className="leccion-herramienta-icono" aria-hidden>
              ⌫
            </span>
          ) : (
            <span className="leccion-herramienta-icono" aria-hidden>
              ↖
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
