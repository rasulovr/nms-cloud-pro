import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { PGlite } = await import(process.env.PRODUCTS_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const schema = await fs.readFile(new URL('./fixtures/products-report-source-schema.sql', import.meta.url), 'utf8')
const sql = await fs.readFile(new URL('../src/rms_products_report_source_v1.sql', import.meta.url), 'utf8')
const uid = '00000000-0000-0000-0000-000000000001'
const outsider = '00000000-0000-0000-0000-000000000002'
const uuid = (prefix, n) => `${prefix}0000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const purchase = n => uuid('4', n)
const product = n => uuid('3', n)
const branch = n => uuid('2', n)
const item = n => uuid('5', n)
const query = (query, params = []) => db.query(query, params)
const scalar = async (sql, params = []) => Object.values((await query(sql, params)).rows[0])[0]
const root = () => db.exec('reset role')
const actor = (id = uid, role = 'authenticated') => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id}', false); set role ${role}`)
const source = (from = null, to = null, branchId = null) => scalar('select public.rms_products_report_source_v1($1::date, $2::date, $3::uuid)', [from, to, branchId])
const full = () => scalar('select public.fixture_legacy_products_source()')
const fields = ['id', 'supplier_id', 'branch_id', 'purchase_date', 'invoice_number', 'created_at', 'deleted_at', 'suppliers', 'branches']
const itemFields = ['id', 'product_id', 'quantity', 'unit', 'unit_price', 'total_amount', 'supplier_products']
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key]]))
const compactProjection = rows => rows.map(row => ({ ...pick(row, fields), supplier_purchase_items: row.supplier_purchase_items.map(i => pick(i, itemFields)) }))
const filterLegacy = (rows, from, to, branchId) => rows.filter(p => !p.deleted_at
  && (!branchId || p.branch_id === branchId)
  && (!from || (p.purchase_date && p.purchase_date >= from))
  && (!to || (p.purchase_date && p.purchase_date < to)))
const verifyComplete = result => {
  assert.equal(result.version, 1)
  assert.equal(result.complete, true)
  assert.equal(result.legacyRequired, false)
  assert.equal(result.purchase_count, result.rows.length)
  assert.equal(result.matching_count, result.rows.length)
  assert.equal(result.item_count, result.rows.reduce((sum, p) => sum + p.supplier_purchase_items.length, 0))
  assert.equal(new Set(result.rows.map(p => p.id)).size, result.rows.length)
}
const verifyUnsupported = (result, reason) => {
  assert.equal(result.version, 1)
  assert.equal(result.complete, false)
  assert.equal(result.legacyRequired, true)
  assert.equal(result.reason, reason)
  assert.deepEqual(result.rows, [])
  assert.equal(result.purchase_count, 0)
  assert.equal(result.item_count, 0)
}
const assertParity = async (from = null, to = null, branchId = null) => {
  const result = await source(from, to, branchId)
  verifyComplete(result)
  const legacy = await full()
  assert.equal(result.source_count, legacy.length)
  assert.deepEqual(result.rows, compactProjection(filterLegacy(legacy, from, to, branchId)))
  return result
}
const expectError = async (fn, match) => {
  await db.exec('savepoint expected_failure')
  try { await assert.rejects(fn, match) }
  finally { await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure') }
}
let passed = 0
const test = async (label, fn) => {
  await db.exec('begin')
  try { await fn(); passed++; console.log(`PASS ${label}`) }
  finally { await db.exec('rollback'); await actor() }
}
try {
  await db.exec(schema)
  await db.exec(`
    insert into public.user_profiles values ('${uid}', true, 'admin'), ('${outsider}', true, 'readonly');
    insert into public.suppliers values ('${uuid('1', 1)}', 'Fixture supplier', repeat('unused', 20));
    insert into public.branches values ('${branch(1)}', 'Branch A', null), ('${branch(2)}', 'Branch B', null);
    insert into public.supplier_products
      select ('30000000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'Product '||g,
        case when g = 5 then null else 'Category '||(g%2) end, 'kg', repeat('unused',20)
      from generate_series(1,5) g;
    insert into public.supplier_purchases
      select ('40000000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid,
        '${uuid('1', 1)}', case when g%2=0 then '${branch(1)}'::uuid else '${branch(2)}'::uuid end,
        date '2026-09-01' + g%50, 'INV-'||g, timestamptz '2026-10-01T00:00:00Z' + g * interval '1 second',
        case when g%101=0 then timestamptz '2026-10-10T00:00:00Z' else null end,
        'Synthetic provenance', jsonb_build_object('provenance', repeat('x',4096))
      from generate_series(1,620) g;
    insert into public.supplier_purchase_items
      select ('50000000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid,
        ('40000000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid,
        ('30000000-0000-0000-0000-' || lpad((g%5+1)::text,12,'0'))::uuid,
        (g%7+1)::numeric / 10, 'kg', (g%13+1)::numeric / 100, ((g%7+1)*(g%13+1))::numeric/1000,
        null, jsonb_build_object('provenance', repeat('y',1024))
      from generate_series(1,619) g;
    insert into public.supplier_purchase_items values
      ('${item(900003)}','${purchase(1)}','${product(2)}',2,'g',10,0,null,null),
      ('${item(900001)}','${purchase(1)}','${product(2)}',0,'kg',0,0,null,null),
      ('${item(900002)}','${purchase(1)}','${product(2)}',null,null,null,null,null,null);
    insert into public.supplier_purchases(id,purchase_date,created_at,branch_id,invoice_number) values
      ('${purchase(621)}',null,null,'${branch(1)}','NULL-DATE'),
      ('${purchase(622)}','2026-10-01',null,'${branch(1)}','NULL-CREATED'),
      ('${purchase(623)}','2026-10-01','2026-09-01T00:00:00Z','${branch(1)}','LOWER-BOUND'),
      ('${purchase(624)}','2026-11-01','2026-10-01T00:00:00Z','${branch(1)}','UPPER-BOUND'),
      ('${purchase(625)}','2026-10-04','2026-10-04T00:00:00Z','${branch(99)}','MISSING-JOINS');
  `)
  // Verify the proposal leaves all existing table ACLs/policies untouched.
  const securityBefore = await scalar(`select jsonb_build_object(
    'tables', (select jsonb_agg(jsonb_build_array(relname, relacl, relrowsecurity) order by relname) from pg_class where relnamespace='public'::regnamespace and relkind='r'),
    'policies', (select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'))`)
  await db.exec(sql)
  const securityAfter = await scalar(`select jsonb_build_object(
    'tables', (select jsonb_agg(jsonb_build_array(relname, relacl, relrowsecurity) order by relname) from pg_class where relnamespace='public'::regnamespace and relkind='r'),
    'policies', (select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'))`)
  assert.deepEqual(securityAfter, securityBefore)
  await actor()

  await test('complete compact source includes more than 500 purchases with exact legacy values and order', async () => {
    const result = await assertParity()
    assert.equal(result.source_count, 625)
    assert.ok(result.purchase_count > 500)
    assert.equal(result.rows.at(-1).purchase_date, null)
    const ratio = JSON.stringify(result).length / JSON.stringify(await full()).length
    assert.ok(ratio < 0.2, `synthetic compact/full payload ratio ${ratio}`)
    console.log(`Synthetic payload ratio: ${(ratio * 100).toFixed(1)}% (not a production benchmark)`)
  })
  await test('duplicate product lines are preserved in nested UUID ascending order including zero/null values', async () => {
    const result = await source()
    const items = result.rows.find(p => p.id === purchase(1)).supplier_purchase_items
    assert.deepEqual(items.map(i => i.id), [item(1), item(900001), item(900002), item(900003)])
    assert.equal(items[1].quantity, 0)
    assert.equal(items[1].total_amount, 0)
    assert.equal(items[2].quantity, null)
    assert.equal(items[3].total_amount, 0)
    assert.equal(items[3].quantity * items[3].unit_price, 20)
  })
  await test('exact cancellation, nullable dates, inclusive lower/exclusive upper dates, branch and empty ranges', async () => {
    for (const args of [[null, null, branch(1)], ['2026-10-01', '2026-11-01'], ['2026-10-01', null], [null, '2026-10-01'], ['2026-10-01', '2026-11-01', branch(1)], ['2026-11-01', '2026-10-01'], ['2040-01-01', '2040-02-01'], [null,null,branch(100)]]) await assertParity(...args)
    const result = await source('2026-10-01', '2026-11-01', branch(1))
    assert.ok(result.rows.some(p => p.id === purchase(622)))
    assert.ok(result.rows.some(p => p.id === purchase(623)))
    assert.ok(!result.rows.some(p => p.id === purchase(624) || p.id === purchase(621)))
    assert.ok(!result.rows.some(p => p.deleted_at))
    const missingJoins = (await source()).rows.find(p => p.id === purchase(625))
    assert.equal(missingJoins.suppliers, null)
    assert.equal(missingJoins.branches, null)
    assert.deepEqual(missingJoins.supplier_purchase_items, [])
  })
  await test('function is STABLE invoker, fixes search path, and changes no table privileges or RLS', async () => {
    const meta = (await query(`select prosecdef, provolatile, proconfig from pg_proc where oid='public.rms_products_report_source_v1(date,date,uuid)'::regprocedure`)).rows[0]
    assert.equal(meta.prosecdef, false)
    assert.equal(meta.provolatile, 's')
    assert.ok(meta.proconfig.includes('search_path=pg_catalog, public, pg_temp'))
    assert.equal(await scalar(`select has_function_privilege('authenticated','public.rms_products_report_source_v1(date,date,uuid)','EXECUTE')`), true)
    assert.equal(await scalar(`select has_function_privilege('anon','public.rms_products_report_source_v1(date,date,uuid)','EXECUTE')`), false)
    assert.deepEqual(securityAfter, securityBefore)
    assert.ok(!/\b(create\s+(table|index|policy)|alter\s+table|security\s+definer)\b/i.test(sql.replace(/--[^\n]*/g, '')))
  })
  await test('non-admin, inactive admin, missing profile, missing auth and anonymous callers are denied', async () => {
    await actor(outsider)
    await expectError(source, e => e.code === '42501' && /administrator/.test(e.message))
    await actor(uuid('0', 3))
    await expectError(source, e => e.code === '42501')
    await actor('')
    await expectError(source, e => e.code === '42501' && /Authentication required/.test(e.message))
    await root(); await query('update public.user_profiles set is_active=false where id=$1', [uid]); await actor()
    await expectError(source, e => e.code === '42501')
    await actor(uid, 'anon')
    await expectError(source, e => e.code === '42501' && /permission denied/.test(e.message))
  })
  await test('existing invoker RLS filters purchases and items instead of bypassing policies', async () => {
    await root()
    await db.exec(`alter policy fixture_read on public.supplier_purchases using (branch_id='${branch(1)}');
      alter policy fixture_read on public.supplier_purchase_items using (id<>'${item(2)}')`)
    await actor()
    const result = await assertParity()
    assert.ok(result.rows.every(p => p.branch_id === branch(1)))
    assert.ok(result.rows.every(p => p.supplier_purchase_items.every(i => i.id !== item(2))))
    assert.ok(result.source_count < 625)
  })
  await test('revoked table SELECT and a failing source RLS expression raise errors without partial data', async () => {
    await root(); await db.exec('revoke select on public.supplier_purchase_items from authenticated'); await actor()
    await expectError(source, e => e.code === '42501')
    await root(); await db.exec(`grant select on public.supplier_purchase_items to authenticated;
      create function public.fixture_read_error() returns boolean language plpgsql as $$begin raise exception 'Fixture source read failed';end;$$;
      alter policy fixture_read on public.supplier_purchase_items using(public.fixture_read_error())`); await actor()
    await expectError(source, /Fixture source read failed/)
  })
  await test('same-product ambiguity across two tied purchases and different units fails closed for entire scope', async () => {
    await root()
    await query('update public.supplier_purchases set purchase_date=$1,created_at=$2 where id=any($3::uuid[])', ['2026-10-06', '2026-10-06T00:00:00Z', [purchase(1),purchase(2)]])
    await query('update public.supplier_purchase_items set product_id=$1,unit=$2 where purchase_id=$3', [product(2),'ml',purchase(2)])
    await actor()
    verifyUnsupported(await source(), 'ambiguous_purchase_order')
    verifyUnsupported(await source('2026-10-01','2026-11-01'), 'ambiguous_purchase_order')
    verifyComplete(await source('2026-09-01','2026-10-01'))
    verifyComplete(await source(null,null,branch(1)))
    await root(); await query('update public.supplier_purchases set deleted_at=now() where id=$1', [purchase(2)]); await actor()
    verifyComplete(await source())
  })
  await test('unrelated products tied on both order columns remain supported without adding a tie-break', async () => {
    await root(); await query('update public.supplier_purchases set purchase_date=$1,created_at=$2 where id=any($3::uuid[])', ['2026-10-06','2026-10-06T00:00:00Z',[purchase(1),purchase(2)]]); await actor()
    const result = await source(); verifyComplete(result)
    const canonical = rows => compactProjection(rows).sort((a,b) => a.id.localeCompare(b.id))
    assert.deepEqual(canonical(result.rows), canonical(filterLegacy(await full())))
    const statement = sql.replace(/--[^\n]*/g,'')
    assert.ok(!/order by p\.purchase_date[^\n]*p\.id/i.test(statement))
  })
  await test('same-date different-created-at purchases preserve values; null/null ties are detected', async () => {
    await root(); await query('update public.supplier_purchases set purchase_date=$1 where id=any($2::uuid[])', ['2026-10-06',[purchase(1),purchase(2)]]); await query('update public.supplier_purchase_items set product_id=$1 where purchase_id=$2',[product(2),purchase(2)]); await actor()
    await assertParity()
    await root(); await query('update public.supplier_purchases set purchase_date=null,created_at=null where id=any($1::uuid[])',[[purchase(1),purchase(2)]]); await actor()
    verifyUnsupported(await source(), 'ambiguous_purchase_order')
    verifyComplete(await source('2026-09-01',null))
  })
  await test('missing product identities, joins and names require legacy with zero partial rows', async () => {
    for (const change of [
      {sql:'update public.supplier_purchase_items set product_id=null,product_name=$1 where id=$2',params:['Legacy fallback',item(1)]},
      {sql:'update public.supplier_purchase_items set product_id=$1 where id=$2',params:[product(999),item(1)]},
    ]) {
      await root(); await query(change.sql,change.params); await actor()
      verifyUnsupported(await source(), 'missing_product_metadata')
      verifyComplete(await source('2026-10-01','2026-11-01'))
    }
    await root(); await query('update public.supplier_purchase_items set product_id=$1 where id=$2',[product(2),item(1)]); await query('update public.supplier_products set name=null where id=$1',[product(2)]); await actor()
    verifyUnsupported(await source(), 'missing_product_metadata')
    await root(); await query('update public.supplier_products set name=$1 where id=$2',['',product(2)]); await actor()
    verifyUnsupported(await source(), 'missing_product_metadata')
  })
  await test('empty database is authoritative complete data rather than a fallback signal', async () => {
    await root(); await db.exec('truncate public.supplier_purchase_items, public.supplier_purchases'); await actor()
    const result = await source()
    verifyComplete(result)
    assert.equal(result.source_count, 0)
    assert.equal(result.purchase_count, 0)
    assert.equal(result.item_count, 0)
    assert.deepEqual(result.rows, [])
  })
  await test('source executes in a read-only transaction and invalid dates fail without an envelope', async () => {
    await db.exec('set transaction read only')
    verifyComplete(await source('2026-10-01','2026-11-01'))
    await expectError(() => source('not-a-date'), e => e.code === '22007')
  })
  await test('global 50,000 cap is checked before date, branch and deleted filters, including irrelevant records', async () => {
    await root()
    await db.exec(`insert into public.supplier_purchases(id,purchase_date,created_at,deleted_at,branch_id)
      select ('60000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid,'1900-01-01','1900-01-01','2000-01-01','${branch(99)}'
      from generate_series(1,49375) g`)
    await actor()
    const exactly = await source('2026-10-01','2026-11-01',branch(1))
    verifyComplete(exactly); assert.equal(exactly.source_count,50000)
    await root(); await query('insert into public.supplier_purchases(id,deleted_at) values($1,now())',[uuid('6',49376)]); await actor()
    for (const args of [[null,null,null], ['2026-10-01','2026-11-01',branch(1)], ['2040-01-01','2040-02-01',branch(100)]]) {
      const result = await source(...args)
      verifyUnsupported(result,'global_source_limit')
      assert.equal(result.source_count,50001)
      assert.equal(result.matching_count,null)
    }
  })
  console.log(`Products report compact PostgreSQL integration: ${passed} tests passed`)
} finally { await db.close() }
