import type { Asistente, Clase, Genero } from '../types'
import { createId } from '../utils/id'
import { todayISO } from './repository'

const KEYS = {
  classes: 'guapea:classes',
  remembered: 'guapea:remembered-names',
  seeded: 'guapea:demo-seeded',
} as const

const SEED_VERSION = 'demo-wed-v1'

function attendanceKey(fecha: string, claseId: string) {
  return `guapea:attendance:${fecha}:${claseId}`
}

const DEMO_CLASSES: Clase[] = [
  {
    id: 'demo-intermedio',
    nombre: 'Intermedio',
    descripcion: 'Salsa intermedio',
    diaDeLaSemana: 3,
    horaInicio: '19:00',
    duracionMinutos: 60,
    precio: 150,
  },
  {
    id: 'demo-avanzados',
    nombre: 'Avanzados',
    descripcion: 'Nivel avanzado',
    diaDeLaSemana: 3,
    horaInicio: '20:00',
    duracionMinutos: 90,
    precio: 150,
  },
]

function person(
  nombre: string,
  genero: Genero,
  emoji = '',
): Asistente {
  return {
    id: createId(),
    nombre,
    emoji,
    genero,
    createdAt: new Date().toISOString(),
  }
}

/** Next Wednesday as YYYY-MM-DD (today if already Wednesday). */
export function nearestWednesdayISO(from = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()
  const add = (3 - day + 7) % 7
  d.setDate(d.getDate() + add)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dayNum = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayNum}`
}

/**
 * Loads demo Wednesday classes + attendance for the demo.
 * Safe to call on every boot — only rewrites when seed version changes.
 */
export function seedDemoData(force = false) {
  if (!force && localStorage.getItem(KEYS.seeded) === SEED_VERSION) return

  const fecha = nearestWednesdayISO()
  localStorage.setItem(KEYS.classes, JSON.stringify(DEMO_CLASSES))

  const intermedio: Asistente[] = [
    person('Carlos', 'hombre', '🕺'),
    person('Diego', 'hombre'),
    person('María', 'mujer', '💃'),
    person('Sofía', 'mujer'),
    person('Valentina', 'mujer', '✨'),
  ]

  const avanzados: Asistente[] = [
    person('Andrés', 'hombre'),
    person('Luis', 'hombre', '🔥'),
    person('Miguel', 'hombre'),
    person('Pablo', 'hombre'),
    person('Camila', 'mujer', '💃'),
    person('Lucía', 'mujer'),
    person('Isabella', 'mujer'),
    person('Fernanda', 'mujer', '🌸'),
    person('Andrea', 'mujer'),
    person('Paula', 'mujer'),
  ]

  localStorage.setItem(
    attendanceKey(fecha, 'demo-intermedio'),
    JSON.stringify(intermedio),
  )
  localStorage.setItem(
    attendanceKey(fecha, 'demo-avanzados'),
    JSON.stringify(avanzados),
  )

  // Also mirror onto "today" if today is that Wednesday (already is when demoing same day)
  const today = todayISO()
  if (today !== fecha) {
    localStorage.setItem(
      attendanceKey(today, 'demo-intermedio'),
      JSON.stringify(intermedio),
    )
    localStorage.setItem(
      attendanceKey(today, 'demo-avanzados'),
      JSON.stringify(avanzados),
    )
  }

  localStorage.setItem(
    KEYS.remembered,
    JSON.stringify(
      [...intermedio, ...avanzados].map((a) => ({
        nombre: a.nombre,
        emoji: a.emoji,
        genero: a.genero,
        lastUsedAt: a.createdAt,
      })),
    ),
  )

  localStorage.setItem(KEYS.seeded, SEED_VERSION)
}

/** Force-refresh demo data (useful while iterating). */
export function resetDemoData() {
  localStorage.removeItem(KEYS.seeded)
  seedDemoData(true)
}
