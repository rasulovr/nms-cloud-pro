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
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261004062655_payroll_atomic_period_updates.sql',import.meta.url),'utf8'))
 await db.exec(`create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid$$;`)
 // PGlite cannot demote its bootstrap postgres. Alias only the migration's
 // temporary member target to an isolated schema-owning, non-superuser role.
 await db.exec(`create role synthetic_installer nosuperuser createrole bypassrls;
 do $$declare r record; begin
 for r in select schemaname,tablename from pg_tables where schemaname in ('public','auth','rms_payroll_private') loop
 execute format('alter table %I.%I owner to synthetic_installer',r.schemaname,r.tablename); end loop;
 for r in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','rms_payroll_private') loop
 execute format('alter function %I.%I(%s) owner to synthetic_installer',r.nspname,r.proname,r.args); end loop;
 end;$$;
 alter schema rms_payroll_private owner to synthetic_installer;
 grant usage,create on schema public,auth to synthetic_installer; set role synthetic_installer;`)
 assert.equal(await scalar("select rolsuper from pg_roles where rolname=current_user"),false)
 const installation=await fs.readFile(new URL('../supabase/migrations/20261004083647_payroll_advance_reclassification.sql',import.meta.url),'utf8')
 assert.equal((installation.match(/(?:to|from) postgres;/g)||[]).length,2)
 const aliasedInstallation=installation.replace(/(to|from) postgres;/g,'$1 synthetic_installer;')
 const earlyRevoke=aliasedInstallation.replace('revoke rms_payroll_reclassifier from synthetic_installer;','').replace('grant execute on function rms_payroll_private.reclassify_advance(text,jsonb) to authenticated;', 'revoke rms_payroll_reclassifier from synthetic_installer;\ngrant execute on function rms_payroll_private.reclassify_advance(text,jsonb) to authenticated;')
 await db.exec('begin;')
 await assert.rejects(()=>db.exec(earlyRevoke),e=>e.code==='42501')
 await db.exec('rollback;')
 assert.equal(await scalar("select to_regrole('rms_payroll_reclassifier')"),null)
 assert.equal(await scalar("select to_regclass('rms_payroll_private.reclassifications')"),null)
 await db.exec(aliasedInstallation)
 const membership=(await db.query("select member::regrole::text,admin_option,inherit_option,set_option from pg_auth_members where roleid='rms_payroll_reclassifier'::regrole")).rows
 assert.deepEqual(membership,[{member:'synthetic_installer',admin_option:true,inherit_option:false,set_option:false}])
 assert.equal(await scalar("select pg_has_role('synthetic_installer','rms_payroll_reclassifier','USAGE')"),false)
 assert.equal(await scalar("select pg_has_role('synthetic_installer','rms_payroll_reclassifier','SET')"),false)
 assert.equal(await scalar("select has_schema_privilege('rms_payroll_reclassifier','auth','USAGE')"),false)
 assert.equal(await scalar("select has_function_privilege('rms_payroll_reclassifier','auth.uid()','EXECUTE')"),true)
 passed++;console.log('PASS hosted non-superuser installation, old-order rollback, exact residual admin flags and no auth schema access')
 await db.exec('reset role;')
 await db.exec(await fs.readFile(new URL('./fixtures/revenue-workspace-schema.sql',import.meta.url),'utf8'))
 await db.exec(await fs.readFile(new URL('./fixtures/revenue-workspace-before.sql',import.meta.url),'utf8'))
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261004095829_payroll_reclassification_cash_readback.sql',import.meta.url),'utf8'))
 await db.exec(`insert into branches values('${branch}','Synthetic branch');insert into daily_expenses(id,branch_id,expense_date,amount) values(gen_random_uuid(),'${branch}','2026-10-02',9);`)
 const cashView=()=>scalar("select public.rms_revenue_day_workspace($1,'2026-10-02')",[branch])
 const dayTotal=w=>w.expenses.reduce((s,r)=>s+Number(r.amount),0)+w.salary_advances.reduce((s,r)=>s+Number(r.amount),0)+w.salary_correction_expenses.reduce((s,r)=>s+Number(r.amount),0)
 await admin()
 const cashBefore=await cashView()
 assert.equal(dayTotal(cashBefore),129);assert.equal(Number(cashBefore.month_stats.expenses),129)
 await test('capability and executor privilege boundary',async()=>{
  assert.equal(await scalar('select public.rms_payroll_can_write()'),true)
  assert.equal(await scalar("select pg_has_role('authenticated','rms_payroll_reclassifier','MEMBER')"),false)
  assert.equal((await db.query('update public.salary_advances set amount=1 where id=$1 returning id',[source])).rows.length,0)
  await root();const r=(await db.query("select rolcanlogin,rolsuper,rolbypassrls,rolcreaterole from pg_roles where rolname='rms_payroll_reclassifier'")).rows[0];assert.ok(Object.values(r).every(v=>v===false));await admin()
 })
 await test('both trusted JWT formats match auth.uid; caller payload cannot choose actor; malformed/unlinked claims fail closed',async()=>{
  const before=await snapshot(),op={...await operation(source,1),actor_id:outsider,user_id:outsider,is_admin:true}
  const claims=async(sub,json)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[sub,json])}
  for(const [label,sub,json] of [['legacy',uid,JSON.stringify({sub:outsider})],['json','',JSON.stringify({sub:uid})],['legacy-short-circuit',uid,'not-json']]){
   await claims(sub,json);assert.equal(await scalar('select auth.uid()'),uid)
   await db.exec('begin;')
   try{const r=await write('jwt-'+label,op);assert.equal(r.operation.payment.created_by,uid);assert.equal(r.operation.advance.cancelled_by,uid)}finally{await db.exec('rollback;')}
  }
  for(const [label,sub,json,code] of [['empty','','','28000'],['missing-sub','','{}','28000'],['invalid-sub','not-uuid','', '22P02'],['invalid-json','','not-json','22P02'],['unlinked',outsider,JSON.stringify({sub:uid}),'42501']]){
   await claims(sub,json);await assert.rejects(()=>write('jwt-denied-'+label,op),e=>e.code===code)
  }
  await claims(uid,'');await admin();assert.deepEqual(await snapshot(),before)
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
  const w=await cashView();assert.equal(dayTotal(w),129);assert.equal(Number(w.month_stats.expenses),129);assert.equal(Number(w.month_stats.reclassification_cash),24);assert.equal(w.salary_correction_expenses.length,1);assert.equal(w.salary_correction_expenses[0].original_advance_id,source);assert.equal(w.salary_correction_expenses[0].payment_date,'2026-10-02');assert.equal(w.salary_correction_expenses[0].id,source);assert.equal('salary_month' in w.salary_correction_expenses[0],false);assert.equal('audit_id' in w.salary_correction_expenses[0],false);assert.equal('payment_id' in w.salary_correction_expenses[0],false);assert.deepEqual(Object.keys(w.salary_correction_expenses[0]).sort(),['id','employee_id','branch_id','payment_date','amount','original_advance_id','employees','branches'].sort());assert.equal(Number(w.month_stats.reclassification_advance_cash),96)
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
  const w=await cashView();assert.equal(dayTotal(w),129);assert.equal(Number(w.month_stats.expenses),129);assert.equal(Number(w.month_stats.reclassification_cash),120);assert.equal(w.salary_advances.length,0);assert.equal(w.salary_correction_expenses.length,2)
  const otherDay=await scalar("select public.rms_revenue_day_workspace($1,'2026-10-03')",[branch]);assert.equal(dayTotal(otherDay),0);assert.equal(Number(otherDay.month_stats.reclassification_cash),120)
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
 await test('cash readback includes only verified linked active cash corrections, never token-only impostors',async()=>{
  const before=await cashView();await root();await db.exec(`insert into salary_payments(employee_id,branch_id,salary_month,payment_date,amount,method,comment) values('${employee}','${branch}','2026-09-01','2026-10-02',999,'cash','source_key=payroll-reclass:fake:payment;');`);await admin();assert.deepEqual(await cashView(),before)
  await root();await db.exec(`update salary_payments set is_cancelled=true where id='${result.operation.payment.id}'`);await admin();const after=await cashView();assert.equal(dayTotal(after),dayTotal(before)-24);assert.equal(Number(after.month_stats.expenses),Number(before.month_stats.expenses)-24)
  const otherBranch=await scalar("select public.rms_revenue_day_workspace('20000000-0000-0000-0000-000000000099','2026-10-02')");assert.equal(dayTotal(otherBranch),0);assert.equal(Number(otherBranch.month_stats.reclassification_cash),0)
 })
 console.log(`Payroll reclassification PostgreSQL integration: ${passed} tests passed`)
}finally{await db.close()}
