import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requireAdmin } from './auth'
import { pool } from './db'
import {
  joinNombre,
  mapAttendee,
  mapClass,
  type AttendanceRow,
  type ClassRow,
} from './mappers'

type Variables = { user: { sub: string } }

const app = new Hono<{ Variables: Variables }>()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/', (c) => c.json({ ok: true, service: 'guapea-api' }))

async function ensureSession(classId: string, fecha: string) {
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM sessions WHERE class_id = $1 AND fecha = $2::date`,
    [classId, fecha],
  )
  if (existing.rows[0]) return existing.rows[0].id

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO sessions (class_id, fecha)
     VALUES ($1, $2::date)
     ON CONFLICT (class_id, fecha) DO UPDATE SET class_id = EXCLUDED.class_id
     RETURNING id`,
    [classId, fecha],
  )
  return inserted.rows[0].id
}

function chargeAmount(promo: string | null | undefined, precio: number): number {
  if (promo === 'pareja') return 125
  return precio
}

/** Public: all class templates */
app.get('/classes', async (c) => {
  const result = await pool.query<ClassRow>(
    `SELECT id, nombre, descripcion, dia_de_la_semana, hora_inicio,
            duracion_minutos, precio
     FROM classes
     ORDER BY dia_de_la_semana, hora_inicio`,
  )
  return c.json(result.rows.map(mapClass))
})

/** Public: classes scheduled for a calendar date */
app.get('/classes/for-date/:fecha', async (c) => {
  const fecha = c.req.param('fecha')
  const day = new Date(`${fecha}T12:00:00`).getDay()
  const result = await pool.query<ClassRow>(
    `SELECT id, nombre, descripcion, dia_de_la_semana, hora_inicio,
            duracion_minutos, precio
     FROM classes
     WHERE dia_de_la_semana = $1
     ORDER BY hora_inicio`,
    [day],
  )
  return c.json(result.rows.map(mapClass))
})

app.get('/classes/:id', async (c) => {
  const result = await pool.query<ClassRow>(
    `SELECT id, nombre, descripcion, dia_de_la_semana, hora_inicio,
            duracion_minutos, precio
     FROM classes WHERE id = $1`,
    [c.req.param('id')],
  )
  const row = result.rows[0]
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(mapClass(row))
})

app.post('/classes', requireAdmin, async (c) => {
  const body = await c.req.json<{
    nombre: string
    descripcion?: string
    diaDeLaSemana: number
    horaInicio: string
    duracionMinutos: number
    precio: number
  }>()
  const result = await pool.query<ClassRow>(
    `INSERT INTO classes
       (nombre, descripcion, dia_de_la_semana, hora_inicio, duracion_minutos, precio)
     VALUES ($1, $2, $3, $4::time, $5, $6)
     RETURNING id, nombre, descripcion, dia_de_la_semana, hora_inicio,
               duracion_minutos, precio`,
    [
      body.nombre.trim(),
      body.descripcion?.trim() ?? '',
      body.diaDeLaSemana,
      body.horaInicio,
      body.duracionMinutos,
      body.precio,
    ],
  )
  return c.json(mapClass(result.rows[0]), 201)
})

app.put('/classes/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    nombre: string
    descripcion?: string
    diaDeLaSemana: number
    horaInicio: string
    duracionMinutos: number
    precio: number
  }>()
  const result = await pool.query<ClassRow>(
    `UPDATE classes SET
       nombre = $2,
       descripcion = $3,
       dia_de_la_semana = $4,
       hora_inicio = $5::time,
       duracion_minutos = $6,
       precio = $7,
       updated_at = now()
     WHERE id = $1
     RETURNING id, nombre, descripcion, dia_de_la_semana, hora_inicio,
               duracion_minutos, precio`,
    [
      id,
      body.nombre.trim(),
      body.descripcion?.trim() ?? '',
      body.diaDeLaSemana,
      body.horaInicio,
      body.duracionMinutos,
      body.precio,
    ],
  )
  if (!result.rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json(mapClass(result.rows[0]))
})

app.delete('/classes/:id', requireAdmin, async (c) => {
  await pool.query(`DELETE FROM classes WHERE id = $1`, [c.req.param('id')])
  return c.json({ ok: true })
})

/** Public: lazy-create session + list attendance */
app.get('/sessions/:fecha/:classId/attendance', async (c) => {
  const fecha = c.req.param('fecha')
  const classId = c.req.param('classId')
  const sessionId = await ensureSession(classId, fecha)
  const result = await pool.query<AttendanceRow>(
    `SELECT id, nombre, genero, pago, promo, created_at
     FROM attendance
     WHERE session_id = $1
     ORDER BY created_at`,
    [sessionId],
  )
  return c.json({
    sessionId,
    attendees: result.rows.map(mapAttendee),
  })
})

/** Public: check in */
app.post('/sessions/:fecha/:classId/attendance', async (c) => {
  const fecha = c.req.param('fecha')
  const classId = c.req.param('classId')
  const body = await c.req.json<{
    nombre: string
    emoji?: string
    genero: 'hombre' | 'mujer'
  }>()
  const nombre = joinNombre(body.nombre, body.emoji ?? '')
  if (!nombre.trim()) return c.json({ error: 'Nombre required' }, 400)
  if (body.genero !== 'hombre' && body.genero !== 'mujer') {
    return c.json({ error: 'Genero invalid' }, 400)
  }

  const sessionId = await ensureSession(classId, fecha)
  const result = await pool.query<AttendanceRow>(
    `INSERT INTO attendance (session_id, nombre, genero)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, genero, pago, promo, created_at`,
    [sessionId, nombre, body.genero],
  )
  return c.json(mapAttendee(result.rows[0]), 201)
})

/** Public: anyone on the list page can remove a check-in (Phase 1). */
app.delete(
  '/sessions/:fecha/:classId/attendance/:attendeeId',
  async (c) => {
    const fecha = c.req.param('fecha')
    const classId = c.req.param('classId')
    const attendeeId = c.req.param('attendeeId')
    const sessionId = await ensureSession(classId, fecha)
    await pool.query(
      `DELETE FROM attendance WHERE id = $1 AND session_id = $2`,
      [attendeeId, sessionId],
    )
    return c.json({ ok: true })
  },
)

app.patch(
  '/sessions/:fecha/:classId/attendance/:attendeeId',
  requireAdmin,
  async (c) => {
    const fecha = c.req.param('fecha')
    const classId = c.req.param('classId')
    const attendeeId = c.req.param('attendeeId')
    const body = await c.req.json<{
      pago?: string | null
      promo?: string | null
    }>()
    const sessionId = await ensureSession(classId, fecha)

    const updated = await pool.query<AttendanceRow>(
      `UPDATE attendance SET
         pago = CASE WHEN $3::boolean THEN $4 ELSE pago END,
         promo = CASE WHEN $5::boolean THEN $6 ELSE promo END
       WHERE id = $1 AND session_id = $2
       RETURNING id, nombre, genero, pago, promo, created_at`,
      [
        attendeeId,
        sessionId,
        body.pago !== undefined,
        body.pago ?? null,
        body.promo !== undefined,
        body.promo ?? null,
      ],
    )
    if (!updated.rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json(mapAttendee(updated.rows[0]))
  },
)

app.delete('/sessions/:fecha/:classId', requireAdmin, async (c) => {
  const fecha = c.req.param('fecha')
  const classId = c.req.param('classId')
  await pool.query(
    `DELETE FROM sessions WHERE class_id = $1 AND fecha = $2::date`,
    [classId, fecha],
  )
  return c.json({ ok: true })
})

app.get('/sessions/:fecha/:classId/metrics', requireAdmin, async (c) => {
  const fecha = c.req.param('fecha')
  const classId = c.req.param('classId')
  const sessionId = await ensureSession(classId, fecha)

  const classResult = await pool.query<{ precio: string | number }>(
    `SELECT precio FROM classes WHERE id = $1`,
    [classId],
  )
  const precio = Number(classResult.rows[0]?.precio ?? 0)

  const result = await pool.query<AttendanceRow>(
    `SELECT id, nombre, genero, pago, promo, created_at
     FROM attendance WHERE session_id = $1`,
    [sessionId],
  )
  const list = result.rows
  const monto = (a: AttendanceRow) => chargeAmount(a.promo, precio)

  return c.json({
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
  })
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Internal error' }, 500)
})

export default app
