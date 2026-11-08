import { BEAT_COLORS, HOLLOW_BEATS } from './beats'

type Props = {
  /** Dot diameter in px */
  size?: number
  className?: string
}

export function BeatDots({ size = 5, className = 'logo-beats' }: Props) {
  // Hairline ring so the open center (beats 4 & 8) reads clearly at small sizes.
  const ring = Math.max(1, size * 0.16)
  return (
    <div className={className} aria-hidden="true">
      {BEAT_COLORS.map((color, i) =>
        HOLLOW_BEATS.has(i) ? (
          <span
            key={i}
            className="logo-beat logo-beat--hollow"
            style={{
              width: size,
              height: size,
              borderWidth: ring,
              borderColor: color,
            }}
          />
        ) : (
          <span
            key={i}
            className="logo-beat"
            style={{ width: size, height: size, background: color }}
          />
        ),
      )}
    </div>
  )
}
