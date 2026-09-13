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

const verifiedPasswordChange = `  async function changeUserPassword(userId, loginName) {
    setMsg('')
    setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'loading', text: 'Сохранение...' } }))
    const password = String(passwordEdits[userId] || '').trim()
    if (!password || password.length < 6) {
      setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'error', text: 'Пароль должен быть минимум 6 символов' } }))
      return setMsg('Пароль должен быть минимум 6 символов')
    }

    const cloudUsers = await readRmsAppSetting(RMS_INTERNAL_USERS_SETTING, null)
    const internalUsers = (cloudUsers && typeof cloudUsers === 'object' && !Array.isArray(cloudUsers))
      ? { ...cloudUsers }
      : { ...getInternalUsers() }
    const localLogin = Object.keys(internalUsers).find(k => internalUsers[k]?.id === userId || k === normalizeInternalLogin(loginName))
    if (localLogin) {
      if (String(internalUsers[localLogin]?.password || '') === password) {
        setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'error', text: 'Введите новый пароль, отличный от текущего' } }))
        return setMsg('Новый пароль совпадает с текущим и не был изменён')
      }
      internalUsers[localLogin] = { ...internalUsers[localLogin], password }
      try { await persistInternalUsersShared(internalUsers) } catch (e) {
        setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'error', text: \`Ошибка облачного сохранения: \${e.message}\` } }))
        return setMsg(\`Не удалось сохранить пароль в облаке: \${e.message}\`)
      }

      const verifiedUsers = await readRmsAppSetting(RMS_INTERNAL_USERS_SETTING, null)
      const verifiedPassword = verifiedUsers && typeof verifiedUsers === 'object'
        ? String(verifiedUsers[localLogin]?.password || '')
        : ''
      if (verifiedPassword !== password) {
        setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'error', text: 'Сервер не подтвердил изменение пароля' } }))
        return setMsg('Пароль не изменён: сервер не подтвердил новое значение')
      }

      setPasswordEdits(p => ({ ...p, [userId]: '' }))
      setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'success', text: 'Пароль изменён и применён' } }))
      setMsg(\`Пароль пользователя \${localLogin} изменён\`)
      window.dispatchEvent(new Event('rms-user-settings-updated'))
      await load()
      return
    }

    setPasswordStatuses(prev => ({ ...prev, [userId]: { type: 'error', text: 'Для admin пароль меняется через Supabase Auth' } }))
    setMsg('Пароль можно менять только у внутренних RMS-пользователей. Для admin используйте Supabase Auth.')
  }

`

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
    "const RMS_SOURCE_VERSION = 'main_v407_internal_login_password_normalization'"
  )
  result = result.replace(
    "const rawPassword = String(password || '')",
    "const rawPassword = String(password || '').trim()"
  )
  result = result.replace(
    'const loginGuard = await rmsGetSharedLoginGuardState(rawLogin)',
    "const loginGuard = (!rawLogin.includes('@') || /@(rms|nms)\\.local\\.az$/i.test(rawLogin) || /@rms\\.internal$/i.test(rawLogin)) ? { locked: false } : await rmsGetSharedLoginGuardState(rawLogin)"
  )
  result = replaceRange(result, 'const normalizedLogin = normalizeInternalLogin(rawLogin)', 'const { data, error } = await supabase.auth.signInWithPassword', secureLogin)
  result = result.replace(
    "const { data, error } = await supabase.rpc('rms_suppliers_workspace')",
    "const rpcName = getInternalSessionStorage()?.rms_internal ? 'rms_suppliers_workspace_secure' : 'rms_suppliers_workspace'\n  const { data, error } = await supabase.rpc(rpcName)"
  )
  result = replaceRange(result, 'async function fetchSupplierPurchasesFullRowsViaRpc() {', 'async function fetchAllSupplierPurchasesRows', `${pagedRead}\n\n  `)
  result = replaceRange(result, '  async function changeUserPassword(userId, loginName) {', '  async function resetUserLoginLock', verifiedPasswordChange)
  return result
}
