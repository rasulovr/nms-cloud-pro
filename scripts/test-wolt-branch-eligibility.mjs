import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/main.parts/part-02.jsxpart', import.meta.url), 'utf8')
const extract = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from)
  assert.ok(from >= 0 && to > from, `Missing source: ${start}`)
  return source.slice(from, to)
}
const context = vm.createContext({})
vm.runInContext(extract('function rmsCompactBusinessName(', 'function Revenue('), context)
const evaluate = code => vm.runInContext(code, context)
const eligible = ['BC1', 'BC2', 'BC3', 'Bistro', 'Bistronomia', ' bc 2 ', 'bc-2']
const ineligible = ['', '—', 'Admin', 'BC4', 'BC20', 'Unknown']
for (const name of eligible) {
  assert.equal(evaluate(`rmsBranchSupportsWolt(${JSON.stringify(name)})`), true, name)
}
for (const name of [...ineligible, null, undefined]) {
  context.name = name
  assert.equal(evaluate('rmsBranchSupportsWolt(name)'), false, String(name))
}

// Run the native category selection and revenue submission with synthetic data only.
const categorySelection = extract('  const selectedBranchName =', '\n  useEffect(')
const submit = extract('  async function addRevenueEntry()', '  async function updateRevenueEntry(')
const categories = [{ id: 'ordinary', name: 'Supplies' }, { id: 'wolt', name: 'Wolt Comission' }, { id: 'wolt-alias', name: 'Wolt service fee' }]
const writes = []
Object.assign(context, {
  branchId: 'test-branch', date: '2026-01-15', categories,
  form: { cash_amount: '10', bank_amount: '20', wolt_amount: '30', comment: 'Synthetic test' },
  parseNum: value => Number(value || 0), setMessage: () => {}, setForm: () => {},
  recalcExistingBazarExpenseForDate: async () => {}, load: async () => {},
  supabase: { rpc: async (name, args) => { writes.push({ name, args: JSON.parse(JSON.stringify(args)) }); return { error: null } } }
})
for (const name of [...eligible, ...ineligible]) {
  context.branches = [{ id: 'test-branch', name }]
  writes.length = 0
  const result = await evaluate(`(async () => {
    ${categorySelection}
    ${submit}
    await addRevenueEntry()
    return expenseCategoriesForBranch.map(category => category.id)
  })()`)
  const enabled = eligible.includes(name)
  assert.deepEqual(Array.from(result), enabled ? ['ordinary', 'wolt', 'wolt-alias'] : ['ordinary'], name)
  assert.deepEqual(writes, [{ name: 'rms_add_revenue_entry', args: {
    p_branch_id: 'test-branch', p_date: '2026-01-15',
    p_cash_amount: 10, p_bank_amount: 20, p_wolt_amount: enabled ? 30 : 0,
    p_comment: 'Synthetic test'
  } }], `${name}: preserve cash/bank and use the existing authorized RPC`)
}

assert.match(source, /woltEnabledForBranch && <MoneyInput label="Wolt — продажи расчётного периода"/)
assert.match(source, /woltEnabled=\{woltEnabledForBranch\}/, 'Existing-entry editing must share branch eligibility')
assert.match(source, /woltEnabled && <label><span>Wolt — продажи расчётного периода<\/span>/)
assert.match(source, /const editable = !cancelled && canEditWithinWeek\(row\)/, 'Existing edit permissions must remain enforced')
assert.match(source, /const editedWolt = woltEnabled \? parseNum\(wolt\) : parseNum\(row.wolt_amount\)/, 'Hidden existing Wolt amounts must be preserved')
console.log('Wolt branch eligibility: BC2, existing branches, categories, RPC payloads and edit guards passed')
