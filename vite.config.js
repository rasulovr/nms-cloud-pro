import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmsSecureAuthTransform } from './build/rms-secure-auth-transform.js'

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://zzsdcxowhhaxnuliaryb.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_KadKobelt_Zxq5HF770GFA_zSdTAfec')
  },
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
