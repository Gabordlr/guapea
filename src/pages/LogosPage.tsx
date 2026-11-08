import {
  ClaveIcon,
  ClaveLockup,
  DameIcon,
  DameLockup,
  GMonogramIcon,
  GMonogramLockup,
  PasoIcon,
  PasoLockup,
  RuedaIcon,
  RuedaLockup,
} from '../components/logo'

const CONCEPTS = [
  {
    id: 'paso',
    title: '01 Paso (footwork)',
    large: <PasoLockup size="lg" />,
    icon: <PasoIcon />,
    small: <PasoLockup size="sm" />,
  },
  {
    id: 'rueda',
    title: '02 Rueda',
    large: <RuedaLockup size="lg" />,
    icon: <RuedaIcon />,
    small: <RuedaLockup size="sm" />,
  },
  {
    id: 'clave',
    title: '03 Clave (rhythm) — en uso en el header',
    large: <ClaveLockup size="lg" />,
    icon: <ClaveIcon />,
    small: <ClaveLockup size="sm" />,
  },
  {
    id: 'g',
    title: '04 G monogram',
    large: <GMonogramLockup size="lg" />,
    icon: <GMonogramIcon />,
    small: <GMonogramLockup size="sm" />,
  },
  {
    id: 'dame',
    title: '05 Dame (the pass)',
    large: <DameLockup size="lg" />,
    icon: <DameIcon />,
    small: <DameLockup size="sm" />,
  },
] as const

/** Preview board for all logo concepts and sizes. */
export function LogosPage() {
  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Logos</h1>
        <p className="page-sub">
          Conceptos Cutsnelly. El header usa Clave small (palabra + puntos).
        </p>
      </div>

      {CONCEPTS.map((c) => (
        <section key={c.id} className="logo-board">
          <h2 className="logo-board-title">{c.title}</h2>
          <div className="logo-board-stage">{c.large}</div>
          <div className="logo-board-row">
            {c.icon}
            {c.small}
          </div>
        </section>
      ))}
    </div>
  )
}
