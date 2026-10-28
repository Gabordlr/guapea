import { useEffect, useMemo, useState } from 'react'
import { AttendanceLists } from '../components/AttendanceLists'
import { AttendeeForm } from '../components/AttendeeForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SessionPicker } from '../components/SessionPicker'
import {
  addAttendee,
  classesForDate,
  getAttendance,
  removeAttendee,
  todayISO,
} from '../storage/repository'
import type { Asistente, Genero } from '../types'

export function HomePage() {
  const [fecha, setFecha] = useState(todayISO)
  const [claseId, setClaseId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<Asistente[]>([])
  const [pendingRemove, setPendingRemove] = useState<Asistente | null>(null)
  const [tick, setTick] = useState(0)

  const classes = useMemo(() => classesForDate(fecha), [fecha, tick])

  useEffect(() => {
    if (classes.length === 0) {
      setClaseId(null)
      return
    }
    setClaseId((current) =>
      current && classes.some((c) => c.id === current) ? current : classes[0].id,
    )
  }, [classes])

  useEffect(() => {
    if (!claseId) {
      setAttendees([])
      return
    }
    setAttendees(getAttendance(fecha, claseId))
  }, [fecha, claseId, tick])

  function refresh() {
    setTick((t) => t + 1)
  }

  function handleAdd(data: { nombre: string; emoji: string; genero: Genero }) {
    if (!claseId) return
    addAttendee(fecha, claseId, data)
    refresh()
  }

  function confirmRemove() {
    if (!claseId || !pendingRemove) return
    removeAttendee(fecha, claseId, pendingRemove.id)
    setPendingRemove(null)
    refresh()
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">¿Vas a la clase?</h1>
        <p className="page-sub">Elige el día, anótate y listo. Sin WhatsApp.</p>
      </div>

      <SessionPicker
        fecha={fecha}
        onFechaChange={(f) => {
          setFecha(f)
        }}
        classes={classes}
        claseId={claseId}
        onClaseChange={setClaseId}
      />

      {claseId ? (
        <>
          <AttendeeForm onSubmit={handleAdd} />
          <AttendanceLists
            attendees={attendees}
            onRequestRemove={setPendingRemove}
          />
        </>
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title="¿Eliminar de la lista?"
          message={`¿Seguro que quieres quitar a ${pendingRemove.nombre}?`}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      ) : null}
    </div>
  )
}
