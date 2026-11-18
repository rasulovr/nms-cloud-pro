import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {readCanaryBuildGate} from './build/read-canary-gate.mjs'
import { rmsSecureAuthTransform } from './build/rms-secure-auth-transform.js'

export default defineConfig(({command,mode})=>{
 const canary=readCanaryBuildGate({command,mode,env:process.env});
 return {
  define:{__RMS_READ_CANARY_ENABLED__:JSON.stringify(canary.enabled),__RMS_CANARY_OWNER_DIGEST__:JSON.stringify(canary.ownerDigest)},
  plugins: [
    {
      name: 'rms-secure-internal-auth',
      enforce: 'pre',
      transform(source, id) {
        if (!id.replaceAll('\\', '/').endsWith('/src/main.generated.jsx')) return null
        return { code: rmsSecureAuthTransform(source), map: null }
      }
    },
    react()
  ]
}})
