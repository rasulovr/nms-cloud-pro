import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.parts/part-05.jsxpart', import.meta.url), 'utf8')
const required = [
  'function parsePayrollImport',
  'async function importPayrollToRms',
  'salary_gross: gross',
  'salary_net: gross - advanceTotal - deduction',
  'is_active: false',
  "employment_status: 'terminated'",
  'Импорт из Excel: аванс за',
  'Ставки действующих сотрудников не меняются',
  'Повторный импорт заменяет только ранее импортированные авансы'
]

const missing = required.filter(marker => !source.includes(marker))
if (missing.length) throw new Error(`Payroll import v427 is incomplete: ${missing.join(', ')}`)
console.log('payroll import v427: OK')
