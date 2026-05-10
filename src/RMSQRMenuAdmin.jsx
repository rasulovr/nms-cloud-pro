import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const fmt = (n) => Number(n || 0).toFixed(2)

export default function RMSQRMenuAdmin() {
  const [tab, setTab] = useState('calls')
  const [calls, setCalls] = useState([])
  const [cart, setCart] = useState([])
  const [statuses, setStatuses] = useState([])
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [msg, setMsg] = useState('')
  const [statusForm, setStatusForm] = useState({ branch_id: 'BC1', table_number: '1', status: 'preparing', status_label: 'Готовится', comment: '' })
  const [recForm, setRecForm] = useState({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    await Promise.all([loadCalls(), loadCart(), loadStatuses(), loadProducts(), loadRatings(), loadRecommendations()])
  }

  async function loadCalls() {
    const { data } = await supabase.from('rms_qr_waiter_calls').select('*').order('created_at', { ascending: false }).limit(100)
    setCalls(data || [])
  }

  async function loadCart() {
    const { data } = await supabase.from('rms_qr_live_cart').select('*').order('created_at', { ascending: false }).limit(300)
    setCart(data || [])
  }

  async function loadStatuses() {
    const { data } = await supabase.from('rms_qr_order_status').select('*').order('created_at', { ascending: false }).limit(100)
    setStatuses(data || [])
  }

  async function loadProducts() {
    const { data } = await supabase.from('rms_menu_products').select('*').order('name')
    setProducts((data || []).map(p => ({ ...p, id: String(p.id), name: p.name || p.product_name || 'Unnamed' })))
  }

  async function loadRatings() {
    const { data } = await supabase.from('rms_qr_dish_ratings').select('*').order('created_at', { ascending: false }).limit(300)
    setRatings(data || [])
  }

  async function loadRecommendations() {
    const { data } = await supabase.from('rms_qr_recommendations').select('*').order('created_at', { ascending: false })
    setRecommendations(data || [])
  }

  async function updateCall(id, status) {
    const { error } = await supabase.from('rms_qr_waiter_calls').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMsg(error.message)
    else { setMsg('Статус вызова обновлён'); loadCalls() }
  }

  async function confirmCart(branch, table) {
    const { error } = await supabase.from('rms_qr_live_cart').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('branch_id', branch).eq('table_number', table).eq('status', 'draft')
    if (error) setMsg(error.message)
    else { setMsg('Shared cart подтверждён'); loadCart() }
  }

  async function addStatus() {
    const { error } = await supabase.from('rms_qr_order_status').insert(statusForm)
    if (error) setMsg(error.message)
    else { setMsg('Статус кухни добавлен'); loadStatuses() }
  }

  async function saveRecommendation() {
    if (!recForm.product_id || !recForm.recommended_product_name) return setMsg('Выберите блюдо и рекомендацию')
    const source = products.find(p => p.id === recForm.product_id)
    const { error } = await supabase.from('rms_qr_recommendations').insert({ ...recForm, product_name: recForm.product_name || source?.name || '', is_active: true })
    if (error) setMsg(error.message)
    else { setRecForm({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' }); setMsg('Рекомендация добавлена'); loadRecommendations() }
  }

  async function deleteRecommendation(id) {
    const { error } = await supabase.from('rms_qr_recommendations').delete().eq('id', id)
    if (error) setMsg(error.message)
    else { setMsg('Рекомендация удалена'); loadRecommendations() }
  }

  const cartsByTable = useMemo(() => {
    const g = {}
    cart.forEach(i => {
      const k = `${i.branch_id} · ${i.table_number}`
      if (!g[k]) g[k] = { branch_id: i.branch_id, table_number: i.table_number, items: [], total: 0 }
      g[k].items.push(i)
      g[k].total += Number(i.total || 0)
    })
    return Object.values(g)
  }, [cart])

  const ratingSummary = useMemo(() => {
    const g = {}
    ratings.forEach(r => {
      const k = String(r.product_id)
      if (!g[k]) g[k] = { product_name: r.product_name, sum: 0, count: 0 }
      g[k].sum += Number(r.rating || 0); g[k].count += 1
    })
    return Object.entries(g).map(([id,v]) => ({ id, product_name: v.product_name, avg: v.sum / v.count, count: v.count }))
  }, [ratings])

  return <section>
    <section className="topbar"><div><h2>QR Menu</h2><p>Shared Cart · Waiter Call · Kitchen Status · Smart Upsell</p></div><button className="small primary" onClick={loadAll}>Обновить</button></section>
    <div className="settings-tabs">
      <button className={tab==='calls'?'active':''} onClick={() => setTab('calls')}>Вызовы</button>
      <button className={tab==='cart'?'active':''} onClick={() => setTab('cart')}>Shared Cart</button>
      <button className={tab==='status'?'active':''} onClick={() => setTab('status')}>Kitchen Status</button>
      <button className={tab==='recommendations'?'active':''} onClick={() => setTab('recommendations')}>Рекомендации</button>
      <button className={tab==='ratings'?'active':''} onClick={() => setTab('ratings')}>Рейтинги</button>
    </div>
    {msg ? <p className="hint good">{msg}</p> : null}

    {tab === 'calls' && <div className="card"><h3>Вызовы официанта</h3><div className="table-wrap"><table><thead><tr><th>Филиал</th><th>Стол</th><th>Тип</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead><tbody>{calls.map(c => <tr key={c.id}><td>{c.branch_id}</td><td>{c.table_number}</td><td>{c.call_type}</td><td>{c.comment}</td><td>{c.status}</td><td><button className="small" onClick={() => updateCall(c.id, c.status === 'done' ? 'new' : 'done')}>{c.status === 'done' ? 'Вернуть' : 'Выполнено'}</button></td></tr>)}{!calls.length && <tr><td colSpan="6" className="hint">Вызовов нет.</td></tr>}</tbody></table></div></div>}

    {tab === 'cart' && <div className="card"><h3>Shared Cart</h3>{cartsByTable.map(g => <div className="card" key={`${g.branch_id}-${g.table_number}`}><h3>{g.branch_id} · стол {g.table_number}</h3><p><b>{fmt(g.total)} AZN</b></p><div className="table-wrap"><table><tbody>{g.items.map(i => <tr key={i.id}><td>{i.product_name}</td><td>{i.qty}</td><td>{fmt(i.total)} AZN</td><td>{i.status}</td></tr>)}</tbody></table></div><button className="small primary" onClick={() => confirmCart(g.branch_id, g.table_number)}>Подтвердить заказ</button></div>)}{!cartsByTable.length && <p className="hint">Shared cart пустой.</p>}</div>}

    {tab === 'status' && <div className="card"><h3>Kitchen Status</h3><div className="form-grid compact"><label><span>Филиал</span><input value={statusForm.branch_id} onChange={e => setStatusForm({...statusForm, branch_id: e.target.value})} /></label><label><span>Стол</span><input value={statusForm.table_number} onChange={e => setStatusForm({...statusForm, table_number: e.target.value})} /></label><label><span>Статус</span><select value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value})}><option value="requested">Requested</option><option value="accepted">Accepted</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="served">Served</option></select></label><label><span>Текст</span><input value={statusForm.status_label} onChange={e => setStatusForm({...statusForm, status_label: e.target.value})} /></label><label className="span-2"><span>Комментарий</span><input value={statusForm.comment} onChange={e => setStatusForm({...statusForm, comment: e.target.value})} /></label></div><button className="small primary" onClick={addStatus}>Добавить статус</button><div className="table-wrap"><table><tbody>{statuses.map(s => <tr key={s.id}><td>{s.branch_id}</td><td>{s.table_number}</td><td>{s.status_label || s.status}</td><td>{s.comment}</td></tr>)}</tbody></table></div></div>}

    {tab === 'recommendations' && <div className="card"><h3>Smart Upsell</h3><div className="form-grid compact"><label><span>Основная позиция</span><select value={recForm.product_id} onChange={e => {const p=products.find(x=>x.id===e.target.value);setRecForm(s=>({...s, product_id:e.target.value, product_name:p?.name||''}))}}><option value="">Выбрать</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Рекомендуемая позиция</span><select value={recForm.recommended_product_id} onChange={e => {const p=products.find(x=>x.id===e.target.value);setRecForm(s=>({...s, recommended_product_id:e.target.value, recommended_product_name:p?.name||''}))}}><option value="">Выбрать</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><button className="small primary" onClick={saveRecommendation}>Добавить</button><div className="table-wrap"><table><tbody>{recommendations.map(r => <tr key={r.id}><td>{r.product_name}</td><td>{r.recommended_product_name}</td><td><button className="small danger" onClick={() => deleteRecommendation(r.id)}>Удалить</button></td></tr>)}</tbody></table></div></div>}

    {tab === 'ratings' && <div className="card"><h3>Рейтинги</h3><div className="table-wrap"><table><tbody>{ratingSummary.map(r => <tr key={r.id}><td>{r.product_name}</td><td>★ {fmt(r.avg)}</td><td>{r.count}</td></tr>)}</tbody></table></div></div>}
  </section>
}
