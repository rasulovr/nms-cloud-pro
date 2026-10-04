import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

// Only an HTTPS Preview receives this isolated UI fixture. Production builds do
// not contain the page. Its mock client has no credentials/database URL, and
// its CSP blocks every network connection even if a test handler regresses.
if (process.env.VERCEL_ENV !== 'preview') {
  await rm('dist/__payroll_synthetic.html', { force: true })
  await rm('dist/__payroll_reclassification_synthetic.html', { force: true })
  await rm('dist/__payroll_cash_synthetic.html', { force: true })
  console.log('Payroll synthetic UI fixture omitted outside Preview')
  process.exit(0)
}
const dir = path.join(process.cwd(), '.test-results', 'payroll-preview')
const run = spawnSync(process.execPath, ['scripts/test-payroll-browser.mjs'], {
  stdio: 'inherit', env: { ...process.env, EXPORT_FIXTURE_ONLY: '1', PAYROLL_BROWSER_EVIDENCE: dir }
})
if (run.status !== 0) process.exit(run.status || 1)
const source = path.join(dir, 'payroll-fixture.html')
const html = await readFile(source, 'utf8')
if (!html.includes("connect-src 'none'") || html.includes('VITE_SUPABASE_ANON_KEY')) throw new Error('Unsafe preview fixture')
await mkdir('dist', { recursive: true })
await copyFile(source, 'dist/__payroll_synthetic.html')
const correction = spawnSync(process.execPath, ['scripts/test-payroll-reclassification-client.mjs'], {
  stdio: 'inherit', env: { ...process.env, EXPORT_FIXTURE_ONLY: '1', PAYROLL_BROWSER_EVIDENCE: dir }
})
if (correction.status !== 0) process.exit(correction.status || 1)
const correctionSource = path.join(dir, 'reclassification-fixture.html')
const correctionHtml = await readFile(correctionSource, 'utf8')
if (!correctionHtml.includes("connect-src 'none'") || correctionHtml.includes('VITE_SUPABASE_ANON_KEY')) throw new Error('Unsafe correction preview fixture')
await copyFile(correctionSource, 'dist/__payroll_reclassification_synthetic.html')
const cash = spawnSync(process.execPath, ['scripts/test-payroll-reclassification-cash-client.mjs'], {
  stdio: 'inherit', env: { ...process.env, EXPORT_FIXTURE_ONLY: '1', PAYROLL_BROWSER_EVIDENCE: dir }
})
if (cash.status !== 0) process.exit(cash.status || 1)
const cashSource = path.join(dir, 'revenue-correction-fixture.html')
const cashHtml = await readFile(cashSource, 'utf8')
if (!cashHtml.includes("connect-src 'none'") || cashHtml.includes('VITE_SUPABASE_ANON_KEY')) throw new Error('Unsafe cash preview fixture')
await copyFile(cashSource, 'dist/__payroll_cash_synthetic.html')
console.log('Isolated payroll UI Preview fixture generated')
