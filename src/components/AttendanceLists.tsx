import type { Asistente } from '../types'

interface AttendanceListsProps {
  attendees: Asistente[]
  onRequestRemove: (attendee: Asistente) => void
}

export function AttendanceLists({ attendees, onRequestRemove }: AttendanceListsProps) {
  const hombres = attendees.filter((a) => a.genero === 'hombre')
  const mujeres = attendees.filter((a) => a.genero === 'mujer')

  return (
    <div className="panel">
      <h2>
        Lista{' '}
        <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>
          ({attendees.length})
        </span>
      </h2>
      <div className="lists">
        <div className="list-col men">
          <h3>
            Hombres <span className="count">{hombres.length}</span>
          </h3>
          {hombres.length === 0 ? (
            <p className="empty">Nadie aún</p>
          ) : (
            hombres.map((a) => (
              <PersonRow key={a.id} person={a} onRemove={() => onRequestRemove(a)} />
            ))
          )}
        </div>
        <div className="list-col women">
          <h3>
            Mujeres <span className="count">{mujeres.length}</span>
          </h3>
          {mujeres.length === 0 ? (
            <p className="empty">Nadie aún</p>
          ) : (
            mujeres.map((a) => (
              <PersonRow key={a.id} person={a} onRemove={() => onRequestRemove(a)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PersonRow({
  person,
  onRemove,
}: {
  person: Asistente
  onRemove: () => void
}) {
  return (
    <div className="person">
      {person.emoji ? <span className="emoji">{person.emoji}</span> : null}
      <span className="name">{person.nombre}</span>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Eliminar a ${person.nombre}`}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}
