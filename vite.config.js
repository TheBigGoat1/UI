import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function apiOrigin(env) {
  const port = env.PORT || '3003'
  const raw = env.VITE_API_URL || `http://localhost:${port}/api/v1`
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
      alias: {
        '@server': path.resolve(__dirname, 'server'),
      },
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
