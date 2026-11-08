type MarkProps = {
  size?: number
  className?: string
  title?: string
}

/** 01 Paso — two feet + ghost home. */
export function PasoMark({
  size = 32,
  className,
  title = 'Guapea footsteps',
}: MarkProps) {
  const stroke = size <= 36 ? 4 : size <= 48 ? 3 : 2
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <ellipse
        cx="40"
        cy="78"
        rx="14"
        ry="24"
        transform="rotate(-8 40 78)"
        fill="none"
        stroke="#6a5560"
        strokeWidth={stroke}
        strokeDasharray="4 4"
      />
      <ellipse
        cx="40"
        cy="40"
        rx="14"
        ry="24"
        transform="rotate(-8 40 40)"
        fill="#EF5F6B"
      />
      <ellipse
        cx="82"
        cy="76"
        rx="14"
        ry="24"
        transform="rotate(8 82 76)"
        fill="#F0A35A"
      />
    </svg>
  )
}

/** 02 Rueda — couples on a circle, dame in progress. */
export function RuedaMark({
  size = 32,
  className,
  title = 'Guapea rueda',
  detail = 'full',
}: MarkProps & { detail?: 'full' | 'icon' | 'small' }) {
  const ring = detail === 'full' ? 1.5 : detail === 'icon' ? 2 : 3
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke="#5d4a54"
        strokeWidth={ring}
        strokeDasharray="3 4"
      />
      <rect x="45.6" y="10.8" width="12" height="12" rx="2.5" fill="#F3E9E4" />
      <rect x="97.2" y="45.6" width="12" height="12" rx="2.5" fill="#F3E9E4" />
      <rect x="62.4" y="97.2" width="12" height="12" rx="2.5" fill="#F3E9E4" />
      <rect x="10.8" y="62.4" width="12" height="12" rx="2.5" fill="#F3E9E4" />
      {detail === 'full' ? (
        <>
          <circle
            cx="68.4"
            cy="16.8"
            r="6.5"
            fill="none"
            stroke="#6a5560"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <circle cx="76.7" cy="22.6" r="3" fill="#EF5F6B" opacity="0.35" />
          <circle cx="86.1" cy="31" r="4" fill="#EF5F6B" opacity="0.6" />
        </>
      ) : detail === 'icon' ? (
        <circle cx="86.1" cy="31" r="4" fill="#EF5F6B" opacity="0.6" />
      ) : null}
      <circle cx="91.2" cy="42" r="6.5" fill="#EF5F6B" />
      <circle cx="103.2" cy="68.4" r="6.5" fill="#F0A35A" />
      <circle cx="51.6" cy="103.2" r="6.5" fill="#EF5F6B" />
      <circle cx="16.8" cy="51.6" r="6.5" fill="#F0A35A" />
    </svg>
  )
}

/** 04 G monogram — open G with leader square + follower. */
export function GMonogramMark({
  size = 32,
  className,
  title = 'Guapea G monogram',
  strokeWidth = 13,
  gradientId = 'gm',
}: MarkProps & { strokeWidth?: number; gradientId?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="20"
          y1="20"
          x2="100"
          y2="100"
        >
          <stop offset="0" stopColor="#EF5F6B" />
          <stop offset="1" stopColor="#F0A35A" />
        </linearGradient>
      </defs>
      <path
        d="M92.8 37.1A40 40 0 1 0 100 60L70 60"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <rect x="85.8" y="30.1" width="14" height="14" rx="3" fill="#F3E9E4" />
      <circle cx="66" cy="60" r="8" fill="#F0A35A" />
    </svg>
  )
}

/** 05 Dame — follower passing between two leaders. */
export function DameMark({
  size = 32,
  className,
  title = 'Guapea dame',
  detail = 'full',
}: MarkProps & { detail?: 'full' | 'icon' | 'small' }) {
  const pathStroke = detail === 'full' ? 2 : detail === 'icon' ? 3 : 4
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <path
        d="M34 68Q60 6 86 68"
        fill="none"
        stroke="#6a5560"
        strokeWidth={pathStroke}
        strokeDasharray="4 4"
      />
      {detail === 'full' ? (
        <>
          <circle
            cx="46"
            cy="86"
            r="10"
            fill="none"
            stroke="#6a5560"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <circle cx="40.2" cy="54.9" r="2.5" fill="#EF5F6B" opacity="0.3" />
          <circle cx="47.5" cy="44.1" r="3" fill="#EF5F6B" opacity="0.5" />
          <circle cx="54.8" cy="38.2" r="3.5" fill="#EF5F6B" opacity="0.7" />
        </>
      ) : detail === 'icon' ? (
        <circle cx="54.8" cy="38.2" r="3.5" fill="#EF5F6B" opacity="0.7" />
      ) : null}
      <circle cx="68.3" cy="40.2" r="10" fill="#EF5F6B" />
      <rect x="12" y="76" width="20" height="20" rx="4" fill="#F3E9E4" />
      <rect x="88" y="76" width="20" height="20" rx="4" fill="#F3E9E4" />
    </svg>
  )
}
