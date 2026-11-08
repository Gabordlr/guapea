/** Eight-beat clave scale: solid, solid, solid, hollow, solid, solid, solid, hollow. */
export const BEAT_COLORS = [
  '#EF5F6B',
  '#EF6968',
  '#EF7366',
  '#EF7C64',
  '#EF8661',
  '#F0905F',
  '#F0995C',
  '#F0A35A',
] as const

/** Beats 4 and 8 are the break (hollow rings). */
export const HOLLOW_BEATS = new Set([3, 7])
