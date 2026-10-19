import { BANK_BRANCH_IDS } from './profitability-bank.mjs'
export const BANK_2025_SNAPSHOT_TYPE = 'bank_report_2025_source_v1'
export const BANK_2025_SNAPSHOT_SCOPE = 'profitability:2025:bc4-crescent'
const sourceUrl = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit#gid=\d+&range=[A-Z]{1,3}[1-9]\d*(?::[A-Z]{1,3}[1-9]\d*)?$/
export function isBank2025Period(period) {
  return /^2025-(0[1-9]|1[0-2])-01$/.test(period?.from || '') && period.toExclusive > period.from && period.toExclusive <= '2026-01-01'
}
export function validateBank2025Snapshot(record) {
  const data = record?.snapshot_data
  if (!record?.id || record.snapshot_type !== BANK_2025_SNAPSHOT_TYPE || record.snapshot_scope !== BANK_2025_SNAPSHOT_SCOPE
    || data?.version !== 2 || data.year !== 2025 || data.currency !== 'AZN' || data.status !== 'verified'
    || data.managerMethodApproved !== true || !data.managerMethod || !Number.isFinite(Date.parse(data.verifiedAt))
    || !Array.isArray(data.rows) || data.rows.length !== 24) throw new Error('Нет полного проверенного источника отчёта за 2025')
  const keys = new Set()
  const rows = data.rows.map(row => {
    const key = `${row.branchId}:${row.month}`, evidence = row.payrollEvidence
    if (!BANK_BRANCH_IDS.includes(row.branchId) || !/^2025-(0[1-9]|1[0-2])$/.test(row.month || '') || keys.has(key)) throw new Error('Повтор или неверный месяц/филиал источника 2025')
    keys.add(key)
    if (['salaryBase','managerIncluded','salary','household'].some(key => typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0)
      || Math.abs(row.salary - row.salaryBase - row.managerIncluded) > 0.005) throw new Error('Начисления и менеджмент не сходятся')
    if (evidence?.kind !== 'named-monthly-gross' || evidence.column !== 'D' || evidence.holdCount !== 0
      || !Number.isInteger(evidence.expectedRows) || evidence.expectedRows < 1 || evidence.verifiedRows !== evidence.expectedRows
      || !Array.isArray(evidence.sourceUrls) || !evidence.sourceUrls.length || evidence.sourceUrls.some(url => !sourceUrl.test(url))) throw new Error('Поимённые начисления 2025 не полностью сверены')
    if (!sourceUrl.test(row.householdSourceUrl || '') || !/^[A-Z]{1,3}[1-9]\d*$/.test(row.householdCell || '')
      || typeof row.householdFormula !== 'string' || !row.householdFormula.startsWith('=')) throw new Error('Не подтверждён источник ХозТоваров 2025')
    return { branchId:row.branchId,month:row.month,salary:row.salary,salaryBase:row.salaryBase,managerIncluded:row.managerIncluded,household:row.household,
      sourceUrl:evidence.sourceUrls[0],salaryCell:'D · поимённые начисления',salaryFormula:'Сумма начислений D + согласованное распределение менеджмента',
      householdSourceUrl:row.householdSourceUrl,householdCell:row.householdCell,householdFormula:row.householdFormula,payrollEvidence:evidence }
  })
  return { year:2025,currency:'AZN',version:2,complete:true,persistent:true,snapshotId:record.id,verifiedAt:data.verifiedAt,managerMethod:data.managerMethod,rows,
    warnings:Array.isArray(data.warnings)?data.warnings.map(String):[],exclusions:Array.isArray(data.exclusions)?data.exclusions:[] }
}
export async function loadBank2025Snapshot(client, period) {
  if (!isBank2025Period(period)) return null
  const {data,error} = await client.from('rms_data_snapshots').select('id,snapshot_type,snapshot_scope,snapshot_data,created_at')
    .eq('snapshot_type',BANK_2025_SNAPSHOT_TYPE).eq('snapshot_scope',BANK_2025_SNAPSHOT_SCOPE).order('created_at',{ascending:false}).limit(2)
  if (error) throw new Error('Не удалось прочитать защищённый источник отчёта 2025: '+error.message)
  if (!data?.length) return null
  if (data.length !== 1) throw new Error('Найдено несколько источников 2025; требуется проверка версий')
  return validateBank2025Snapshot(data[0])
}
