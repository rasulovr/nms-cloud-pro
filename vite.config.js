import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmsSecureAuthTransform } from './build/rms-secure-auth-transform.js'

export default defineConfig({
  plugins: [
    {
      name: 'rms-secure-internal-auth',
      enforce: 'pre',
      transform(source, id) {
        if (!id.replaceAll('\\', '/').endsWith('/src/main.jsx')) return null
        return { code: rmsSecureAuthTransform(source), map: null }
      }
    },
    react()
  ]
})
