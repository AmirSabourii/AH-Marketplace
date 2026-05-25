import path from 'node:path'

import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'

import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'



const appDir = path.dirname(fileURLToPath(import.meta.url))



// https://vitejs.dev/config/

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, appDir, '')

  const publishableKey = env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim()



  return {

    plugins: [react(), tailwindcss()],

    resolve: {

      dedupe: ['react', 'react-dom'],

      alias: {

        react: path.join(appDir, 'node_modules/react'),

        'react-dom': path.join(appDir, 'node_modules/react-dom'),

      },

    },

    server: {

      // Same-origin in dev when VITE_MEDUSA_BACKEND_URL is unset (see src/lib/medusa/config.ts)

      proxy: {

        '/store': {

          target: 'http://localhost:9000',

          changeOrigin: true,

          // Room visualizer SSE + Gemini can run 30–120s; default proxy idle timeout → 504

          timeout: 600_000,

          proxyTimeout: 600_000,

          configure: (proxy) => {

            if (!publishableKey) return

            proxy.on('proxyReq', (proxyReq) => {

              if (!proxyReq.getHeader('x-publishable-api-key')) {

                proxyReq.setHeader('x-publishable-api-key', publishableKey)

              }

            })

          },

        },

      },

    },

  }

})


