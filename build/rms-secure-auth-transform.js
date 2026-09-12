const secureLogin = `const normalizedLogin = normalizeInternalLogin(rawLogin)
      const isInternalLogin = !rawLogin.includes('@') || /@(rms|nms)\\.local\\.az$/i.test(rawLogin) || /@rms\\.internal$/i.test(rawLogin)
      if (isInternalLogin) {
        const { data: secureAuth, error: secureAuthError } = await supabase.functions.invoke('rms-internal-auth', { body: { login: normalizedLogin, password: rawPassword } })
        if (secureAuthError || !secureAuth?.session || !secureAuth?.internal_user) {
          stopProgress()
          return setError(secureAuth?.error || 'Пользователь не найден или пароль неверный')
        }
        const safeInternalUser = secureAuth.internal_user
        const loginName = safeInternalUser.login || normalizedLogin
        writeJsonStorage(RMS_INTERNAL_USERS_KEY, { [loginName]: safeInternalUser })
        writeJsonStorage(RMS_INTERNAL_PERMISSIONS_KEY, { [safeInternalUser.id]: secureAuth.permissions || {} })
        const nextInternalSession = { rms_internal: true, access_token: secureAuth.session.access_token, user: { id: safeInternalUser.id || \`rms-\${loginName}\`, email: \`\${loginName}@rms.internal\`, login_name: loginName } }
        setInternalSessionStorage(nextInternalSession)
        const { error: sessionError } = await supabase.auth.setSession({ access_token: secureAuth.session.access_token, refresh_token: secureAuth.session.refresh_token })
        if (sessionError) {
          setInternalSessionStorage(null)
          stopProgress()
          return setError('Не удалось создать защищённую сессию')
        }
        await rmsClearSharedLoginGuard(rawLogin)
        window.dispatchEvent(new Event('rms-user-settings-updated'))
        stopProgress()
        onSignedIn?.(nextInternalSession)
        return
      }

      `

const pagedRead = `async function fetchSupplierPurchasesFullRowsViaRpc() {
    const pageSize = 250
    let offset = 0
    let allRows = []
    while (true) {
      const { data, error } = await supabase.rpc('rms_supplier_purchases_page_secure', { p_limit: pageSize, p_offset: offset })
      if (error) throw error
      const batch = normalizeSupplierPurchasesFullPayload(data)
      allRows = allRows.concat(batch)
      if (batch.length < pageSize) break
      offset += pageSize
      if (offset > 50000) break
    }
    return allRows
  }`

function replaceRange(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (start < 0 || end < 0) throw new Error(`RMS secure build marker missing: ${startMarker}`)
  return source.slice(0, start) + replacement + source.slice(end)
}

export function rmsSecureAuthTransform(source) {
  if (source.includes("supabase.functions.invoke('rms-internal-auth'")) return source
  let result = source.replace(
    "const RMS_SOURCE_VERSION = 'main_v404_start_page_tech_card_form_fix'",
    "const RMS_SOURCE_VERSION = 'main_v405_supplier_purchases_paged_load_fix'"
  )
  result = result.replace(
    'const loginGuard = await rmsGetSharedLoginGuardState(rawLogin)',
    "const loginGuard = (!rawLogin.includes('@') || /@(rms|nms)\\.local\\.az$/i.test(rawLogin) || /@rms\\.internal$/i.test(rawLogin)) ? { locked: false } : await rmsGetSharedLoginGuardState(rawLogin)"
  )
  result = replaceRange(result, 'const normalizedLogin = normalizeInternalLogin(rawLogin)', 'const { data, error } = await supabase.auth.signInWithPassword', secureLogin)
  result = result.replace(
    "const { data, error } = await supabase.rpc('rms_suppliers_workspace')",
    "const rpcName = getInternalSessionStorage()?.rms_internal ? 'rms_suppliers_workspace_secure' : 'rms_suppliers_workspace'\\n  const { data, error } = await supabase.rpc(rpcName)"
  )
  result = replaceRange(result, 'async function fetchSupplierPurchasesFullRowsViaRpc() {', 'async function fetchAllSupplierPurchasesRows', `${pagedRead}\n\n  `)
  return result
}
