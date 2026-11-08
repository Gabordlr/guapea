import { useEffect, useRef } from 'react'
import { steps } from './guapeaLoaders'
import { loaderColors } from './theme'

type Props = {
  label?: string
  size?: number
}

/** Salsa basic-step loader (8 beats). */
export function BasicStepLoader({ label = 'Cargando…', size = 200 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const c = loaderColors()
    return steps(ref.current, {
      size,
      label,
      leftColor: c.accent,
      rightColor: c.accentHot,
    })
  }, [label, size])

  return <div ref={ref} className="salsa-steps" />
}
