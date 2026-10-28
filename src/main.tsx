import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { seedDemoData } from './storage/seed'
import './index.css'

try {
  seedDemoData()
} catch (err) {
  console.error('No se pudo cargar la demo:', err)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
