// All payroll requests are committed by a single RLS-respecting transaction.
// Keep a failed request's identity so an uncertain network response is safe to retry.
export function payrollRequestKey(ref, operations) {
  const signature = JSON.stringify(operations)
  if (!ref.current || ref.current.signature !== signature) {
    ref.current = { signature, key: `payroll:${globalThis.crypto.randomUUID()}` }
  }
  return ref.current.key
}

export function payrollWriteError(error) {
  if (error?.code === 'PAYROLL_UNCONFIRMED') return 'Не удалось подтвердить результат сохранения. Повторите ту же операцию: ключ запроса защищает от дубля.'
  const text = error?.message || String(error || 'Неизвестная ошибка')
  if (error?.code === 'PGRST202' || /rms_(payroll_write_atomic|reclassify_salary_advance).*(schema cache|not find|does not exist)/i.test(text)) {
    return 'Сохранение зарплаты недоступно: обновление базы ещё не установлено. Операция не отправлена в старый журнал.'
  }
  if (/active linked RMS administrator/.test(text)) {
    return 'Недостаточно прав для изменения зарплаты. Требуется активный администратор RMS с правом записи зарплаты.'
  }
  if (error?.code === '42501') return 'Запись отклонена настройками доступа к данным. Изменения не сохранены. Сообщите администратору RMS.'
  if (error?.code === '40001') return 'Данные изменились после загрузки. Обновите список и проверьте суммы перед повтором.'
  if (/fetch|network|connection|timeout/i.test(text)) return 'Не удалось подтвердить сохранение. Повторите ту же операцию: ключ запроса защищает от дубля.'
  return `Операция не сохранена: ${text}`
}

// Read base rows without embedded relations: the complete originals are the
// optimistic-concurrency contract, not the current journal's display snapshot.
export async function loadAdvanceReclassification(client, advanceId) {
  const { data: advance, error: advanceError } = await client.from('salary_advances').select('*').eq('id', advanceId).single()
  if (advanceError) throw advanceError
  if (!advance?.id || advance.is_cancelled || advance.operation_type !== 'advance') throw new Error('Для исправления нужен действующий аванс')
  const sourceMonth = `${String(advance.advance_date).slice(0, 7)}-01`
  const { data: periods, error: periodsError } = await client.from('salary_periods').select('*')
    .eq('employee_id', advance.employee_id).lte('salary_month', sourceMonth).order('salary_month', { ascending: false })
  if (periodsError) throw periodsError
  const matching = (periods || []).filter(row => row.employee_id === advance.employee_id && (row.branch_id ?? null) === (advance.branch_id ?? null))
  const advancePeriod = matching.find(row => row.salary_month === sourceMonth)
  if (!advancePeriod) throw new Error('Не найден зарплатный период исходного аванса. Исправление недоступно.')
  return { advance, advancePeriod, settlementPeriods: matching.filter(row => row.salary_month < sourceMonth) }
}

function reclassificationCents(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Укажите сумму с точностью до двух знаков после запятой')
  const cents = Math.round(Number(text) * 100)
  if (!Number.isSafeInteger(cents)) throw new Error('Недопустимая сумма')
  return cents
}

export function prepareAdvanceReclassification(snapshot, form) {
  const { advance, advancePeriod, settlementPeriods } = snapshot
  const settlement = settlementPeriods.find(row => row.salary_month === form.salary_month)
  if (!settlement || settlement.salary_month >= advancePeriod.salary_month) throw new Error('Выберите существующий более ранний зарплатный месяц')
  for (const period of [advancePeriod, settlement]) {
    if (!period?.id || period.employee_id !== advance.employee_id || (period.branch_id ?? null) !== (advance.branch_id ?? null)) throw new Error('Сотрудник или филиал периода не совпадает с авансом')
  }
  if (!advance?.id || advance.is_cancelled || advance.operation_type !== 'advance') throw new Error('Для исправления нужен действующий аванс')
  const amountCents = reclassificationCents(form.amount)
  const sourceCents = reclassificationCents(advance.amount)
  if (amountCents <= 0 || amountCents > sourceCents) throw new Error('Сумма исправления должна быть больше нуля и не больше исходного аванса')
  const reason = String(form.reason || '').trim()
  if (reason.length < 3 || reason.length > 1000) throw new Error('Укажите причину исправления: от 3 до 1000 символов')
  return JSON.parse(JSON.stringify({ advance_id: advance.id, employee_id: advance.employee_id,
    branch_id: advance.branch_id ?? null, salary_month: settlement.salary_month, amount: amountCents / 100, reason,
    expected: advance, expected_periods: { advance: advancePeriod, settlement } }))
}

export async function reclassifySalaryAdvance(client, requestKey, operation) {
  const { data, error } = await client.rpc('rms_reclassify_salary_advance', { p_request_key: requestKey, p_operation: operation })
  if (error) throw error
  const result = data?.operation
  const matches = row => row?.employee_id === operation.employee_id && (row.branch_id ?? null) === operation.branch_id
  const residualCents = Math.round((Number(operation.expected.amount) - operation.amount) * 100)
  const residual = result?.residual_advance
  const validResidual = residualCents > 0
    ? residual?.id && residual.id !== operation.advance_id && matches(residual)
      && residual.advance_date === operation.expected.advance_date && residual.operation_type === 'advance' && residual.is_cancelled !== true
      && Number(residual.amount) === residualCents / 100
    : residual === null
  if (typeof data?.replayed !== 'boolean' || result?.type !== 'advance_reclassification' || !result?.audit_id
      || !result.id || result.id !== result.payment?.id || result.advance?.id !== operation.advance_id
      || result.original_advance_id !== operation.advance_id || !validResidual
      || !matches(result.advance) || !matches(result.payment) || !matches(result.advance_period) || !matches(result.settlement_period)
      || result.advance.advance_date !== operation.expected.advance_date
      || result.advance.is_cancelled !== true || Number(result.advance.amount) !== Number(operation.expected.amount)
      || result.advance.operation_type !== operation.expected.operation_type || result.advance.comment !== operation.expected.comment
      || result.advance.created_at !== operation.expected.created_at || result.advance.created_by !== operation.expected.created_by
      || result.payment.payment_date !== operation.expected.advance_date || result.payment.salary_month !== operation.salary_month
      || result.payment.method !== 'cash' || result.payment.is_cancelled === true
      || Number(result.payment.amount) !== operation.amount
      || result.advance_period.id !== operation.expected_periods.advance.id
      || result.settlement_period.id !== operation.expected_periods.settlement.id
      || result.advance_period.salary_month !== operation.expected_periods.advance.salary_month
      || result.settlement_period.salary_month !== operation.salary_month) {
    const unconfirmed = new Error('Не удалось подтвердить результат исправления. Повторите тот же запрос для проверки.')
    unconfirmed.code = 'PAYROLL_UNCONFIRMED'
    throw unconfirmed
  }
  return data
}

export async function writePayrollAtomic(client, requestKey, operations) {
  const { data, error } = await client.rpc('rms_payroll_write_atomic', {
    p_request_key: requestKey,
    p_operations: operations
  })
  if (error) throw error
  if (!data || !Array.isArray(data.operations) || data.operations.length !== operations.length
      || data.operations.some(item => !item?.id || !item?.period?.id)) {
    const error = new Error('Не удалось подтвердить результат сохранения. Повторите тот же запрос для проверки.')
    error.code = 'PAYROLL_UNCONFIRMED'
    throw error
  }
  return data
}

export function matchedAccrualOperations(text) {
  const rows = JSON.parse(text)
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 200) throw new Error('Нужно от 1 до 200 сопоставленных строк')
  const ids = new Set()
  return rows.map(row => {
    if (!row.id || !row.employee_id || !row.salary_month || !('branch_id' in row) || !row.expected || !row.patch) throw new Error('Каждая строка требует ID периода, сотрудника, филиал, месяц, expected и patch')
    if (ids.has(row.id)) throw new Error('Один зарплатный период указан дважды')
    ids.add(row.id)
    if (!row.expected.updated_at || Number.isNaN(Date.parse(row.expected.updated_at))) throw new Error('Укажите исходный updated_at для защиты от одновременных изменений')
    const keys = Object.keys(row.patch)
    if (!keys.length || keys.some(key => !['worked_days','salary_gross'].includes(key))) throw new Error('Импорт меняет только отработанные дни и начисленную зарплату')
    for (const key of keys) {
      if (!(key in row.expected) || !Number.isFinite(row.patch[key]) || row.patch[key] < 0) throw new Error('Проверьте исходные и новые числовые значения')
    }
    return { type: 'accrual_patch', id: row.id, employee_id: row.employee_id, branch_id: row.branch_id,
      salary_month: row.salary_month, expected: row.expected, patch: row.patch }
  })
}
