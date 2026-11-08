import type { ReactNode } from 'react'
import { ClaveLogo } from './ClaveLogo'
import { DameMark, GMonogramMark, PasoMark, RuedaMark } from './marks'

type Size = 'lg' | 'sm'

function Word({ size }: { size: Size }) {
  return (
    <span
      className="logo-wordmark"
      style={{ fontSize: size === 'lg' ? '4.5rem' : '1.75rem' }}
    >
      Guapea
    </span>
  )
}

function Row({
  mark,
  size,
  gap = size === 'lg' ? 22 : 8,
}: {
  mark: ReactNode
  size: Size
  gap?: number
}) {
  return (
    <div className="logo-lockup" style={{ gap }}>
      {mark}
      <Word size={size} />
    </div>
  )
}

export function PasoLockup({ size = 'lg' }: { size?: Size }) {
  return (
    <Row
      size={size}
      mark={
        <PasoMark
          size={size === 'lg' ? 112 : 30}
          title={size === 'lg' ? 'Guapea footsteps mark' : 'Guapea small mark'}
        />
      }
    />
  )
}

export function PasoIcon() {
  return (
    <div className="logo-app-icon">
      <PasoMark size={44} title="Guapea app icon" />
    </div>
  )
}

export function RuedaLockup({ size = 'lg' }: { size?: Size }) {
  return (
    <Row
      size={size}
      mark={
        <RuedaMark
          size={size === 'lg' ? 124 : 32}
          detail={size === 'lg' ? 'full' : 'small'}
          title={size === 'lg' ? 'Guapea rueda mark' : 'Guapea small mark'}
        />
      }
    />
  )
}

export function RuedaIcon() {
  return (
    <div className="logo-app-icon">
      <RuedaMark size={48} detail="icon" title="Guapea app icon" />
    </div>
  )
}

export function ClaveLockup({ size = 'lg' }: { size?: Size }) {
  return <ClaveLogo size={size} />
}

export function ClaveIcon() {
  return (
    <div className="logo-app-icon logo-app-icon--clave">
      <ClaveLogo size="icon" />
    </div>
  )
}

export function GMonogramLockup({ size = 'lg' }: { size?: Size }) {
  const id = size === 'lg' ? 'gm-lg' : 'gm-sm'
  return (
    <Row
      size={size}
      mark={
        <GMonogramMark
          size={size === 'lg' ? 120 : 32}
          strokeWidth={size === 'lg' ? 11 : 13}
          gradientId={id}
          title={size === 'lg' ? 'Guapea G monogram' : 'Guapea small mark'}
        />
      }
    />
  )
}

export function GMonogramIcon() {
  return (
    <div className="logo-app-icon">
      <GMonogramMark
        size={46}
        strokeWidth={12}
        gradientId="gm-icon"
        title="Guapea app icon"
      />
    </div>
  )
}

export function DameLockup({ size = 'lg' }: { size?: Size }) {
  return (
    <Row
      size={size}
      mark={
        <DameMark
          size={size === 'lg' ? 120 : 32}
          detail={size === 'lg' ? 'full' : 'small'}
          title={size === 'lg' ? 'Guapea dame mark' : 'Guapea small mark'}
        />
      }
    />
  )
}

export function DameIcon() {
  return (
    <div className="logo-app-icon">
      <DameMark size={46} detail="icon" title="Guapea app icon" />
    </div>
  )
}
