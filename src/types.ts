export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Domingo = 0

export type Genero = 'hombre' | 'mujer'

export type MetodoPago =
  | 'efectivo'
  | 'transferencia'
  | 'suscripcion'
  | 'sin_pago'

/** Price override. Not a payment method — pago is still required. */
export type Promo = 'pareja' | 'cumpleanos'

export interface Clase {
  id: string
  nombre: string
  descripcion: string
  diaDeLaSemana: DiaSemana
  horaInicio: string // HH:MM
  duracionMinutos: number
  precio: number
}

export interface Asistente {
  id: string
  nombre: string
  emoji: string
  genero: Genero
  pago?: MetodoPago
  promo?: Promo
  createdAt: string
}

export interface NombreRecordado {
  nombre: string
  emoji: string
  genero: Genero
  lastUsedAt: string
}

export interface MetricasSesion {
  total: number
  hombres: number
  mujeres: number
  efectivo: number
  transferencia: number
  suscripcion: number
  sinPagar: number
  promoPareja: number
  promoCumpleanos: number
  /** Cash already marked as paid, using each person's promo price when set. */
  efectivoEsperado: number
  /** Transfers already marked as paid, using each person's promo price when set. */
  transferenciaMonto: number
  /** Efectivo + transferencia + vale (vale = fixed credit). */
  totalMonto: number
}
