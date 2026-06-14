// RMS Loyalty v12 — Apple Wallet backend starter
// Path in project: api/loyalty/apple-wallet.js

import { createClient } from '@supabase/supabase-js'

const json = (res, status, payload) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload, null, 2))
}

function getEnv(name) {
  return process.env[name] || ''
}

function requiredEnvStatus() {
  const names = [
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APPLE_PASS_TYPE_ID',
    'APPLE_TEAM_ID',
    'APPLE_ORG_NAME',
    'APPLE_PASS_CERT_BASE64',
    'APPLE_PASS_CERT_PASSWORD'
  ]
  return names.map((name) => ({ name, ok: Boolean(getEnv(name)) }))
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return json(res, 405, { ok: false, error: 'Method not allowed' })
    }

    const token = String(req.query?.token || '').trim()
    if (!token) {
      return json(res, 400, { ok: false, error: 'Missing token' })
    }

    const envStatus = requiredEnvStatus()
    const missing = envStatus.filter((item) => !item.ok).map((item) => item.name)
    if (missing.length) {
      return json(res, 501, {
        ok: false,
        stage: 'apple_wallet_backend_ready_but_not_configured',
        message: 'Apple Wallet endpoint is deployed. Add the missing Vercel environment variables to enable real .pkpass generation.',
        missing,
        envStatus
      })
    }

    const supabase = createClient(
      getEnv('VITE_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase.rpc('rms_loyalty_wallet_card_by_token', {
      p_wallet_token: token
    })

    if (error) {
      return json(res, 500, { ok: false, error: error.message })
    }

    const card = Array.isArray(data) ? data[0] : data
    if (!card) {
      return json(res, 404, { ok: false, error: 'Card not found or disabled' })
    }

    // Real .pkpass generation requires Apple certificates and passkit-generator.
    // This v12 endpoint verifies deployment, env, Supabase RPC, and card lookup.
    return json(res, 200, {
      ok: true,
      stage: 'apple_wallet_card_lookup_ok',
      message: 'Card found. Next step: enable .pkpass binary generation.',
      card: {
        name: card.name,
        phone: card.phone,
        card_number: card.card_number,
        stamp_count: card.stamp_count,
        free_drink_balance: card.free_drink_balance,
        wallet_enabled: card.wallet_enabled
      }
    })
  } catch (err) {
    return json(res, 500, { ok: false, error: err?.message || String(err) })
  }
}
