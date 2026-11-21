import {readBatches} from './eqaime-batches.mjs'
import {groupRegister,uniquePayments} from './eqaime-grouping.mjs'
const PAGE = 500
export async function readPaged(makeQuery, { maxRows = 10000, signal } = {}) {
  const rows = []
  for (let offset = 0; offset <= maxRows; offset += PAGE) {
    if (signal?.aborted) throw new Error('Загрузка отменена')
    const query = makeQuery().range(offset, offset + PAGE - 1)
    const { data, error } = await (signal && query.abortSignal ? query.abortSignal(signal) : query)
    if (error) throw new Error('Не удалось прочитать RMS')
    if (!Array.isArray(data)) throw new Error('Неполный ответ RMS')
    rows.push(...data)
    if (rows.length > maxRows) throw new Error('Превышен предел чтения. Реестр не показан частично.')
    if (data.length < PAGE) return rows
  }
  throw new Error('Не удалось подтвердить полноту чтения')
}
export async function loadScopedRegister(client, entityId, options = {}) {
  if (!entityId) throw new Error('Scope required')
  const scoped = table => client.from(table).select(({supplier_e_invoices:'id,legal_entity_id,supplier_id,amount,status,invoice_number,invoice_date,deleted_at',supplier_payments:'id,legal_entity_id,supplier_id,amount,payment_date,invoice_notes,deleted_at',supplier_purchases:'id,legal_entity_id,supplier_id,total_amount,purchase_date,invoice_number,deleted_at'})[table]).eq('legal_entity_id', entityId).is('deleted_at', null).order('id')
  options.onStage?.('invoices_payments')
  const [invoices, payments] = await Promise.all([
    readPaged(() => scoped('supplier_e_invoices'), options),
    readPaged(() => scoped('supplier_payments'), options),
  ])
  const chunks = values => Array.from({length: Math.ceil(values.length / 100)}, (_,i) => values.slice(i*100,i*100+100))
  const batchOptions={signal:options.signal,maxRows:10000,concurrency:3}
  options.onStage?.('links')
  const links=await readBatches(chunks(invoices.map(x=>x.id)),(ids,signal)=>readPaged(()=>client.from('supplier_e_invoice_purchase_links').select('id,e_invoice_id,purchase_id,linked_amount').in('e_invoice_id',ids).order('id'),{...options,signal}),batchOptions)
  options.onStage?.('purchases')
  const purchases=await readBatches(chunks([...new Set(links.map(x=>x.purchase_id).filter(Boolean))]),(ids,signal)=>readPaged(()=>scoped('supplier_purchases').in('id',ids),{...options,signal}),batchOptions)
  options.onStage?.('suppliers')
  const suppliers=await readBatches(chunks([...new Set([...invoices,...payments].map(x=>x.supplier_id).filter(Boolean))]),(ids,signal)=>readPaged(()=>client.from('suppliers').select('id,name').in('id',ids).order('id'),{...options,signal}),batchOptions)
  const invoiceIds = new Set(invoices.map(x=>x.id))
  if(links.some(x=>!invoiceIds.has(x.e_invoice_id))) throw new Error('Unexpected invoice link')
  // Defense in depth: all reads use the caller JWT and existing RLS.
  if ([...invoices,...payments,...purchases].some(x => x.legal_entity_id !== entityId)) throw new Error('Получены записи другого плательщика')
  return { invoices, payments, links, purchases, suppliers, readAt: new Date().toISOString() }
}
function number(value) { return value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null }
export function analyzeRegister(input, entityId) {
  if (!entityId) throw new Error('Scope required')
  const invoices = input.invoices.filter(x => x.legal_entity_id === entityId && !x.deleted_at)
  const payments = input.payments.filter(x => x.legal_entity_id === entityId && !x.deleted_at)
  const purchases = new Map(input.purchases.filter(x => x.legal_entity_id === entityId && !x.deleted_at).map(x => [x.id,x]))
  const names = new Map(input.suppliers.map(x => [x.id,x.name]))
  const allocations = new Map()
  for (const link of input.links) { const n=number(link.linked_amount); if(n!==null && n>=0) allocations.set(link.purchase_id,(allocations.get(link.purchase_id)||0)+n) }
  const baseCounts = new Map()
  for (const x of invoices) {
    const tokens = [...new Set(String(x.invoice_number || '').match(/MT\d{12}/g) || [])]
    if (tokens.length === 1) { const key=`${x.supplier_id}:${tokens[0]}`; baseCounts.set(key,(baseCounts.get(key)||0)+1) }
  }
  const rows = invoices.map(x => {
    const label=String(x.invoice_number||''), tokens=[...new Set(label.match(/MT\d{12}/g)||[])]
    const clean=/^MT\d{12}$/.test(label), reasons=[]
    if (!clean) reasons.push('Суффикс / составной / нестандартный номер')
    if(tokens.length===1 && baseCounts.get(`${x.supplier_id}:${tokens[0]}`)>1) reasons.push('Несколько карточек с одним базовым номером')
    const links=input.links.filter(l=>l.e_invoice_id===x.id), seen=new Set()
    let linked=0, valid=true
    for(const l of links){
      const p=purchases.get(l.purchase_id), a=number(l.linked_amount)
      if(!p || p.supplier_id!==x.supplier_id){valid=false;reasons.push('Связанная накладная недоступна / другой поставщик');continue}
      if(seen.has(l.purchase_id)){valid=false;reasons.push('Повтор связи с одной накладной');continue}seen.add(l.purchase_id)
      if(a===null || a<0){valid=false;reasons.push('Некорректная сумма связи');continue}
      const purchaseAmount=number(p.total_amount)
      if(purchaseAmount===null || purchaseAmount<0 || a-purchaseAmount>0.02){valid=false;reasons.push('Сумма связи превышает накладную или её сумма некорректна');continue}
      if((allocations.get(l.purchase_id)||0)-purchaseAmount>0.02){valid=false;reasons.push('Общая сумма распределений превышает накладную');continue}
      linked+=a
    }
    if(!links.length){valid=false;reasons.push('Нет связей с накладными')}
    const a=number(x.amount)
    if(a===null || a<0){valid=false;reasons.push('Некорректная сумма карточки')}
    const delta=valid && clean && !reasons.length ? Math.round((a-linked)*10000)/10000 : null
    if(delta!==null && Math.abs(delta)>0.02) reasons.push('Сумма карточки отличается от суммы связей')
    return {...x,internalLinks:links.map(l=>({id:l.id,purchase_id:l.purchase_id,linked_amount:l.linked_amount,purchaseAmount:purchases.get(l.purchase_id)?.total_amount??null,purchaseNumber:purchases.get(l.purchase_id)?.invoice_number||null,purchaseDate:purchases.get(l.purchase_id)?.purchase_date||null})),supplierName:names.get(x.supplier_id)||'Неизвестный поставщик',linkedAmount:valid?linked:null,delta,reasons:[...new Set(reasons)],confirmedDebt:null,approval:'Не проверено по первичному документу'}
  })
  return { rows, groups:groupRegister(rows), payments:uniquePayments(payments).map(x=>({...x,supplierName:names.get(x.supplier_id)||'Неизвестный поставщик'})), confirmedDebt:null,
    readAt: new Date(input.readAt || Date.now()).toISOString(), status:'blocked', source:'RMS register only', primaryCoverage:null,
    invoiceRange:dateRange(rows,'invoice_date'),paymentRange:dateRange(payments,'payment_date') }
}
function dateRange(rows,key){const dates=rows.map(x=>x[key]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')).sort();return dates.length?{from:dates[0],to:dates.at(-1)}:null}
