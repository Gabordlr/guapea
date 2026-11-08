/**
 * One-time bootstrap: creates the admin user via Neon Auth sign-up.
 * Password is hashed by Neon Auth (Better Auth) — never stored in app code.
 *
 * Usage: node --env-file=.env scripts/create-admin.mjs
 */
const authUrl = process.env.NEON_AUTH_URL || process.env.VITE_NEON_AUTH_URL
const email = process.env.ADMIN_EMAIL
const name = process.env.ADMIN_NAME || 'Admin'
const password = process.env.ADMIN_PASSWORD

if (!authUrl || !email || !password) {
  console.error(
    'Missing NEON_AUTH_URL / VITE_NEON_AUTH_URL, ADMIN_EMAIL, or ADMIN_PASSWORD in env.',
  )
  process.exit(1)
}

const endpoint = `${authUrl.replace(/\/$/, '')}/sign-up/email`
const origin = process.env.APP_ORIGIN || 'http://localhost:5173'

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin,
  },
  body: JSON.stringify({
    email,
    password,
    name,
    callbackURL: origin,
  }),
})

const text = await res.text()
let body
try {
  body = JSON.parse(text)
} catch {
  body = text
}

if (!res.ok) {
  const msg =
    (body && (body.message || body.error)) ||
    `HTTP ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`
  // Already exists is fine for re-runs
  if (
    res.status === 422 ||
    /already|exists|USER_ALREADY/i.test(String(msg))
  ) {
    console.log('Admin user may already exist:', msg)
    process.exit(0)
  }
  console.error('Failed to create admin:', msg)
  process.exit(1)
}

console.log('Admin created (password hashed by Neon Auth):', email)
if (body?.user?.id) console.log('user id:', body.user.id)
