import type { Genero, NombreRecordado } from '../types'

const KEY = 'guapea:remembered-names'

function readJson<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Browser-only autocomplete history for this device. */
export function getRememberedNames(): NombreRecordado[] {
  return readJson<NombreRecordado[]>([]).sort((a, b) =>
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
  localStorage.setItem(
    KEY,
    JSON.stringify([entry, ...existing].slice(0, 50)),
  )
}
