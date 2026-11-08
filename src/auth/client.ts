import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL

if (!authUrl) {
  console.warn(
    'VITE_NEON_AUTH_URL is missing. Admin login will not work until it is set.',
  )
}

export const authClient = createAuthClient(authUrl ?? '', {
  adapter: BetterAuthReactAdapter({
    // Vite (localhost) ↔ Neon Auth (*.neon.tech) is cross-origin; need cookies.
    fetchOptions: { credentials: 'include' },
  }),
})

/** Neon Auth uses email; we accept "marlene" in the UI and map it here. */
export const ADMIN_LOGIN_DOMAIN = 'guapea.app'

export function usernameToEmail(usernameOrEmail: string): string {
  const raw = usernameOrEmail.trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('@')) return raw
  return `${raw}@${ADMIN_LOGIN_DOMAIN}`
}

/** JWT for calling Neon Functions (cobro, class CRUD, metrics). */
export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await authClient.getSession()
  if (error || !data?.session) return null
  const session = data.session as { token?: string }
  return session.token ?? null
}
