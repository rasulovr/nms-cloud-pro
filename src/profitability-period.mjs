// Complete calendar months only; no financial proration or source changes.
const validMonth = value => /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value || '')
const nextMonth = value => {
  const [year, month] = value.split('-').map(Number)
  return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`
}
export function manualPeriod(start, end) {
  if (!validMonth(start) || !validMonth(end) || start > end) return null
  return { key: `range:${start}:${end}`, from: `${start}-01`, toExclusive: nextMonth(end), label: `${start} — ${end}` }
}
export function periodMonths(period) {
  const fallback = `${new Date().getFullYear()}-01`
  const start = period?.from?.slice(0, 7)
  const date = /^\d{4}-(0[1-9]|1[0-2])-01$/.test(period?.toExclusive || '') ? new Date(`${period.toExclusive}T00:00:00Z`) : null
  const end = date && Number.isFinite(date.getTime()) ? new Date(date.getTime() - 86400000).toISOString().slice(0, 7) : null
  return { start: validMonth(start) ? start : fallback, end: validMonth(end) ? end : fallback }
}
