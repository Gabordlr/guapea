import { useMemo, useRef, useState } from 'react'
import type { Genero, NombreRecordado } from '../types'
import { getRememberedNames } from '../storage/repository'
import { formatNombreInput, parseNombreEmoji } from '../utils/parseNombre'

interface AttendeeFormProps {
  onSubmit: (data: { nombre: string; emoji: string; genero: Genero }) => void
  submitLabel?: string
  title?: string
}

export function AttendeeForm({
  onSubmit,
  submitLabel = 'Agregarme a la lista',
  title = 'Anotarme',
}: AttendeeFormProps) {
  const [texto, setTexto] = useState('')
  const [genero, setGenero] = useState<Genero>('hombre')
  const [open, setOpen] = useState(false)
  const [remembered, setRemembered] = useState<NombreRecordado[]>(() =>
    getRememberedNames(),
  )
  const blurTimer = useRef<number | null>(null)

  const suggestions = useMemo(() => {
    const { nombre } = parseNombreEmoji(texto)
    const q = nombre.toLowerCase()
    if (!q) return remembered.slice(0, 8)
    return remembered
      .filter((n) => n.nombre.toLowerCase().includes(q))
      .slice(0, 8)
  }, [texto, remembered])

  function refreshRemembered() {
    setRemembered(getRememberedNames())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { nombre, emoji } = parseNombreEmoji(texto)
    if (!nombre) return
    onSubmit({ nombre, emoji, genero })
    setTexto('')
    setOpen(false)
    refreshRemembered()
  }

  function pickSuggestion(entry: NombreRecordado) {
    setTexto(formatNombreInput(entry.nombre, entry.emoji))
    setGenero(entry.genero)
    setOpen(false)
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>{title}</h2>

      <div className="field autocomplete">
        <label className="label" htmlFor="nombre">
          Nombre
        </label>
        <input
          id="nombre"
          className="input"
          autoComplete="off"
          placeholder="🔥 Tu nombre"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            refreshRemembered()
            setOpen(true)
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150)
          }}
        />
        {open && suggestions.length > 0 && (
          <div className="suggestions" role="listbox">
            {suggestions.map((s) => (
              <button
                key={s.nombre}
                type="button"
                className="suggestion"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
              >
                <span>{s.emoji || '•'}</span>
                <span>{s.nombre}</span>
              </button>
            ))}
          </div>
        )}
        <small style={{ color: 'var(--muted)' }}>
          Puedes poner un emoji al inicio, ej. 🕺 Ana
        </small>
      </div>

      <div className="field">
        <span className="label">Género</span>
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${genero === 'hombre' ? 'active' : ''}`}
            aria-pressed={genero === 'hombre'}
            onClick={() => setGenero('hombre')}
          >
            Hombre
          </button>
          <button
            type="button"
            className={`seg-btn ${genero === 'mujer' ? 'active' : ''}`}
            aria-pressed={genero === 'mujer'}
            onClick={() => setGenero('mujer')}
          >
            Mujer
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!parseNombreEmoji(texto).nombre}
      >
        {submitLabel}
      </button>
    </form>
  )
}
