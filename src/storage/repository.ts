import { apiFetch } from '../api/http'
import type {
  Asistente,
  Clase,
  Genero,
  MetodoPago,
  MetricasSesion,
  Promo,
} from '../types'
import { getRememberedNames, rememberName } from './remembered'

export { getRememberedNames, rememberName }

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function listClasses(): Promise<Clase[]> {
  return apiFetch<Clase[]>('/classes')
}

export async function getClass(id: string): Promise<Clase | undefined> {
  try {
    return await apiFetch<Clase>(`/classes/${id}`)
  } catch {
    return undefined
  }
}

export async function saveClass(
  input: Omit<Clase, 'id'> & { id?: string },
): Promise<Clase> {
  if (input.id) {
    return apiFetch<Clase>(`/classes/${input.id}`, {
      method: 'PUT',
      auth: true,
      body: JSON.stringify({
        nombre: input.nombre,
        descripcion: input.descripcion,
        diaDeLaSemana: input.diaDeLaSemana,
        horaInicio: input.horaInicio,
        duracionMinutos: input.duracionMinutos,
        precio: input.precio,
      }),
    })
  }
  return apiFetch<Clase>('/classes', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      nombre: input.nombre,
      descripcion: input.descripcion,
      diaDeLaSemana: input.diaDeLaSemana,
      horaInicio: input.horaInicio,
      duracionMinutos: input.duracionMinutos,
      precio: input.precio,
    }),
  })
}

export async function deleteClass(id: string): Promise<void> {
  await apiFetch(`/classes/${id}`, { method: 'DELETE', auth: true })
}

export async function classesForDate(fecha: string): Promise<Clase[]> {
  return apiFetch<Clase[]>(`/classes/for-date/${fecha}`)
}

export async function getAttendance(
  fecha: string,
  claseId: string,
): Promise<Asistente[]> {
  const data = await apiFetch<{ attendees: Asistente[] }>(
    `/sessions/${fecha}/${claseId}/attendance`,
  )
  return data.attendees
}

export async function addAttendee(
  fecha: string,
  claseId: string,
  data: { nombre: string; emoji: string; genero: Genero },
): Promise<Asistente> {
  const attendee = await apiFetch<Asistente>(
    `/sessions/${fecha}/${claseId}/attendance`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  rememberName({
    nombre: attendee.nombre,
    emoji: attendee.emoji,
    genero: attendee.genero,
  })
  return attendee
}

export async function removeAttendee(
  fecha: string,
  claseId: string,
  attendeeId: string,
): Promise<void> {
  await apiFetch(`/sessions/${fecha}/${claseId}/attendance/${attendeeId}`, {
    method: 'DELETE',
  })
}

export async function setPayment(
  fecha: string,
  claseId: string,
  attendeeId: string,
  pago: MetodoPago | undefined,
): Promise<void> {
  await patchAttendeeCobro(fecha, claseId, attendeeId, { pago })
}

export async function setPromo(
  fecha: string,
  claseId: string,
  attendeeId: string,
  promo: Promo | undefined,
): Promise<void> {
  await patchAttendeeCobro(fecha, claseId, attendeeId, { promo })
}

/** Single PATCH for cobro flush (pago and/or promo). */
export async function patchAttendeeCobro(
  fecha: string,
  claseId: string,
  attendeeId: string,
  patch: { pago?: MetodoPago | null; promo?: Promo | null },
): Promise<void> {
  const body: { pago?: MetodoPago | null; promo?: Promo | null } = {}
  if ('pago' in patch) body.pago = patch.pago ?? null
  if ('promo' in patch) body.promo = patch.promo ?? null
  await apiFetch(`/sessions/${fecha}/${claseId}/attendance/${attendeeId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function deleteSession(
  fecha: string,
  claseId: string,
): Promise<void> {
  await apiFetch(`/sessions/${fecha}/${claseId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function getSessionMetrics(
  fecha: string,
  claseId: string,
): Promise<MetricasSesion> {
  return apiFetch<MetricasSesion>(`/sessions/${fecha}/${claseId}/metrics`, {
    auth: true,
  })
}
