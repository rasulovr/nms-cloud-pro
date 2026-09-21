import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

const checks = [
  ['default debts overview', "useState('overview')"],
  ['clear debt heading', 'Долги поставщикам'],
  ['supplier or entity search', 'debtWorkspaceSearch'],
  ['status filter', 'debtWorkspaceStatus'],
  ['supplier debt table', 'debt-main-table'],
  ['operations tab', "debtWorkspaceTab === 'operations'"],
  ['analytics tab', "debtWorkspaceTab === 'analytics'"],
  ['debt formula explanation', 'стартовый долг + поступления − оплаты']
]

for (const [label, token] of checks) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`)
}

for (const token of ['.debt-workspace-tabs', '.debt-status-badge', '@media (max-width:600px)']) {
  if (!styles.includes(token)) throw new Error(`Missing responsive debt style: ${token}`)
}

console.log('Debts workspace v432 checks passed')
