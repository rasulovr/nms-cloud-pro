// RMS Loyalty v12 — Wallet backend health check
// Path in project: api/loyalty/wallet-health.js

const json = (res, status, payload) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload, null, 2))
}

export default function handler(req, res) {
  const required = [
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APPLE_PASS_TYPE_ID',
    'APPLE_TEAM_ID',
    'APPLE_ORG_NAME',
    'APPLE_PASS_CERT_BASE64',
    'APPLE_PASS_CERT_PASSWORD'
  ]

  const env = required.map((name) => ({ name, ok: Boolean(process.env[name]) }))
  json(res, 200, {
    ok: true,
    service: 'RMS Loyalty Wallet Backend',
    appleWalletReady: env.every((item) => item.ok),
    env
  })
}
