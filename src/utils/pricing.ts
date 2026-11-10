import type { MetodoPago, Promo } from '../types'
import { formatMoney } from './format'

/** Fixed amount each Vale (suscripción) contributes to session totals. */
export const VALE_MONTO = 125

export type PromoDef = {
  id: Promo
  label: string
  precio: number
  /** Selecting this promo also sets this payment method. */
  fuerzaPago?: MetodoPago
}

/** Fixed prices. Pareja is a discount to $125 — the name is not about couples. */
export const PROMOS: PromoDef[] = [
  { id: 'pareja', label: 'Pareja', precio: 125 },
  {
    id: 'cumpleanos',
    label: 'Cumpleaños',
    precio: 0,
    fuerzaPago: 'sin_pago',
  },
]

export function promoDef(promo: Promo | undefined): PromoDef | undefined {
  if (!promo) return undefined
  return PROMOS.find((p) => p.id === promo)
}

export function chargeAmount(promo: Promo | undefined, precioClase: number): number {
  if (!promo) return precioClase
  return promoDef(promo)?.precio ?? precioClase
}

/**
 * Money this person contributes to the session total, by payment method.
 * Vale is a fixed credit; sin pago / unpaid contribute nothing.
 */
export function contributionAmount(
  pago: MetodoPago | undefined,
  promo: Promo | undefined,
  precioClase: number,
): number {
  if (pago === 'suscripcion') return VALE_MONTO
  if (pago === 'efectivo' || pago === 'transferencia') {
    return chargeAmount(promo, precioClase)
  }
  return 0
}

export function formatPromoPrecio(precio: number): string {
  return precio === 0 ? 'Gratis' : formatMoney(precio)
}

type CobroFields = {
  pago?: MetodoPago
  promo?: Promo
}

/** True once admin picked any payment method (incl. sin pago). */
export function tienePagoElegido(pago: MetodoPago | undefined): boolean {
  return Boolean(pago)
}

/** Toggle a promo and apply any declared payment side-effects. */
export function applyPromoChange(current: CobroFields, promo: Promo): CobroFields {
  const nextPromo = current.promo === promo ? undefined : promo
  if (!nextPromo) return { pago: current.pago, promo: undefined }

  const def = promoDef(nextPromo)
  if (def?.fuerzaPago) {
    return { promo: nextPromo, pago: def.fuerzaPago }
  }
  return { pago: current.pago, promo: nextPromo }
}

/**
 * Toggle a payment method. If the current promo forces a different pago,
 * drop that promo so the pair stays consistent.
 */
export function applyPagoChange(current: CobroFields, pago: MetodoPago): CobroFields {
  const nextPago = current.pago === pago ? undefined : pago
  const forced = promoDef(current.promo)?.fuerzaPago
  if (forced && nextPago !== forced) {
    return { pago: nextPago, promo: undefined }
  }
  return { pago: nextPago, promo: current.promo }
}
