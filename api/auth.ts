import type { Context, Next } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const jwksUrl = process.env.NEON_AUTH_JWKS_URL
const authBase = process.env.NEON_AUTH_BASE_URL

const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null
const issuer = authBase ? new URL(authBase).origin : null

export type AuthedUser = { sub: string }

export async function requireAdmin(c: Context, next: Next) {
  if (!jwks || !issuer) {
    return c.json({ error: 'Auth not configured' }, 500)
  }

  const header = c.req.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, {
      issuer,
      audience: issuer,
      algorithms: ['EdDSA'],
    })
    if (!payload.sub) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    c.set('user', { sub: payload.sub } satisfies AuthedUser)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}
