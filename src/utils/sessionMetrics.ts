import type { Asistente, MetricasSesion } from '../types'
import { chargeAmount } from './pricing'

/** Same rules as the API metrics endpoint — used for optimistic Cobro UI. */
export function computeSessionMetrics(
  list: Asistente[],
  precioClase: number,
): MetricasSesion {
  const monto = (a: Asistente) => chargeAmount(a.promo, precioClase)

  return {
    total: list.length,
    hombres: list.filter((a) => a.genero === 'hombre').length,
    mujeres: list.filter((a) => a.genero === 'mujer').length,
    efectivo: list.filter((a) => a.pago === 'efectivo').length,
    transferencia: list.filter((a) => a.pago === 'transferencia').length,
    suscripcion: list.filter((a) => a.pago === 'suscripcion').length,
    sinPagar: list.filter((a) => a.pago === 'sin_pago' || !a.pago).length,
    promoPareja: list.filter((a) => a.promo === 'pareja').length,
    efectivoEsperado: list
      .filter((a) => a.pago === 'efectivo')
      .reduce((sum, a) => sum + monto(a), 0),
    transferenciaMonto: list
      .filter((a) => a.pago === 'transferencia')
      .reduce((sum, a) => sum + monto(a), 0),
  }
}
