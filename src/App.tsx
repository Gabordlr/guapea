import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { ClasesPage } from './pages/ClasesPage'
import { CobroPage } from './pages/CobroPage'
import { HomePage } from './pages/HomePage'
import { LoadersPage } from './pages/LoadersPage'
import { LoginPage } from './pages/LoginPage'
import { LogosPage } from './pages/LogosPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/loaders" element={<LoadersPage />} />
          <Route path="/logos" element={<LogosPage />} />
          <Route
            path="/cobro"
            element={
              <RequireAuth>
                <CobroPage />
              </RequireAuth>
            }
          />
          <Route
            path="/clases"
            element={
              <RequireAuth>
                <ClasesPage />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<Navigate to="/cobro" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
