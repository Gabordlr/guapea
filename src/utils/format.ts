import type { Clase, DiaSemana } from '../types'

export const DIAS: Record<DiaSemana, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatFechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Shift a YYYY-MM-DD date by `days` (can be negative). */
export function shiftFecha(fecha: string, days: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Capitalize first letter — es-MX weekdays come lowercase. */
export function formatFechaTitulo(fecha: string): string {
  const text = formatFechaLarga(fecha)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function addMinutesToTime(hora: string, minutes: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = ((h || 0) * 60 + (m || 0) + minutes + 24 * 60) % (24 * 60)
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function horaFin(clase: Pick<Clase, 'horaInicio' | 'duracionMinutos'>): string {
  return addMinutesToTime(clase.horaInicio, clase.duracionMinutos)
}

/** e.g. "19:00 – 20:00" */
export function formatHorario(clase: Pick<Clase, 'horaInicio' | 'duracionMinutos'>): string {
  return `${clase.horaInicio} – ${horaFin(clase)}`
}
