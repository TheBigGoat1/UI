import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function apiOrigin(env) {
  const raw = env.VITE_API_URL || 'http://localhost:3001/api/v1'
  return raw.replace(/\/api\/v1\/?$/, '')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = apiOrigin(env)

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/ws': {
          target,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
