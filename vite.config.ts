import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // listen on LAN so phones can connect
    port: 5173,
    strictPort: true,
  },
})
