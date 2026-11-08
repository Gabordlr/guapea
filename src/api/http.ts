import { getAccessToken } from '../auth/client'

const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeader(authed: boolean): Promise<HeadersInit> {
  if (!authed) return {}
  const token = await getAccessToken()
  if (!token) {
    throw new ApiError(401, 'Sesión requerida')
  }
  return { Authorization: `Bearer ${token}` }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(
      500,
      'VITE_API_URL no está configurada. Despliega la Function y añádela al .env',
    )
  }

  const { auth = false, headers, ...rest } = options
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(await authHeader(auth)),
      ...headers,
    },
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function hasApiUrl(): boolean {
  return Boolean(baseUrl)
}
