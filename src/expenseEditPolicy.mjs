// UI policy only. Authorization remains the authenticated expense RPC's responsibility.
// Keep this expense-specific: revenue and purchase edit windows must not change.
export function expenseEditAccess(expense, { isAdmin = false, withinWindow = false, automaticallyAllocated = false } = {}) {
  const active = Boolean(expense) && !expense.deleted_at
  const historical = active && !withinWindow
  const historicalCorrection = historical && isAdmin === true && !automaticallyAllocated
  return {
    historical,
    historicalCorrection,
    editable: active && (withinWindow || historicalCorrection),
    metadataEditable: active && withinWindow,
    // Historical cancellation needs a server-side once-only reversal guard first.
    cancellable: active && withinWindow
  }
}

export function expenseEditPatch(expense, draft, access) {
  if (!access.editable) throw new Error('Редактирование закрыто')
  const allowed = access.historicalCorrection
    ? ['amount', 'comment']
    : ['expense_date', 'category_id', 'custom_category', 'amount', 'comment']
  return Object.fromEntries(allowed.filter(key => {
    if (!Object.hasOwn(draft, key)) return false
    if (key === 'amount') return Number(draft[key] ?? 0) !== Number(expense[key] ?? 0)
    return (draft[key] ?? '') !== (expense[key] ?? '')
  }).map(key => [key, draft[key]]))
}
