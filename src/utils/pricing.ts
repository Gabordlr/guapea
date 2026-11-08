import type { Promo } from '../types'

/** Fixed prices. Pareja is a discount to $125 — the name is not about couples. */
export const PROMOS: { id: Promo; label: string; precio: number }[] = [
  { id: 'pareja', label: 'Pareja', precio: 125 },
]

export function chargeAmount(promo: Promo | undefined, precioClase: number): number {
  if (!promo) return precioClase
  return PROMOS.find((p) => p.id === promo)?.precio ?? precioClase
}
