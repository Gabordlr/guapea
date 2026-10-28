/** Split optional leading emoji from the rest of the name. */
export function parseNombreEmoji(raw: string): { nombre: string; emoji: string } {
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

export function formatNombreInput(nombre: string, emoji: string): string {
  return [emoji.trim(), nombre.trim()].filter(Boolean).join(' ')
}
