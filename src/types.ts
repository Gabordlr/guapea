export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Domingo = 0

export type Genero = 'hombre' | 'mujer'

export type MetodoPago = 'efectivo' | 'transferencia' | 'suscripcion'

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
  efectivoEsperado: number
}
