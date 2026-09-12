import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const allowedOrigins = new Set(['https://app.rms.rest'])
const encoder = new TextEncoder()

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://app.rms.rest'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

function response(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

function normalizeLogin(value: unknown) {
  return String(value || '').trim().toLowerCase()
    .replace(/@(rms|nms)\.local\.az$/i, '')
    .replace(/@rms\.internal$/i, '')
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  const length = Math.max(a.length, b.length)
  let mismatch = a.length ^ b.length
  for (let index = 0; index < length; index += 1) mismatch |= (a[index] || 0) ^ (b[index] || 0)
  return mismatch === 0
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return response(origin, 405, { error: 'Method not allowed' })
  if (origin && !allowedOrigins.has(origin)) return response(origin, 403, { error: 'Origin not allowed' })

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 4096) return response(origin, 413, { error: 'Request too large' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return response(origin, 500, { error: 'Authentication service unavailable' })

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await request.json()
    const login = normalizeLogin(body?.login)
    const password = String(body?.password || '')
    if (!/^[a-z0-9._-]{2,64}$/.test(login) || password.length < 1 || password.length > 256) {
      return response(origin, 401, { error: 'Неверный логин или пароль' })
    }

    const loginHash = await sha256(login)
    const now = Date.now()
    const { data: attempt } = await admin.from('rms_internal_auth_attempts').select('*').eq('login_hash', loginHash).maybeSingle()
    const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until).getTime() : 0
    if (lockedUntil > now) return response(origin, 429, { error: 'Слишком много попыток. Повторите вход позже.' })

    const { data: setting, error: settingError } = await admin.from('rms_app_settings').select('value').eq('key', 'internal_users_v2').single()
    if (settingError) throw settingError
    const users = setting?.value && typeof setting.value === 'object' ? setting.value : {}
    const internalUser = users[login]
    const validUser = internalUser && internalUser.is_active !== false
    const validPassword = validUser && constantTimeEqual(password, String(internalUser.password || ''))

    if (!validPassword) {
      const resetWindow = !attempt?.window_started_at || now - new Date(attempt.window_started_at).getTime() > 15 * 60 * 1000
      const attempts = resetWindow ? 1 : Number(attempt?.attempts || 0) + 1
      const nextLock = attempts >= 5 ? new Date(now + 5 * 60 * 1000).toISOString() : null
      await admin.from('rms_internal_auth_attempts').upsert({
        login_hash: loginHash, attempts, window_started_at: resetWindow ? new Date(now).toISOString() : attempt.window_started_at,
        locked_until: nextLock, updated_at: new Date(now).toISOString(),
      })
      return response(origin, 401, { error: 'Неверный логин или пароль' })
    }

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) throw listError
    const candidates = (listed.users || []).filter(user => normalizeLogin(user.email) === login)
    let authUser = candidates.find(user => user.email?.toLowerCase() === `${login}@rms.local.az`) || candidates[0]
    const technicalEmail = authUser?.email || `${login}@rms.local.az`

    if (!authUser) {
      const created = await admin.auth.admin.createUser({
        email: technicalEmail, password, email_confirm: true,
        app_metadata: { rms_internal_id: internalUser.id, rms_login: login },
      })
      if (created.error || !created.data.user) throw created.error || new Error('Auth user creation failed')
      authUser = created.data.user
    } else {
      const updated = await admin.auth.admin.updateUserById(authUser.id, {
        password,
        app_metadata: { ...(authUser.app_metadata || {}), rms_internal_id: internalUser.id, rms_login: login },
      })
      if (updated.error) throw updated.error
    }

    const signedIn = await publicClient.auth.signInWithPassword({ email: technicalEmail, password })
    if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error('Session creation failed')

    const { data: permissionSetting } = await admin.from('rms_app_settings').select('value').eq('key', 'internal_permissions_v2').single()
    const permissions = permissionSetting?.value?.[internalUser.id] || {}
    const linked = await admin.from('rms_internal_auth_accounts').upsert({
      auth_user_id: authUser.id, internal_id: internalUser.id, login, is_admin: false, is_active: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'auth_user_id' })
    if (linked.error) throw linked.error

    await admin.from('rms_internal_auth_attempts').delete().eq('login_hash', loginHash)
    return response(origin, 200, {
      session: signedIn.data.session,
      internal_user: { id: internalUser.id, login, role: internalUser.role || 'employee', is_active: true },
      permissions,
    })
  } catch (_error) {
    return response(origin, 500, { error: 'Не удалось выполнить защищённый вход' })
  }
})
