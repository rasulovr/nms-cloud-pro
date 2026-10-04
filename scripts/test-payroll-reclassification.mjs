import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {PGlite}=await import(process.env.PAYROLL_PGLITE_MODULE || '@electric-sql/pglite')
const db=new PGlite()
const uid='00000000-0000-0000-0000-000000000001',outsider='00000000-0000-0000-0000-000000000002'
const employee='10000000-0000-0000-0000-000000000001',branch='20000000-0000-0000-0000-000000000001'
const current='30000000-0000-0000-0000-000000000001',target='30000000-0000-0000-0000-000000000002',source='40000000-0000-0000-0000-000000000001'
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const root=()=>db.exec('reset role;')
const admin=()=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${uid}',false);set role authenticated`)
const write=(key,op)=>scalar('select public.rms_reclassify_salary_advance($1,$2::jsonb)',[key,JSON.stringify(op)])
const row=(table,id)=>scalar(`select to_jsonb(t) from public.${table} t where id=$1`,[id])
const operation=async(id=source,amount=24)=>({advance_id:id,employee_id:employee,branch_id:branch,salary_month:'2026-09-01',amount,reason:'Correct reviewed cash allocation',expected:await row('salary_advances',id),expected_periods:{advance:await row('salary_periods',current),settlement:await row('salary_periods',target)}})
const snapshot=async()=>{await root();const r=await scalar(`select jsonb_build_object('advances',(select jsonb_agg(to_jsonb(t) order by id) from public.salary_advances t),'payments',(select jsonb_agg(to_jsonb(t) order by id) from public.salary_payments t),'periods',(select jsonb_agg(to_jsonb(t) order by id) from public.salary_periods t),'audits',(select jsonb_agg(to_jsonb(t) order by id) from public.audit_logs t),'requests',(select jsonb_agg(to_jsonb(t) order by id) from rms_payroll_private.reclassifications t))`);await admin();return r}
let passed=0
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)}
const fail=async(key,op,match)=>{const before=await snapshot();await assert.rejects(()=>write(key,op),match);assert.deepEqual(await snapshot(),before)}
try{
 await db.exec(await fs.readFile(new URL('./fixtures/payroll-atomic-schema.sql',import.meta.url),'utf8'))
 await db.exec(`alter table public.salary_advances add column cancelled_at timestamptz,add column cancelled_by uuid,add column cancel_comment text;
 alter table public.salary_payments add column cancelled_at timestamptz,add column cancelled_by uuid,add column cancel_comment text;
 alter table public.audit_logs enable row level security;
 create function public.protect_salary_advance_24h() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_op='UPDATE' and not old.is_cancelled and new.is_cancelled and new.employee_id is not distinct from old.employee_id and new.branch_id is not distinct from old.branch_id and new.advance_date=old.advance_date and new.amount=old.amount and new.operation_type=old.operation_type then return new;end if;
 if old.created_at<now()-interval '24 hours' then raise exception 'Age-locked advance';end if;return new;end;$$;
 create trigger trg_salary_advances_24h_update before update on public.salary_advances for each row execute function public.protect_salary_advance_24h();
 create trigger trg_salary_advances_updated_at before update on public.salary_advances for each row execute function public.set_updated_at();
 insert into auth.users values('${uid}'),('${outsider}');insert into public.rms_internal_auth_accounts values('${uid}',true,true);
 insert into public.user_profiles values('${uid}',true,'admin'),('${outsider}',true,'admin');insert into public.employees values('${employee}','${branch}');
 insert into public.salary_periods(id,employee_id,branch_id,salary_month,salary_gross,salary_net,advance_amount,card_payment,cash_payment,deduction_amount,previous_balance_amount,comment) values
 ('${current}','${employee}','${branch}','2026-10-01',1000,873,120,16,37,7,81,'Keep October provenance'),
 ('${target}','${employee}','${branch}','2026-09-01',100,100,0,10,12,0,0,'Keep September provenance');
 insert into public.salary_advances(id,employee_id,branch_id,advance_date,amount,comment,created_at) values('${source}','${employee}','${branch}','2026-10-02',120,'Original source_key=synthetic-original; full provenance',now()-interval '5 days');`)
 for(const file of ['20261004062655_payroll_atomic_period_updates.sql','20261004083647_payroll_advance_reclassification.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 await admin()
 await test('capability and executor privilege boundary',async()=>{
  assert.equal(await scalar('select public.rms_payroll_can_write()'),true)
  assert.equal(await scalar("select pg_has_role('authenticated','rms_payroll_reclassifier','MEMBER')"),false)
  assert.equal((await db.query('update public.salary_advances set amount=1 where id=$1 returning id',[source])).rows.length,0)
  await root();const r=(await db.query("select rolcanlogin,rolsuper,rolbypassrls,rolcreaterole from pg_roles where rolname='rms_payroll_reclassifier'")).rows[0];assert.ok(Object.values(r).every(v=>v===false));await admin()
 })
 await test('invalid amount, reason, date and stale reviewed records fail without any writes',async()=>{
  for(const amount of [0,-1,1.111,121])await fail('invalid-'+amount,{...await operation(),amount},/amount|exceeds/)
  await fail('bad-month',{...await operation(),salary_month:'2026-10-01'},/earlier/)
  await fail('bad-reason',{...await operation(),reason:'x'},/reason/)
  await fail('bad-token',{...await operation(),reason:'source_key=untrusted'},/source key/)
  const stale=await operation();stale.expected.comment='stale';await fail('stale-source',stale,/changed since review/)
  const missing=await operation();delete missing.expected;await fail('missing-source',missing,/complete/)
  await fail('wrong-employee',{...await operation(),employee_id:outsider},/identity/)
  const badPeriod=await operation();badPeriod.expected_periods.advance.salary_gross=999;await fail('stale-period',badPeriod,/period changed/)
 })
 await test('over-settlement is rejected atomically',async()=>await fail('over-debt',await operation(source,101),/remaining prior salary debt/))
 let originalOp,result
 await test('old original retained; partial split conserves cash with actual date and unchanged manual fields',async()=>{
  originalOp=await operation();result=await write('partial-split',originalOp);const r=result.operation,before=originalOp.expected
  assert.equal(result.replayed,false);assert.equal(r.advance.id,source);assert.equal(r.advance.amount,before.amount);assert.equal(r.advance.comment,before.comment);assert.equal(r.advance.created_at,before.created_at);assert.equal(r.advance.is_cancelled,true)
  assert.equal(Number(r.residual_advance.amount),96);assert.equal(Number(r.payment.amount),24);assert.equal(r.payment.method,'cash');assert.equal(r.payment.salary_month,'2026-09-01');assert.equal(r.payment.payment_date,'2026-10-02');assert.equal(r.residual_advance.advance_date,'2026-10-02');assert.equal(Number(r.advance_period.advance_amount),96);assert.equal(Number(r.advance_period.salary_net),897)
  for(const field of ['salary_gross','deduction_amount','cash_payment','card_payment','previous_balance_amount','comment','created_by','created_at']){assert.equal(r.advance_period[field],originalOp.expected_periods.advance[field],field);assert.equal(r.settlement_period[field],originalOp.expected_periods.settlement[field],field)}
  assert.equal(Number(await scalar("select (select coalesce(sum(amount),0) from salary_advances where advance_date='2026-10-02' and not is_cancelled)+(select coalesce(sum(amount),0) from salary_payments where payment_date='2026-10-02' and not is_cancelled)")),120)
 })
 await test('lost-response and double-click retries do not duplicate journals or audit',async()=>{
  const before=await snapshot(),replay=await write('partial-split',originalOp);assert.equal(replay.replayed,true);assert.deepEqual(replay.operation,result.operation);assert.deepEqual(await snapshot(),before)
  await fail('partial-split',{...originalOp,amount:25},/different data/);await fail('new-key-same-source',originalOp,/active positive/)
 })
 await test('full settlement creates no zero residual; server fixes date and cash method; mutated replay rejected',async()=>{
  await root();await db.exec(`update public.salary_periods set salary_gross=150,salary_net=150 where id='${target}'`);await admin()
  const op={...await operation(result.operation.residual_advance.id,96),payment_date:'2030-01-01',method:'bank'},r=(await write('full-split',op)).operation
  assert.equal(r.residual_advance,null);assert.equal(r.payment.payment_date,'2026-10-02');assert.equal(r.payment.method,'cash');assert.equal(Number(r.advance_period.advance_amount),0)
  await assert.rejects(()=>write('partial-split',originalOp),/journals changed/)
 })
 await test('full before/after audit exists and private requests are immutable to authenticated callers',async()=>{
  await root();const a=await scalar("select to_jsonb(a) from public.audit_logs a where table_name='salary_advance_reclassification' and new_data->>'request_key'='partial-split'");assert.equal(a.user_id,uid);assert.equal(a.old_data.advance.id,source);assert.equal(a.new_data.payment.id,result.operation.payment.id);assert.ok(a.old_data.advance_period);assert.ok(a.old_data.settlement_period)
  await admin();await assert.rejects(()=>scalar('select count(*) from rms_payroll_private.reclassifications'),/permission denied/);await assert.rejects(()=>db.exec('delete from rms_payroll_private.reclassifications'),/permission denied/)
 })
 await test('anonymous, unlinked, inactive account/profile, non-admin and revoked permission denied',async()=>{
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','${outsider}',false);set role authenticated`);assert.equal(await scalar('select public.rms_payroll_can_write()'),false);await assert.rejects(()=>write('outsider',originalOp),/active linked/)
  for(const setting of ['update rms_internal_auth_accounts set is_active=false','update rms_internal_auth_accounts set is_admin=false','update user_profiles set is_active=false',"update user_profiles set role='reader'"]){await root();await db.exec(setting);await admin();await assert.rejects(()=>write('denied',originalOp),/active linked/);await root();await db.exec("update rms_internal_auth_accounts set is_active=true,is_admin=true;update user_profiles set is_active=true,role='admin'")}
  await db.exec('set role anon');await assert.rejects(()=>write('anon',originalOp),/permission denied/);await admin()
 })
 const next='40000000-0000-0000-0000-000000000002'
 await root();await db.exec(`insert into salary_advances(id,employee_id,branch_id,advance_date,amount) values('${next}','${employee}','${branch}','2026-10-02',10);update salary_periods set advance_amount=10,salary_net=983 where id='${current}'`);await admin()
 await test('mirror failure after every journal write rolls back everything and exact retry succeeds',async()=>{
  const op=await operation(next,5);await root();await db.exec(`create function public.fail_reclass_fixture() returns trigger language plpgsql as $$begin if new.id='${current}' then raise exception 'Injected mirror failure';end if;return new;end;$$;create trigger test_mirror_failure before update on salary_periods for each row execute function public.fail_reclass_fixture()`);await admin();await fail('rollback-retry',op,/Injected mirror failure/)
  await root();await db.exec('drop trigger test_mirror_failure on salary_periods');await admin();assert.equal((await write('rollback-retry',op)).replayed,false)
 })
 await test('audit insertion failure also rolls back cancellation and replacements',async()=>{
  const residual=await scalar('select id from salary_advances where not is_cancelled limit 1'),op=await operation(residual,1)
  await root();await db.exec(`create function public.fail_audit_fixture() returns trigger language plpgsql as $$begin if new.table_name='salary_advance_reclassification' then raise exception 'Injected audit failure';end if;return new;end;$$;create trigger test_audit_failure before insert on audit_logs for each row execute function public.fail_audit_fixture()`);await admin();await fail('audit-rollback',op,/Injected audit failure/)
  await root();await db.exec('drop trigger test_audit_failure on audit_logs');await admin()
 })
 console.log(`Payroll reclassification PostgreSQL integration: ${passed} tests passed`)
}finally{await db.close()}
