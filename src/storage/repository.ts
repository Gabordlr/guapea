import type {
  Asistente,
  Clase,
  Genero,
  MetodoPago,
  MetricasSesion,
  NombreRecordado,
} from '../types'
import { createId } from '../utils/id'

const KEYS = {
  classes: 'guapea:classes',
  remembered: 'guapea:remembered-names',
} as const

function attendanceKey(fecha: string, claseId: string) {
  return `guapea:attendance:${fecha}:${claseId}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return createId()
}

/** Migrate older records that used `hora` instead of horaInicio + duracion. */
function normalizeClass(raw: Clase & { hora?: string }): Clase {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion ?? '',
    diaDeLaSemana: raw.diaDeLaSemana,
    horaInicio: raw.horaInicio || raw.hora || '19:00',
    duracionMinutos: raw.duracionMinutos > 0 ? raw.duracionMinutos : 60,
    precio: raw.precio ?? 0,
  }
}

export function listClasses(): Clase[] {
  return readJson<(Clase & { hora?: string })[]>(KEYS.classes, [])
    .map(normalizeClass)
    .sort((a, b) => {
      if (a.diaDeLaSemana !== b.diaDeLaSemana) {
        return a.diaDeLaSemana - b.diaDeLaSemana
      }
      return a.horaInicio.localeCompare(b.horaInicio)
    })
}

export function getClass(id: string): Clase | undefined {
  return listClasses().find((c) => c.id === id)
}

export function saveClass(input: Omit<Clase, 'id'> & { id?: string }): Clase {
  const classes = listClasses()
  if (input.id) {
    const next = classes.map((c) =>
      c.id === input.id
        ? {
            id: c.id,
            nombre: input.nombre,
            descripcion: input.descripcion,
            diaDeLaSemana: input.diaDeLaSemana,
            horaInicio: input.horaInicio,
            duracionMinutos: input.duracionMinutos,
            precio: input.precio,
          }
        : c,
    )
    writeJson(KEYS.classes, next)
    return next.find((c) => c.id === input.id)!
  }

  const created: Clase = {
    id: uid(),
    nombre: input.nombre,
    descripcion: input.descripcion,
    diaDeLaSemana: input.diaDeLaSemana,
    horaInicio: input.horaInicio,
    duracionMinutos: input.duracionMinutos,
    precio: input.precio,
  }
  writeJson(KEYS.classes, [...classes, created])
  return created
}

export function deleteClass(id: string) {
  writeJson(
    KEYS.classes,
    listClasses().filter((c) => c.id !== id),
  )
}

export function classesForDate(fecha: string): Clase[] {
  const day = new Date(`${fecha}T12:00:00`).getDay() as Clase['diaDeLaSemana']
  return listClasses().filter((c) => c.diaDeLaSemana === day)
}

export function getAttendance(fecha: string, claseId: string): Asistente[] {
  return readJson<Asistente[]>(attendanceKey(fecha, claseId), [])
}

function saveAttendance(fecha: string, claseId: string, list: Asistente[]) {
  writeJson(attendanceKey(fecha, claseId), list)
}

export function addAttendee(
  fecha: string,
  claseId: string,
  data: { nombre: string; emoji: string; genero: Genero },
): Asistente {
  const list = getAttendance(fecha, claseId)
  const attendee: Asistente = {
    id: uid(),
    nombre: data.nombre.trim(),
    emoji: data.emoji.trim(),
    genero: data.genero,
    createdAt: new Date().toISOString(),
  }
  saveAttendance(fecha, claseId, [...list, attendee])
  rememberName({
    nombre: attendee.nombre,
    emoji: attendee.emoji,
    genero: attendee.genero,
  })
  return attendee
}

export function removeAttendee(fecha: string, claseId: string, attendeeId: string) {
  const list = getAttendance(fecha, claseId).filter((a) => a.id !== attendeeId)
  saveAttendance(fecha, claseId, list)
}

export function setPayment(
  fecha: string,
  claseId: string,
  attendeeId: string,
  pago: MetodoPago | undefined,
) {
  const list = getAttendance(fecha, claseId).map((a) =>
    a.id === attendeeId ? { ...a, pago } : a,
  )
  saveAttendance(fecha, claseId, list)
}

export function getRememberedNames(): NombreRecordado[] {
  return readJson<NombreRecordado[]>(KEYS.remembered, []).sort((a, b) =>
    b.lastUsedAt.localeCompare(a.lastUsedAt),
  )
}

export function rememberName(data: {
  nombre: string
  emoji: string
  genero: Genero
}) {
  const nombre = data.nombre.trim()
  if (!nombre) return
  const existing = getRememberedNames().filter(
    (n) => n.nombre.toLowerCase() !== nombre.toLowerCase(),
  )
  const entry: NombreRecordado = {
    nombre,
    emoji: data.emoji.trim(),
    genero: data.genero,
    lastUsedAt: new Date().toISOString(),
  }
  writeJson(KEYS.remembered, [entry, ...existing].slice(0, 50))
}

export function getSessionMetrics(
  fecha: string,
  claseId: string,
): MetricasSesion {
  const list = getAttendance(fecha, claseId)
  const clase = getClass(claseId)
  const precio = clase?.precio ?? 0

  const hombres = list.filter((a) => a.genero === 'hombre').length
  const mujeres = list.filter((a) => a.genero === 'mujer').length
  const efectivo = list.filter((a) => a.pago === 'efectivo').length
  const transferencia = list.filter((a) => a.pago === 'transferencia').length
  const suscripcion = list.filter((a) => a.pago === 'suscripcion').length
  const sinPagar = list.filter((a) => !a.pago).length

  return {
    total: list.length,
    hombres,
    mujeres,
    efectivo,
    transferencia,
    suscripcion,
    sinPagar,
    efectivoEsperado: efectivo * precio,
  }
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
