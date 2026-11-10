/** Shared display helpers for nombre (emoji + name in one DB column). */

export function splitNombre(raw: string): { nombre: string; emoji: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { nombre: '', emoji: '' }
  const match = trimmed.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.+)$/u,
  )
  if (match) {
    return { emoji: match[1], nombre: match[2].trim() }
  }
  return { nombre: trimmed, emoji: '' }
}

export function joinNombre(nombre: string, emoji: string): string {
  return [emoji.trim(), nombre.trim()].filter(Boolean).join(' ')
}

export function formatHora(value: string | Date): string {
  if (typeof value === 'string') {
    return value.length >= 5 ? value.slice(0, 5) : value
  }
  const h = String(value.getUTCHours()).padStart(2, '0')
  const m = String(value.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export type ClassRow = {
  id: string
  nombre: string
  descripcion: string
  dia_de_la_semana: number
  hora_inicio: string | Date
  duracion_minutos: number
  precio: string | number
}

export function mapClass(row: ClassRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    diaDeLaSemana: row.dia_de_la_semana as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    horaInicio: formatHora(row.hora_inicio),
    duracionMinutos: Number(row.duracion_minutos),
    precio: Number(row.precio),
  }
}

export type AttendanceRow = {
  id: string
  nombre: string
  genero: string
  pago: string | null
  promo: string | null
  created_at: Date | string
}

export function mapAttendee(row: AttendanceRow) {
  const { nombre, emoji } = splitNombre(row.nombre)
  return {
    id: row.id,
    nombre,
    emoji,
    genero: row.genero as 'hombre' | 'mujer',
    pago: (row.pago ?? undefined) as
      | 'efectivo'
      | 'transferencia'
      | 'suscripcion'
      | 'sin_pago'
      | undefined,
    promo: (row.promo ?? undefined) as 'pareja' | 'cumpleanos' | undefined,
    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at
        : row.created_at.toISOString(),
  }
}
