import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // No dev proxy needed: the app reads precomputed data from /public/data/*.json
  // (see src/api/client.ts) rather than a live backend -- see docs/ARCHITECTURE.md.
  // maplibre-gl loads its own web worker via a self-referencing URL at
  // runtime; Vite's esbuild dep pre-bundling breaks that path (worker
  // request 404s/ERR_FAILEDs, map renders with no data/styling). Excluding
  // it from pre-bundling lets it load as a native ESM package instead.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
