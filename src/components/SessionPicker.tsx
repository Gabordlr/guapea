import type { Clase } from '../types'
import {
  canGoNextFecha,
  canGoPrevFecha,
  formatFechaTitulo,
  formatHorario,
  shiftFecha,
} from '../utils/format'

interface SessionPickerProps {
  fecha: string
  onFechaChange: (fecha: string) => void
  classes: Clase[]
  claseId: string | null
  onClaseChange: (id: string) => void
  /** When set with maxFecha, Lista stays inside that week. Admin omits both. */
  minFecha?: string | null
  maxFecha?: string | null
}

export function SessionPicker({
  fecha,
  onFechaChange,
  classes,
  claseId,
  onClaseChange,
  minFecha = null,
  maxFecha = null,
}: SessionPickerProps) {
  const canGoPrev = canGoPrevFecha(fecha, minFecha)
  const canGoNext = canGoNextFecha(fecha, maxFecha)

  return (
    <div className="panel">
      <h2>Sesión</h2>
      <div className="field">
        <span className="label" id="fecha-label">
          Fecha
        </span>
        <div className="date-stepper" role="group" aria-labelledby="fecha-label">
          <button
            type="button"
            className="date-stepper-btn"
            aria-label="Día anterior"
            disabled={!canGoPrev}
            onClick={() => {
              if (!canGoPrev) return
              onFechaChange(shiftFecha(fecha, -1))
            }}
          >
            ‹
          </button>
          <div className="date-stepper-value" aria-live="polite">
            {formatFechaTitulo(fecha)}
          </div>
          <button
            type="button"
            className="date-stepper-btn"
            aria-label="Día siguiente"
            disabled={!canGoNext}
            onClick={() => {
              if (!canGoNext) return
              onFechaChange(shiftFecha(fecha, 1))
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="field">
        <span className="label">Clase</span>
        {classes.length === 0 ? (
          <p className="empty">
            No hay clases programadas para este día. Crea una en Admin.
          </p>
        ) : (
          <div className="class-list">
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`class-option ${claseId === c.id ? 'active' : ''}`}
                aria-pressed={claseId === c.id}
                onClick={() => onClaseChange(c.id)}
              >
                <strong>{c.nombre}</strong>
                <small>
                  {formatHorario(c)}
                  {c.descripcion ? ` · ${c.descripcion}` : ''}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
