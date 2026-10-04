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
  if (error?.code === 'PGRST202' || /rms_payroll_write_atomic.*(schema cache|not find|does not exist)/i.test(text)) {
    return 'Сохранение зарплаты недоступно: обновление базы ещё не установлено. Операция не отправлена в старый журнал.'
  }
  if (error?.code === '42501' || /active linked RMS administrator/.test(text)) {
    return 'Недостаточно прав для изменения зарплаты. Требуется активный администратор RMS с правом записи зарплаты.'
  }
  if (error?.code === '40001') return 'Данные изменились после загрузки. Обновите список и проверьте суммы перед повтором.'
  if (/fetch|network|connection|timeout/i.test(text)) return 'Не удалось подтвердить сохранение. Повторите ту же операцию: ключ запроса защищает от дубля.'
  return `Операция не сохранена: ${text}`
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
