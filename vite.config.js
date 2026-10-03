import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, /api goes to the local Worker (`npm run dev:node` or `npm run dev` inside worker/).
    // In production the Worker is routed on the same domain, so the app always calls relative /api.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
