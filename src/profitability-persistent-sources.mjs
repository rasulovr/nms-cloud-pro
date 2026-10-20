import { classifyPurchaseItems, loadCompletePurchaseItems } from './purchase-items-classification.mjs'
// Classifications are read from existing imported purchase provenance.
// No supplier-name heuristics, financial constants, new expenses or source-store.
export const PURCHASE_CLASSIFICATION_PREFIX = 'RMS_REPORT_CLASSIFICATION_V1:'
export const BANK_TAX_BRANCH_IDS = ['0dad369d-eac6-4cf9-bb06-b9d010714d6e', 'e7e0f06a-610f-499b-9e9a-e1f2e2c23410']
const sheetsCell = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit#gid=\d+&range=[A-Z]{1,3}[1-9]\d*$/
export function purchaseReportClassification(purchase) {
  const lines = String(purchase.comment || '').split(/\r?\n/).filter(line => line.startsWith(PURCHASE_CLASSIFICATION_PREFIX))
  if (!lines.length) return null
  if (lines.length !== 1) throw new Error(`Повтор классификации закупки ${purchase.id}`)
  let source
  try { source = JSON.parse(lines[0].slice(PURCHASE_CLASSIFICATION_PREFIX.length)) } catch { throw new Error(`Повреждён источник закупки ${purchase.id}`) }
  if (source.version !== 1 || source.category !== 'household'
      || source.purchaseId !== purchase.id || source.date !== purchase.purchase_date
      || typeof source.amount !== 'number' || !Number.isFinite(source.amount) || source.amount < 0
      || !Number.isFinite(Number(purchase.total_amount)) || Math.abs(source.amount - Number(purchase.total_amount)) > 0.005
      || !sheetsCell.test(source.classificationSource || '') || !sheetsCell.test(source.receiptSource || '')
      || !Number.isFinite(Date.parse(source.verifiedAt))) {
    throw new Error(`Источник ХозТоваров не совпадает с закупкой ${purchase.id}; нужна повторная сверка`)
  }
  return source
}
export function bankScopeTaxRate(branchId, configuredRate, from, toExclusive) {
  if (from >= '2025-01-01' && toExclusive <= '2026-01-01' && from < toExclusive && BANK_TAX_BRANCH_IDS.includes(String(branchId))) return 8
  const rate = Number(configuredRate)
  return Number.isFinite(rate) && rate > 0 ? rate : 8
}
export function partialHistoricalPayrollMonths(periods) {
  // An audited net-zero subset must never certify that the entire month is complete.
  return [...new Set(periods.filter(row => String(row.comment || '').includes('net-zero historical source'))
    .map(row => String(row.salary_month || '').slice(0, 7)).filter(month => /^\d{4}-\d{2}$/.test(month)))].sort()
}

// Markers take precedence. Query only already date-filtered, unmarked2026 purchase IDs.
export async function loadPurchaseReportClassifications(client, purchases) {
  const classifications = new Map(purchases.map(purchase => [purchase.id, purchaseReportClassification(purchase)]))
  const candidates = purchases.filter(purchase => !classifications.get(purchase.id)
    && purchase.purchase_date >= '2026-01-01' && purchase.purchase_date < '2027-01-01')
  const grouped = await loadCompletePurchaseItems(client, candidates)
  candidates.forEach(purchase => classifications.set(purchase.id, classifyPurchaseItems(purchase, grouped.get(purchase.id), true)))
  return classifications
}
