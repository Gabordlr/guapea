import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { SalsaLoader } from '../components/loaders/SalsaLoader'
import { authClient } from './client'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = authClient.useSession()

  if (session.isPending) {
    return (
      <div className="salsa-loader-screen">
        <SalsaLoader />
      </div>
    )
  }

  if (!session.data?.user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}
