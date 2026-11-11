import { BeatDots } from './BeatDots'

export type ClaveSize = 'lg' | 'sm' | 'icon'

type Props = {
  size?: ClaveSize
  className?: string
}

/** Single source of truth for Clave logo sizing (header uses `sm`). */
const SIZES = {
  lg: { font: '6.5rem', gap: '1.125rem', beat: 14, beatsPad: '0 6px' },
  sm: {
    font: 'clamp(1.55rem, 6.5vw, 2.05rem)',
    gap: '0.375rem',
    beat: 7,
    beatsPad: '0 2px',
  },
  icon: { font: '2.75rem', gap: '5px', beat: 6, beatsPad: '0' },
} as const

/** 03 Clave — "Guapea" wordmark with eight beat dots below (4 & 8 hollow). */
export function ClaveLogo({ size = 'sm', className = '' }: Props) {
  const s = SIZES[size]

  if (size === 'icon') {
    return (
      <div
        className={`logo-clave logo-clave--icon ${className}`.trim()}
        role="img"
        aria-label="Guapea"
        style={{ gap: s.gap }}
      >
        <span className="logo-wordmark" style={{ fontSize: s.font }}>
          G
        </span>
        <BeatDots size={s.beat} className="logo-beats logo-beats--icon" />
      </div>
    )
  }

  return (
    <div
      className={`logo-clave logo-clave--${size} ${className}`.trim()}
      role="img"
      aria-label="Guapea"
      style={{ gap: s.gap }}
    >
      <span className="logo-wordmark" style={{ fontSize: s.font }}>
        Guapea
      </span>
      <div style={{ padding: s.beatsPad }}>
        <BeatDots size={s.beat} />
      </div>
    </div>
  )
}
