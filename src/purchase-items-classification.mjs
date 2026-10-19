// Read-only classification of complete current item categories; no supplier heuristics or data writes.
export function classifyPurchaseItems(purchase, items, complete = false) {
  if (!complete || !purchase?.id || !Array.isArray(items) || !items.length) return null
  const amount = Number(purchase.total_amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const seen = new Set()
  let total = 0
  for (const item of items) {
    const product = item.supplier_products
    const part = Number(item.total_amount)
    if (!item.id || seen.has(item.id) || item.purchase_id !== purchase.id
      || !item.product_id || product?.id !== item.product_id
      || product?.category !== 'Хоз.Товар'
      || item.total_amount === null || item.total_amount === '' || !Number.isFinite(part) || part < 0) return null
    seen.add(item.id)
    total += part
  }
  if (Math.abs(total - amount) > 0.005) return null
  return { category:'household', basis:'complete-current-product-categories', purchaseId:purchase.id, amount, itemCount:items.length }
}
export async function loadCompletePurchaseItems(client, purchases) {
  const ids=[...new Set(purchases.map(p=>p.id))]
  const grouped=new Map(ids.map(id=>[id,[]]))
  let totalRead=0
  for(let at=0;at<ids.length;at+=100) {
    const chunk=ids.slice(at,at+100), rows=[], seen=new Set()
    let expected=null, offset=0
    while(true) {
      const {data,error,count}=await client.from('supplier_purchase_items')
        .select('id,purchase_id,product_id,total_amount,supplier_products(id,category)',{count:'exact'})
        .in('purchase_id',chunk).order('id',{ascending:true}).range(offset,offset+999)
      if(error) throw new Error('Не удалось полностью прочитать состав закупок: '+error.message)
      if(!Number.isInteger(count) || count<0 || (expected!==null && count!==expected) || !Array.isArray(data)) throw new Error('Изменился или не подтверждён полный состав закупок')
      expected=count
      if(count>50000 || totalRead+count>50000) throw new Error('Слишком большой состав закупок; отчёт остановлен')
      for(const row of data) {
        if(!row.id || seen.has(row.id) || !chunk.includes(row.purchase_id)) throw new Error('Повтор или неверная принадлежность позиции закупки')
        seen.add(row.id);rows.push(row)
      }
      if(rows.length===expected) break
      if(rows.length>expected || !data.length || rows.length>50000) throw new Error('Неполный состав закупок; отчёт остановлен')
      offset+=data.length
    }
    totalRead+=rows.length
    rows.forEach(row=>grouped.get(row.purchase_id).push(row))
  }
  return grouped
}
