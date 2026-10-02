import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { expenseEditAccess, expenseEditPatch } from '../src/expenseEditPolicy.mjs'

const part0 = await readFile('src/main.parts/part-00.jsxpart', 'utf8')
const part2 = await readFile('src/main.parts/part-02.jsxpart', 'utf8')
const part3 = await readFile('src/main.parts/part-03.jsxpart', 'utf8')
const now = Date.parse('2026-10-02T12:00:00Z')
const windowMs = 7 * 24 * 60 * 60 * 1000
const timeGuard = part0.match(/^const canEditWithinWeek = .*$/m)[0]
const within = vm.runInNewContext(`${timeGuard}; canEditWithinWeek`, { EDIT_WINDOW_MS: windowMs, Date: class extends Date { static now() { return now } } })
const old = { id: 'synthetic-expense', created_at: new Date(now - windowMs - 1).toISOString(), expense_date: '2026-09-01', amount: 12, comment: 'Synthetic fixture', category_id: null, custom_category: 'Test expense' }
const recent = { ...old, created_at: new Date(now - 1000).toISOString() }
const policy = (row, isAdmin, extra = {}) => expenseEditAccess(row, { isAdmin, withinWindow: within(row), ...extra })
assert.equal(within(old), false)
assert.equal(within(recent), true)
assert.equal(within({ ...old, created_at: new Date(now - windowMs).toISOString() }), true)
assert.equal(within({ ...old, created_at: null }), true, 'Preserve existing unknown-date semantics')
assert.equal(within({ ...old, created_at: 'invalid' }), false)
assert.equal(policy(old, false).editable, false)
assert.equal(policy(old, true).editable, true)
assert.equal(policy(old, true).metadataEditable, false)
assert.equal(policy(old, true).cancellable, false, 'Historical cancellation awaits guarded backend')
assert.equal(policy(old, 'admin').editable, false, 'Require explicit boolean admin decision')
assert.equal(policy(old, true, { automaticallyAllocated: true }).editable, false)
assert.equal(policy(recent, false).editable, true)
assert.equal(policy(recent, false).cancellable, true)
assert.equal(policy({ ...old, deleted_at: '2026-10-01' }, true).editable, false)
assert.equal(policy({ ...recent, deleted_at: '2026-10-01' }, true).cancellable, false)
assert.deepEqual(expenseEditPatch(old, { amount: 18, comment: 'Correction', expense_date: '2026-10-02', category_id: 'other', branch_id: 'other', deleted_at: 'now' }, policy(old, true)), { amount: 18, comment: 'Correction' })
assert.deepEqual(expenseEditPatch(old, { amount: '12', comment: 'Synthetic fixture' }, policy(old, true)), {}, 'No-op must not call RPC or create duplicate audit')
assert.deepEqual(expenseEditPatch(old, { comment: '' }, policy(old, true)), { comment: '' })
assert.throws(() => expenseEditPatch(old, { amount: 1 }, policy(old, false)), /Редактирование закрыто/)
assert.deepEqual(expenseEditPatch(recent, { expense_date: '2026-10-01', branch_id: 'other' }, policy(recent, false)), { expense_date: '2026-10-01' })
assert.match(part0, /<Revenue t=\{t\} focusExpense=\{revenueFocus\} isAdmin=\{isAdmin\}/)
assert.match(part2, /<ExpenseRow key=\{e.id\} expense=\{e\} isAdmin=\{isAdmin\}/)
assert.match(part2, /supabase\.rpc\('rms_expense_update_secure'/)
assert.match(part2, /supabase\.rpc\('rms_expense_cancel_secure'/)
assert.match(part2, /const editable = !cancelled && canEditWithinWeek\(row\)/, 'Revenue guard remains unchanged')
assert.match(part2, /const editable = !cancelled && canEditWithinWeek\(inflow\)/, 'Inflow guard remains unchanged')
assert.match(part3, /if \(pending.current\) return/)
assert.match(part3, /const saved = await onSave\(patch\)/)
assert.match(part3, /if \(saved === true\) setEditing\(false\)/)
assert.match(part3, /editing && createPortal/, 'Do not render a modal div under tbody')
console.log('Admin expense Preview policy: 27 checks passed (synthetic fixtures; no backend writes)')
