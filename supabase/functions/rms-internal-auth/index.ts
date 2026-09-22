import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const allowedOrigins = new Set([
  'https://app.rms.rest',
  'https://project-83si4-ob5zn7ol5-nms-clouds-projects.vercel.app',
  'https://project-83si4-git-fix-secure-interna-c3a225-nms-clouds-projects.vercel.app',
])
const encoder = new TextEncoder()

function defaultKeyFromJsonEnv(name: string) {
  const raw = Deno.env.get(name)
  if (!raw) return ''
  try {
    const keys = JSON.parse(raw)
    return typeof keys?.default === 'string' ? keys.default : ''
  } catch {
    return ''
  }
}

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

async function authAdminRequest(supabaseUrl: string, serviceKey: string, path: string, init: RequestInit = {}) {
  const result = await fetch(`${supabaseUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${serviceKey}` }),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!result.ok) throw new Error(`Auth admin request failed: ${result.status}`)
  return await result.json()
}

async function listAllAuthUsers(supabaseUrl: string, serviceKey: string) {
  const users: Record<string, any>[] = []
  for (let page = 1; page <= 100; page += 1) {
    const listed = await authAdminRequest(supabaseUrl, serviceKey, `/users?page=${page}&per_page=100`)
    const pageUsers = Array.isArray(listed.users) ? listed.users : []
    users.push(...pageUsers)
    if (pageUsers.length < 100) break
  }
  return users
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return response(origin, 405, { error: 'Method not allowed' })
  if (origin && !allowedOrigins.has(origin)) return response(origin, 403, { error: 'Origin not allowed' })

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 4096) return response(origin, 413, { error: 'Request too large' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || defaultKeyFromJsonEnv('SUPABASE_SECRET_KEYS') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || defaultKeyFromJsonEnv('SUPABASE_PUBLISHABLE_KEYS') || ''
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return response(origin, 500, { error: 'Authentication service unavailable' })

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  let stage = 'request'

  try {
    stage = 'parse'
    const body = await request.json()

    if (body?.action === 'sync_all_internal_users') {
      stage = 'authorize_sync'
      const authorization = request.headers.get('authorization') || ''
      const accessToken = authorization.replace(/^Bearer\s+/i, '')
      const verified = await admin.auth.getUser(accessToken)
      const requesterEmail = String(verified.data.user?.email || '').toLowerCase()
      if (verified.error || requesterEmail !== 'rasulovr@gmail.com') {
        return response(origin, 403, { error: 'Forbidden' })
      }

      stage = 'sync_all_users'
      const { data: setting, error: settingError } = await admin.from('rms_app_settings').select('value').eq('key', 'internal_users_v2').single()
      if (settingError) throw settingError
      const users = setting?.value && typeof setting.value === 'object' ? setting.value : {}
      const authUsers = await listAllAuthUsers(supabaseUrl, serviceRoleKey)
      let created = 0
      let updated = 0
      let linked = 0
      const failures: string[] = []

      for (const [rawLogin, rawUser] of Object.entries(users)) {
        const login = normalizeLogin(rawLogin)
        const internalUser = rawUser as Record<string, any>
        const password = String(internalUser?.password || '')
        if (!login || internalUser?.is_active === false || !internalUser?.id || !password) continue
        try {
          const candidates = authUsers.filter(user => normalizeLogin(user.email) === login)
          let authUser = candidates.find(user => String(user.email || '').toLowerCase() === `${login}@rms.local.az`) || candidates[0]
          const technicalEmail = String(authUser?.email || `${login}@rms.local.az`)
          if (!authUser) {
            authUser = await authAdminRequest(supabaseUrl, serviceRoleKey, '/users', {
              method: 'POST',
              body: JSON.stringify({
                email: technicalEmail, password, email_confirm: true,
                app_metadata: { rms_internal_id: internalUser.id, rms_login: login },
              }),
            })
            authUsers.push(authUser)
            created += 1
          } else {
            await authAdminRequest(supabaseUrl, serviceRoleKey, `/users/${authUser.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                password,
                app_metadata: { ...(authUser.app_metadata || {}), rms_internal_id: internalUser.id, rms_login: login },
              }),
            })
            updated += 1
          }

          const linkResult = await admin.from('rms_internal_auth_accounts').upsert({
            auth_user_id: authUser.id, internal_id: internalUser.id, login,
            is_admin: false, is_active: true, updated_at: new Date().toISOString(),
          }, { onConflict: 'auth_user_id' })
          if (linkResult.error) throw linkResult.error
          linked += 1
          await admin.from('rms_internal_auth_attempts').delete().eq('login_hash', await sha256(login))
        } catch (_syncError) {
          failures.push(login)
        }
      }

      return response(origin, failures.length ? 207 : 200, {
        ok: failures.length === 0, created, updated, linked, failed_count: failures.length, failed_logins: failures,
      })
    }

    const login = normalizeLogin(body?.login)
    const password = String(body?.password || '')
    if (!/^[a-z0-9._-]{2,64}$/.test(login) || password.length < 1 || password.length > 256) {
      return response(origin, 401, { error: 'Неверный логин или пароль' })
    }

    stage = 'rate_limit'
    const loginHash = await sha256(login)
    const now = Date.now()
    const { data: attempt } = await admin.from('rms_internal_auth_attempts').select('*').eq('login_hash', loginHash).maybeSingle()
    const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until).getTime() : 0
    if (lockedUntil > now) return response(origin, 429, { error: 'Слишком много попыток. Повторите вход позже.' })

    stage = 'legacy_credentials'
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

    stage = 'lookup_auth_link'
    const { data: existingLink, error: existingLinkError } = await admin
      .from('rms_internal_auth_accounts')
      .select('auth_user_id')
      .eq('login', login)
      .maybeSingle()
    if (existingLinkError) throw existingLinkError

    let authUser: Record<string, any> | null = null
    let technicalEmail = `${login}@rms.local.az`

    if (existingLink?.auth_user_id) {
      try {
        stage = 'load_linked_auth_user'
        const linkedUser = await admin.auth.admin.getUserById(existingLink.auth_user_id)
        if (linkedUser.error || !linkedUser.data.user) throw linkedUser.error || new Error('Linked Auth user not found')
        authUser = linkedUser.data.user as Record<string, any>
        technicalEmail = String(authUser.email || technicalEmail)

        stage = 'update_auth_user'
        const updatedUser = await admin.auth.admin.updateUserById(authUser.id, {
          password,
          app_metadata: { ...(authUser.app_metadata || {}), rms_internal_id: internalUser.id, rms_login: login },
        })
        if (updatedUser.error || !updatedUser.data.user) throw updatedUser.error || new Error('Auth user update failed')
        authUser = updatedUser.data.user as Record<string, any>
      } catch (linkedAuthError) {
        if (login !== 'nigar') throw linkedAuthError

        stage = 'create_replacement_auth_user'
        technicalEmail = 'nigar.auth@rms.local.az'
        const replacementUser = await admin.auth.admin.createUser({
          email: technicalEmail,
          password,
          email_confirm: true,
          app_metadata: { rms_internal_id: internalUser.id, rms_login: login },
        })
        if (replacementUser.error || !replacementUser.data.user) {
          throw replacementUser.error || new Error('Replacement Auth user creation failed')
        }
        authUser = replacementUser.data.user as Record<string, any>

        stage = 'switch_auth_link'
        const switchedLink = await admin
          .from('rms_internal_auth_accounts')
          .update({
            auth_user_id: authUser.id,
            internal_id: internalUser.id,
            is_admin: false,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('login', login)
        if (switchedLink.error) throw switchedLink.error
      }
    } else {
      stage = 'create_auth_user'
      const createdUser = await admin.auth.admin.createUser({
        email: technicalEmail,
        password,
        email_confirm: true,
        app_metadata: { rms_internal_id: internalUser.id, rms_login: login },
      })
      if (createdUser.error || !createdUser.data.user) throw createdUser.error || new Error('Auth user creation failed')
      authUser = createdUser.data.user as Record<string, any>
    }

    stage = 'create_session'
    const signedIn = await publicClient.auth.signInWithPassword({ email: technicalEmail, password })
    if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error('Session creation failed')

    stage = 'load_permissions'
    const { data: permissionSetting } = await admin.from('rms_app_settings').select('value').eq('key', 'internal_permissions_v2').single()
    const permissions = permissionSetting?.value?.[internalUser.id] || {}
    stage = 'link_account'
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
    const technicalCode = _error instanceof Error && /^Auth admin request failed: \d{3}$/.test(_error.message)
      ? _error.message.replace('Auth admin request failed: ', 'HTTP_')
      : 'INTERNAL'
    return response(origin, 500, { error: 'Не удалось выполнить защищённый вход', code: `AUTH_${stage.toUpperCase()}`, technical_code: technicalCode })
  }
})
