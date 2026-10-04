import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { PGlite } = await import(process.env.PAYROLL_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const uid = '00000000-0000-0000-0000-000000000001'
const outsider = '00000000-0000-0000-0000-000000000002'
const employee = '10000000-0000-0000-0000-000000000001'
const otherEmployee = '10000000-0000-0000-0000-000000000002'
const branch = '20000000-0000-0000-0000-000000000001'
const period = '30000000-0000-0000-0000-000000000001'
const legacyId = '40000000-0000-0000-0000-000000000001'
const schema = await fs.readFile(new URL('./fixtures/payroll-atomic-schema.sql', import.meta.url),'utf8')
const migration = await fs.readFile(new URL('../supabase/migrations/20261004062655_payroll_atomic_period_updates.sql', import.meta.url),'utf8')
const query = (sql, params=[])=>db.query(sql, params)
const scalar = async(sql, params=[]) => Object.values((await query(sql,params)).rows[0])[0]
const admin = ()=>db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid}',false); set role authenticated;`)
const root = ()=>db.exec('reset role;')
const write = (key, operations)=>scalar('select public.rms_payroll_write_atomic($1,$2::jsonb)', [key,JSON.stringify(operations)])
const expectError=async(fn,match)=>assert.rejects(fn,match)
const getPeriod=()=>scalar('select to_jsonb(s) from public.salary_periods s where id=$1',[period])
const advance=(amount, source='fixture-cash')=>({type:'advance',employee_id:employee,branch_id:branch,advance_date:'2026-10-03',amount,comment:`Synthetic fixture; source_key=${source}; cash`})
const reconcile=()=>({type:'reconcile',id:period,employee_id:employee,branch_id:branch,salary_month:'2026-10-01'})
let passed=0
const test=async(label,fn)=>{await fn();passed++;console.log(`PASS ${label}`)}
try {
 await db.exec(schema)
 await db.exec(`insert into auth.users values('${uid}'),('${outsider}');
 insert into public.rms_internal_auth_accounts values('${uid}',true,true);
 insert into public.user_profiles values('${uid}',true,'admin'),('${outsider}',true,'admin');
 insert into public.employees values('${employee}','${branch}'),('${otherEmployee}',null);
 insert into public.salary_periods(id,employee_id,branch_id,salary_month,worked_days,salary_gross,card_payment,cash_payment,advance_amount,deduction_amount,salary_net,comment,previous_balance_amount,created_by)
 values('${period}','${employee}','${branch}','2026-10-01',10,1000,16,37,5,13,982,'Keep original provenance',81,'${uid}');
 insert into public.salary_advances(id,employee_id,branch_id,advance_date,amount,comment) values
 ('${legacyId}','${employee}','${branch}','2026-10-03',125,'Legacy fixture source_key=fixture-cash; retain comment'),
 (gen_random_uuid(),'${employee}','${branch}','2026-10-01',5,'Earlier manual advance');`)
 await admin()
 await test('baseline reproduces a silently stale period UPDATE under missing RLS policy',async()=>{
   const updated=await query('update public.salary_periods set advance_amount=130 where id=$1 returning id',[period]);assert.equal(updated.rows.length,0)
   assert.equal(Number((await getPeriod()).advance_amount),5)
 })
 await root();await db.exec(migration);await admin()
 await test('existing source-key journal is reconciled without insertion',async()=>{
   const before=await scalar('select count(*) from public.salary_advances')
   const result=await write('recover-legacy',[advance(125)])
   assert.equal(result.operations[0].id,legacyId)
   assert.equal(await scalar('select count(*) from public.salary_advances'),before)
   const row=await getPeriod();assert.equal(Number(row.advance_amount),130);assert.equal(Number(row.salary_net),857)
   assert.equal(row.comment,'Keep original provenance');assert.equal(Number(row.previous_balance_amount),81)
   assert.equal(Number(row.card_payment),16);assert.equal(Number(row.cash_payment),37)
 })
 await test('request retries are identical and changed payload reuse is rejected',async()=>{
   assert.equal((await write('recover-legacy',[advance(125)])).replayed,true)
   await expectError(()=>write('recover-legacy',[advance(126)]),/different data/)
   await expectError(()=>write('different-key',[advance(126)]),/conflicts/)
 })
 await test('new journal and mirror commit together with the actual advance month',async()=>{
   const result=await write('new-advance',[advance(12.34,'fixture-second')]);assert.equal(result.replayed,false)
   assert.equal(Number((await getPeriod()).advance_amount),142.34)
   const other={...advance(9,'fixture-other-month'),advance_date:'2026-11-01'}
   await write('other-month',[other]);assert.equal(Number((await getPeriod()).advance_amount),142.34)
   assert.equal(Number(await scalar(`select advance_amount from public.salary_periods where employee_id=$1 and salary_month='2026-11-01'`,[employee])),9)
 })
 await test('matched worked-days patch preserves source gross and all unrelated fields',async()=>{
   const before=await getPeriod()
   await write('days-only',[{...reconcile(),type:'period_patch',expected:{worked_days:10},patch:{worked_days:12}}])
   const after=await getPeriod();assert.equal(Number(after.worked_days),12)
   for(const key of ['salary_gross','card_payment','cash_payment','deduction_amount','previous_balance_amount','comment','created_by','created_at','employee_id','branch_id','salary_month']) assert.equal(after[key],before[key],key)
 })
 await test('a stale second patch rolls back the entire batch and leaves no retry record',async()=>{
   const count=await scalar('select count(*) from public.salary_advances'); const before=await getPeriod()
   await expectError(()=>write('rollback-batch',[advance(8,'fixture-rolled-back'),{...reconcile(),type:'period_patch',expected:{worked_days:10},patch:{worked_days:13}}]),/changed since review/)
   assert.equal(await scalar('select count(*) from public.salary_advances'),count)
   assert.deepEqual(await getPeriod(),before)
   assert.equal(Number(await scalar(`select count(*) from rms_payroll_private.requests where request_key='rollback-batch'`)),0)
 })
 await test('invalid amounts, branch mismatches, and unsafe patch fields fail closed',async()=>{
   for(const amount of [-1,0,1.123]) await expectError(()=>write('bad-amount-'+amount,[advance(amount,'bad-'+amount)]),/amount/)
   await expectError(()=>write('bad-branch',[{...advance(1),branch_id:null}]),/branch changed/)
   await expectError(()=>write('bad-patch',[{...reconcile(),type:'period_patch',expected:{employee_id:employee},patch:{employee_id:otherEmployee}}]),/Unsupported payroll patch/)
 })
 await test('period write failure rolls back the preceding journal insert',async()=>{
   const count=await scalar('select count(*) from public.salary_advances')
   await root();await db.exec('drop policy rms_salary_periods_linked_admin_update on public.salary_periods');await admin()
   await expectError(()=>write('missing-policy',[advance(7,'fixture-no-policy')]),/denied|row-level security/)
   assert.equal(await scalar('select count(*) from public.salary_advances'),count)
   await root();await db.exec(`create policy rms_salary_periods_linked_admin_update on public.salary_periods for update to authenticated using ((select rms_payroll_private.can_write())) with check ((select rms_payroll_private.can_write()))`);await admin()
 })
 await test('ordinary self-labelled admin profiles do not grant the new payroll permission',async()=>{
   await db.exec(`reset role;select set_config('request.jwt.claim.sub','${outsider}',false);set role authenticated`)
   await expectError(()=>write('untrusted-admin',[advance(1)]),/active linked RMS administrator/)
   assert.equal((await query('update public.salary_periods set salary_gross=999 where id=$1 returning id',[period])).rows.length,0)
   await admin()
 })
 await test('inactive trusted accounts and anonymous callers are denied',async()=>{
   await root();await db.exec(`update public.rms_internal_auth_accounts set is_active=false where auth_user_id='${uid}'`);await admin()
   await expectError(()=>write('inactive',[advance(1)]),/active linked RMS administrator/)
   await root();await db.exec(`update public.rms_internal_auth_accounts set is_active=true where auth_user_id='${uid}';set role anon`)
   await expectError(()=>write('anon',[advance(1)]),/permission denied/);await admin()
 })
 await test('payment plus advance split commits atomically without replacing manual cash/card fields',async()=>{
   await root();await db.exec(`insert into public.salary_periods(employee_id,branch_id,salary_month,salary_gross,salary_net) values('${employee}','${branch}','2026-09-01',0.75,0.75)`);await admin()
   const payment={type:'payment',employee_id:employee,branch_id:branch,salary_month:'2026-09-01',payment_date:'2026-10-03',method:'cash',amount:0.75,expected_prior_debt:0.75,comment:'Synthetic source_key=fixture-prior-payment; cash'}
   const result=await write('split-payment',[payment,{...advance(11.25,'fixture-split-advance'),expected_prior_debt:0}]);assert.equal(result.operations.length,2)
   assert.equal(Number(await scalar('select amount from public.salary_payments where id=$1',[result.operations[0].id])),0.75)
   assert.equal(Number((await getPeriod()).card_payment),16);assert.equal(Number((await getPeriod()).cash_payment),37)
   await expectError(()=>write('split-bad',[{...payment,expected_prior_debt:0.75,comment:'new fixture'},advance(-2,'bad-split')]),/debt changed/)
   assert.equal(Number(await scalar('select count(*) from public.salary_payments')),1)
 })
 await test('reconciliation excludes cancelled journals, preserves employee master, and retains audit triggers',async()=>{
   await root();await db.exec(`insert into public.salary_advances(employee_id,branch_id,advance_date,amount,is_cancelled) values('${employee}','${branch}','2026-10-02',999,true)`);await admin()
   const before=await getPeriod();await write('reconcile',[reconcile()]);assert.equal((await getPeriod()).advance_amount,before.advance_amount)
   await root();assert.ok(Number(await scalar('select count(*) from public.audit_logs where user_id=$1',[uid]))>0)
   assert.equal(Number(await scalar('select count(*) from public.employees')),2)
   assert.equal(Number(await scalar(`select count(*) from pg_trigger where tgname in ('trg_audit_salary_periods','trg_salary_periods_updated_at')`)),2)
 })
 await admin()
 await test('matched accrual patches guard the complete reviewed row timestamp',async()=>{
   const before=await getPeriod()
   await expectError(()=>write('accrual-no-time',[{...reconcile(),type:'accrual_patch',expected:{worked_days:Number(before.worked_days)},patch:{worked_days:13}}]),/updated_at/)
   await expectError(()=>write('accrual-stale-time',[{...reconcile(),type:'accrual_patch',expected:{updated_at:'2000-01-01T00:00:00Z',worked_days:Number(before.worked_days)},patch:{worked_days:13}}]),/changed since review/)
   await write('accrual-exact',[{...reconcile(),type:'accrual_patch',expected:{updated_at:before.updated_at,worked_days:Number(before.worked_days)},patch:{worked_days:13}}])
   assert.equal(Number((await getPeriod()).worked_days),13)
 })
 await test('linked non-admins, inactive profiles and revoked salary permission are denied',async()=>{
   for(const setting of ['update public.rms_internal_auth_accounts set is_admin=false', 'update public.user_profiles set is_active=false', "update public.user_profiles set role='readonly'"]){
     await root();await db.exec(setting);await admin()
     await expectError(()=>write('denied-extra',[advance(1)]),/active linked RMS administrator/)
     await root();await db.exec("update public.rms_internal_auth_accounts set is_admin=true;update public.user_profiles set is_active=true,role='admin'");await admin()
   }
 })
 await test('cancelled replay and ambiguous source tokens fail without new journals',async()=>{
   await expectError(()=>write('ambiguous-source',[{...advance(2,'one'),comment:'source_key=one; source_key=two;'}]),/Only one source_key/)
   await root();await db.exec(`update public.salary_advances set is_cancelled=true where id='${legacyId}'`);await admin()
   await expectError(()=>write('recover-legacy',[advance(125)]),/cancelled/)
   await expectError(()=>write('cancelled-new-key',[advance(125)]),/conflicts/)
 })
 await test('private request records cannot be updated or deleted by authenticated callers',async()=>{
   await expectError(()=>query("update rms_payroll_private.requests set result='{}'"),/permission denied/)
   await expectError(()=>query('delete from rms_payroll_private.requests'),/permission denied/)
 })
 console.log(`Payroll PostgreSQL integration: ${passed} tests passed`)
} finally {await db.close()}
