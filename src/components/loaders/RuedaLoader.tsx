import { useEffect, useRef } from 'react'
import { rueda } from './guapeaLoaders'
import { loaderColors } from './theme'

type Props = {
  label?: string
  size?: number
  couples?: number
}

/** Animated rueda de casino loader. */
export function RuedaLoader({
  label = 'Cargando',
  size = 240,
  couples = 4,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const c = loaderColors()
    return rueda(ref.current, {
      size,
      couples,
      label,
      colors: [...c.rueda],
      leaderColor: c.text,
      guideColor: c.guide,
    })
  }, [label, size, couples])

  return (
    <div className="salsa-rueda">
      <div ref={ref} />
    </div>
  )
}
