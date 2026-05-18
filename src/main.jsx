// Supabase Edge Function: iiko-sync-sales
// RMS Pro / iiko integration Stage 1.5
// What the RMS frontend can do:
//   action: health         -> checks that the function exists and reports secret status
//   action: testConnection -> authenticates to iiko and validates the selected organization
//   action: syncSales      -> currently validates connection and creates sync/import logs;
//                             OLAP sales mapping is the next implementation step
//
// Required Supabase secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   IIKO_API_LOGIN
// Optional:
//   IIKO_BASE_URL=https://api-ru.iiko.services/api/1

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const IIKO_API_LOGIN = Deno.env.get('IIKO_API_LOGIN') || ''
const IIKO_BASE_URL = Deno.env.get('IIKO_BASE_URL') || 'https://api-ru.iiko.services/api/1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function iikoPost(path: string, token: string | null, body: Record<string, unknown>) {
  const res = await fetch(`${IIKO_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  if (!res.ok) throw new Error(`iiko ${path} failed: ${res.status} ${text}`)
  return data
}

function isoOrFallback(value: unknown, fallback: string) {
  const s = String(value || '').trim()
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const payload = await req.json().catch(() => ({}))
  const action = String(payload.action || 'syncSales')

  if (action === 'health') {
    const ok = Boolean(SUPABASE_URL && SERVICE_ROLE && IIKO_API_LOGIN)
    return json({
      ok,
      action,
      message: ok
        ? 'Edge Function отвечает. Supabase secrets найдены. Можно проверять iiko подключение.'
        : 'Edge Function отвечает, но не все secrets настроены в Supabase.',
      secrets: {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(SERVICE_ROLE),
        IIKO_API_LOGIN: Boolean(IIKO_API_LOGIN),
        IIKO_BASE_URL
      }
    }, ok ? 200 : 200)
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ ok: false, error: 'Missing Supabase service credentials' }, 500)
  if (!IIKO_API_LOGIN) return json({ ok: false, error: 'Missing IIKO_API_LOGIN secret' }, 500)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const connectionId = payload.connectionId
  if (!connectionId) return json({ ok: false, error: 'connectionId is required' }, 400)

  const { data: connection, error: connError } = await supabase
    .from('iiko_sync_connections')
    .select('*, branches(name)')
    .eq('id', connectionId)
    .single()

  if (connError || !connection) return json({ ok: false, error: connError?.message || 'Connection not found' }, 404)
  if (connection.sync_enabled === false) return json({ ok: false, error: 'Connection is disabled' }, 400)

  const now = new Date()
  const periodTo = isoOrFallback(payload.periodTo, now.toISOString())
  const periodFrom = isoOrFallback(payload.periodFrom, connection.last_sync_at || new Date(now.getTime() - 10 * 60 * 1000).toISOString())

  let importRow: any = null
  if (action === 'syncSales') {
    const { data } = await supabase.from('iiko_sales_imports').insert({
      connection_id: connection.id,
      branch_id: connection.branch_id,
      period_from: periodFrom,
      period_to: periodTo,
      status: 'pending'
    }).select('*').single()
    importRow = data
  }

  try {
    const auth = await iikoPost('/access_token', null, { apiLogin: IIKO_API_LOGIN })
    const token = auth?.token
    if (!token) throw new Error('iiko token was not returned')

    const orgs = await iikoPost('/organizations', token, {
      organizationIds: [connection.iiko_organization_id],
      returnAdditionalInfo: true
    })

    const organizations = Array.isArray(orgs?.organizations) ? orgs.organizations : []
    const matched = organizations.find((org: any) => String(org.id) === String(connection.iiko_organization_id)) || organizations[0]
    if (!matched) throw new Error('iiko organization_id не найден для этого API login')

    const rowsCount = organizations.length
    const message = action === 'testConnection'
      ? `iiko подключение проверено: ${matched.name || matched.id || connection.iiko_organization_id}.`
      : 'iiko подключение проверено. OLAP-загрузка продаж будет подключена следующим этапом.'

    if (importRow?.id) {
      await supabase.from('iiko_sales_imports').update({
        status: 'success',
        rows_count: rowsCount,
        total_amount: 0,
        raw_summary: orgs,
        finished_at: new Date().toISOString()
      }).eq('id', importRow.id)
    }

    await supabase.from('iiko_sync_logs').insert({
      connection_id: connection.id,
      branch_id: connection.branch_id,
      status: 'success',
      period_from: periodFrom,
      period_to: periodTo,
      rows_count: rowsCount,
      total_amount: 0,
      message
    })

    await supabase.from('iiko_sync_connections').update({
      last_sync_at: periodTo,
      updated_at: new Date().toISOString()
    }).eq('id', connection.id)

    return json({ ok: true, action, message, organization: matched, organizations })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    if (importRow?.id) {
      await supabase.from('iiko_sales_imports').update({
        status: 'error',
        error_message: errorMessage,
        finished_at: new Date().toISOString()
      }).eq('id', importRow.id)
    }
    await supabase.from('iiko_sync_logs').insert({
      connection_id: connection.id,
      branch_id: connection.branch_id,
      status: 'error',
      period_from: periodFrom,
      period_to: periodTo,
      error_message: errorMessage
    })
    return json({ ok: false, action, error: errorMessage }, 500)
  }
})
