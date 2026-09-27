import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')
const sharedSource = fs.readFileSync(new URL('../src/main.parts/part-00.jsxpart', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

const checks = [
  ['default debts overview', "useState('overview')"],
  ['clear debt heading', 'Долги поставщикам'],
  ['supplier or entity search', 'debtWorkspaceSearch'],
  ['status filter', 'debtWorkspaceStatus'],
  ['supplier A4 debt table', 'debt-sheet-table'],
  ['monthly receipts', 'Поступило за месяц'],
  ['monthly payments', 'Оплачено за месяц'],
  ['VOEN debt summary', 'debt-voen-summary'],
  ['full payment ledger pagination', "fetchDebtLedgerRows('supplier_payments'"],
  ['operations tab', "debtWorkspaceTab === 'operations'"],
  ['analytics tab', "debtWorkspaceTab === 'analytics'"],
  ['debt formula explanation', 'стартовый долг + все поступления − все оплаты'],
  ['supplier statement A4 window', 'Акт сверки взаиморасчётов'],
  ['full supplier history', 'Вся история операций'],
  ['debt before payment column', 'Долг до оплаты'],
  ['running debt column', 'Остаток долга'],
  ['total payments in statement', 'Общая сумма оплат'],
  ['supplier invoice A4 window', 'function openSupplierPurchaseA4'],
  ['invoice A4 print format', '@page{size:A4 portrait'],
  ['invoice A4 actions', 'Просмотр A4'],
  ['supplier VOEN loaded for A4', 'suppliers(id,name,voen)'],
  ['A4 generated in business timezone', 'formatBusinessDateTime()']
]

for (const [label, token] of checks) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`)
}

for (const token of ["RMS_BUSINESS_TIME_ZONE = 'Asia/Baku'", 'const todayISO = () => toBusinessISODate(new Date())']) {
  if (!sharedSource.includes(token)) throw new Error(`Missing Baku business date rule: ${token}`)
}

for (const token of ['.debt-workspace-tabs', '.debt-a4-sheet', '@media (max-width:600px)']) {
  if (!styles.includes(token)) throw new Error(`Missing responsive debt style: ${token}`)
}

console.log('Debts workspace v432 checks passed')
