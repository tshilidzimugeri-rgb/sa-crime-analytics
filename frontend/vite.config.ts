import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  // maplibre-gl loads its own web worker via a self-referencing URL at
  // runtime; Vite's esbuild dep pre-bundling breaks that path (worker
  // request 404s/ERR_FAILEDs, map renders with no data/styling). Excluding
  // it from pre-bundling lets it load as a native ESM package instead.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
