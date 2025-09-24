// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:3000'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // alles voor zoek/stats/etc.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        // AI streaming (POST met text/event-stream of chunked)
        '/compose': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
