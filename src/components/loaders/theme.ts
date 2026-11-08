/** Reads the app's CSS color tokens so the loaders match the theme. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}

export function loaderColors() {
  const accent = token('--accent', '#ff4d6d')
  const accentHot = token('--accent-hot', '#ff8a3d')
  const gold = token('--gold', '#f0c75e')

  return {
    accent,
    accentHot,
    gold,
    text: token('--text', '#fff6ee'),
    guide: token('--border', 'rgba(255, 214, 170, 0.14)'),
    /** Red → orange → gold scale for rueda followers. */
    rueda: [accent, '#ff6358', accentHot, gold] as const,
  }
}
