import { BasicStepLoader } from './BasicStepLoader'
import { RuedaLoader } from './RuedaLoader'

export type LoaderKind = 'basic' | 'rueda'

type Props = {
  /** Default: rueda. Use `basic` for lighter inline waits (e.g. day switch). */
  kind?: LoaderKind
  size?: number
}

/** App loading indicator — rueda by default; basic step for compact spots. */
export function SalsaLoader({ kind = 'rueda', size }: Props) {
  return (
    <div className="salsa-loader" role="status" aria-label="Cargando">
      {kind === 'basic' ? (
        <BasicStepLoader size={size ?? 140} />
      ) : (
        <RuedaLoader size={size} />
      )}
    </div>
  )
}
