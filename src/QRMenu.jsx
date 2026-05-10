import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './QRMenu.css'

const fmt = (n) => Number(n || 0).toFixed(2)
const demoPhotos = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555507036-ab794f4afe5e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
]

export default function QRMenu() {
  const params = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : ''))
  const branchId = params.get('branch') || 'BC1'
  const tableNumber = params.get('table') || '1'
  const [guestSession] = useState(() => {
    const old = localStorage.getItem('qr_guest_session')
    if (old) return old
    const id = crypto.randomUUID()
    localStorage.setItem('qr_guest_session', id)
    return id
  })

  const [screen, setScreen] = useState('menu')
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('All')
  const [ratings, setRatings] = useState({})
  const [pairings, setPairings] = useState({})
  const [cart, setCart] = useState([])
  const [calls, setCalls] = useState([])
  const [statuses, setStatuses] = useState([])
  const [bill, setBill] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [info, setInfo] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [payChoice, setPayChoice] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const channel = supabase.channel(`qr-${branchId}-${tableNumber}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_live_cart' }, loadCart)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_order_status' }, loadStatuses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_waiter_calls' }, loadCalls)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [branchId, tableNumber])

  async function loadAll() {
    await Promise.all([loadProducts(), loadRatings(), loadPairings(), loadCart(), loadCalls(), loadStatuses(), loadBill(), loadInfo()])
  }

  async function loadProducts() {
    const { data, error } = await supabase.from('rms_menu_products').select('*').order('name', { ascending: true })
    if (error || !data?.length) {
      setProducts([
        { id: 'demo-cappuccino', name: 'Cappuccino', category: 'Coffee', description: 'Classic espresso with milk foam.', price: 5.5, image_url: demoPhotos[0] },
        { id: 'demo-croissant', name: 'Butter Croissant', category: 'Breakfast', description: 'Fresh baked croissant.', price: 4.5, image_url: demoPhotos[1] },
        { id: 'demo-salad', name: 'Caesar Salad', category: 'Salads', description: 'Romaine, parmesan and dressing.', price: 12, image_url: demoPhotos[2] }
      ])
      return
    }
    setProducts(data.filter(p => p.is_active !== false && p.is_stop !== true).map((p, i) => ({
      ...p,
      id: String(p.id),
      name: p.name || p.product_name || 'Unnamed',
      category: p.category || p.category_name || 'Menu',
      description: p.description || '',
      price: Number(p.price ?? p.sale_price ?? 0),
      image_url: p.image_url || p.photo_url || demoPhotos[i % demoPhotos.length]
    })))
  }

  async function loadRatings() {
    const { data } = await supabase.from('rms_qr_dish_ratings').select('product_id,rating')
    const g = {}
    ;(data || []).forEach(r => {
      const id = String(r.product_id)
      if (!g[id]) g[id] = { sum: 0, count: 0 }
      g[id].sum += Number(r.rating || 0)
      g[id].count += 1
    })
    const next = {}
    Object.entries(g).forEach(([k, v]) => next[k] = { avg: v.sum / v.count, count: v.count })
    setRatings(next)
  }

  async function loadPairings() {
    const { data } = await supabase.from('rms_qr_recommendations').select('*').eq('is_active', true)
    const g = {}
    ;(data || []).forEach(r => {
      const id = String(r.product_id)
      if (!g[id]) g[id] = []
      g[id].push(r.recommended_product_name || r.recommended_product_id)
    })
    setPairings(g)
  }

  async function loadCart() {
    const { data } = await supabase.from('rms_qr_live_cart')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).eq('status', 'draft')
      .order('created_at')
    setCart(data || [])
  }

  async function loadCalls() {
    const { data } = await supabase.from('rms_qr_waiter_calls')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).order('created_at', { ascending: false }).limit(10)
    setCalls(data || [])
  }

  async function loadStatuses() {
    const { data } = await supabase.from('rms_qr_order_status')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).order('created_at', { ascending: false }).limit(10)
    setStatuses(data || [])
  }

  async function loadBill() {
    const { data: b } = await supabase.from('rms_qr_live_bills')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber)
      .in('status', ['open','pending','unpaid']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setBill(b || null)
    if (b?.id) {
      const { data: items } = await supabase.from('rms_qr_live_bill_items').select('*').eq('bill_id', b.id).order('created_at')
      setBillItems(items || [])
    } else {
      setBillItems([])
    }
  }

  async function loadInfo() {
    const { data } = await supabase.from('rms_qr_info').select('*').eq('branch_id', branchId).maybeSingle()
    setInfo(data || null)
  }

  async function addToCart(p) {
    const existing = cart.find(x => String(x.product_id) === String(p.id) && x.guest_session === guestSession)
    if (existing) {
      const qty = Number(existing.qty || 0) + 1
      await supabase.from('rms_qr_live_cart').update({ qty, total: qty * Number(existing.price || 0), updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('rms_qr_live_cart').insert({
        branch_id: branchId, table_number: tableNumber, guest_session: guestSession,
        product_id: String(p.id), product_name: p.name, category: p.category,
        qty: 1, price: p.price, total: p.price, status: 'draft'
      })
    }
    loadCart()
  }

  async function changeQty(item, delta) {
    const qty = Number(item.qty || 0) + delta
    if (qty <= 0) await supabase.from('rms_qr_live_cart').delete().eq('id', item.id)
    else await supabase.from('rms_qr_live_cart').update({ qty, total: qty * Number(item.price || 0), updated_at: new Date().toISOString() }).eq('id', item.id)
    loadCart()
  }

  async function requestCartApproval() {
    await supabase.from('rms_qr_waiter_calls').insert({ branch_id: branchId, table_number: tableNumber, guest_session: guestSession, call_type: 'cart_review', status: 'new', comment: 'Подтвердить общий заказ QR Menu' })
    await supabase.from('rms_qr_order_status').insert({ branch_id: branchId, table_number: tableNumber, status: 'requested', status_label: 'Запрос отправлен официанту', source: 'qr_shared_cart' })
    alert('Запрос отправлен официанту.')
  }

  async function callWaiter(type, comment) {
    await supabase.from('rms_qr_waiter_calls').insert({ branch_id: branchId, table_number: tableNumber, guest_session: guestSession, call_type: type, status: 'new', comment })
    alert('Запрос отправлен.')
  }

  async function rate(p, rating) {
    const d = new Date().toISOString().slice(0, 10)
    const key = `qr_vote_${branchId}_${p.id}_${d}`
    if (localStorage.getItem(key)) return alert('Вы уже оценили это блюдо сегодня.')
    const { error } = await supabase.from('rms_qr_dish_ratings').insert({ branch_id: branchId, product_id: String(p.id), product_name: p.name, rating, guest_session: guestSession, rating_date: d })
    if (error) return alert('Вы уже оценили это блюдо сегодня.')
    localStorage.setItem(key, '1')
    loadRatings()
  }

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const shown = category === 'All' ? products : products.filter(p => p.category === category)
  const cartTotal = cart.reduce((s, x) => s + Number(x.total || 0), 0)
  const billTotal = Number(bill?.total || billItems.reduce((s, x) => s + Number(x.total || 0), 0))

  return <div className="qr-page theme-mediterranean">
    <header className="qr-header">
      <div className="qr-brand"><b>RMS QR Menu</b><span>{branchId} · стол {tableNumber}</span></div>
      <nav>
        <button className={screen==='menu'?'active':''} onClick={() => setScreen('menu')}>Меню</button>
        <button className={screen==='cart'?'active':''} onClick={() => setScreen('cart')}>Корзина{cart.length ? ` · ${cart.length}` : ''}</button>
        <button className={screen==='bill'?'active':''} onClick={() => setScreen('bill')}>Счёт</button>
        <button className={screen==='info'?'active':''} onClick={() => setScreen('info')}>Инфо</button>
      </nav>
    </header>

    {screen === 'menu' && <>
      <div className="qr-categories">{categories.map(c => <button key={c} className={c===category?'active':''} onClick={() => setCategory(c)}>{c === 'All' ? 'Все' : c}</button>)}</div>
      <div className="qr-products">{shown.map(p => {
        const r = ratings[String(p.id)]
        const recs = pairings[String(p.id)] || []
        return <article className="qr-card" key={p.id}>
          <button className="qr-photo" onClick={() => setPhoto(p)}><img src={p.image_url} alt={p.name} /><span>Увеличить</span></button>
          <div className="qr-card-body">
            <div className="qr-card-top"><div><h3>{p.name}</h3><small>{p.category}</small></div><b>{fmt(p.price)} AZN</b></div>
            <p>{p.description || 'Описание будет добавлено в RMS.'}</p>
            <div className="qr-card-footer"><RatingStars value={r?.avg || p.rating || 0} count={r?.count} /><div className="qr-rating-actions">{[1,2,3,4,5].map(x => <button key={x} onClick={() => rate(p, x)}>★</button>)}</div></div>
            {recs.length ? <div className="qr-recommendations"><span>Рекомендуем:</span><div>{recs.slice(0,3).map(x => <b key={x}>{x}</b>)}</div></div> : null}
            <button className="qr-add-cart" onClick={() => addToCart(p)}>+ Добавить в общий заказ</button>
          </div>
        </article>
      })}</div>
    </>}

    {screen === 'cart' && <section className="qr-panel">
      <h1>Общий заказ стола</h1>
      <p>Гости за одним столом могут собрать общий заказ. Финальное подтверждение делает персонал.</p>
      {!cart.length ? <div className="qr-empty"><h3>Корзина пустая</h3><p>Добавьте блюда из меню.</p></div> : <>
        <div className="qr-bill-list">{cart.map(i => <div className="qr-bill-item" key={i.id}><div><b>{i.product_name}</b><p>{i.category}</p></div><div className="qr-cart-controls"><button onClick={() => changeQty(i,-1)}>-</button><span>{fmt(i.qty)}</span><button onClick={() => changeQty(i,1)}>+</button><b>{fmt(i.total)} AZN</b></div></div>)}</div>
        <div className="qr-bill-total"><div className="qr-grand-total"><span>Итого</span><b>{fmt(cartTotal)} AZN</b></div></div>
        <button className="qr-main-action" onClick={requestCartApproval}>Отправить официанту на подтверждение</button>
      </>}
      <StatusList statuses={statuses} />
    </section>}

    {screen === 'bill' && <section className="qr-panel">
      <div className="qr-section-head"><div><h1>Ваш счёт</h1><p>Счёт подтягивается из RMS/POS.</p></div><button className="qr-refresh" onClick={loadBill}>Обновить</button></div>
      {!bill ? <div className="qr-empty"><h3>Открытого счёта пока нет</h3></div> : <>
        <div className="qr-bill-list">{billItems.map(i => <div className="qr-bill-item" key={i.id}><div><b>{i.product_name}</b><p>{i.category || ''}</p></div><div className="qr-bill-price"><span>{fmt(i.qty)} × {fmt(i.price)}</span><b>{fmt(i.total)} AZN</b></div></div>)}</div>
        <div className="qr-bill-total"><div className="qr-grand-total"><span>Total</span><b>{fmt(billTotal)} AZN</b></div></div>
        <div className="qr-payment-box">{!payChoice ? <button onClick={() => setPayChoice(true)}>Оплатить</button> : <><h3>Выберите способ оплаты</h3><button>Apple Pay</button><button>Google Pay</button><button>Банковская карта</button></>}</div>
      </>}
    </section>}

    {screen === 'info' && <section className="qr-panel">
      <h1>Информация</h1>
      <div className="qr-call-grid">
        <button onClick={() => callWaiter('waiter','Позвать официанта')}>Позвать официанта</button>
        <button onClick={() => callWaiter('bill','Попросить счёт')}>Попросить счёт</button>
        <button onClick={() => callWaiter('water','Вода')}>Вода</button>
        <button onClick={() => callWaiter('clean','Убрать стол')}>Убрать стол</button>
      </div>
      <div className="qr-info-grid">
        <InfoCard title="Wi‑Fi" value={info?.wifi_name || 'RMS Guest'} sub={info?.wifi_password ? `Пароль: ${info.wifi_password}` : ''} />
        <InfoCard title="Рабочие часы" value={info?.working_hours || '09:00 — 23:00'} />
        <InfoCard title="Телефон" value={info?.phone || '+994 XX XXX XX XX'} />
        <InfoCard title="Адрес" value={info?.address || 'Baku'} />
      </div>
      <StatusList statuses={statuses} />
    </section>}

    {photo ? <div className="qr-modal" onClick={() => setPhoto(null)}><div className="qr-modal-card" onClick={e => e.stopPropagation()}><button className="qr-modal-close" onClick={() => setPhoto(null)}>×</button><img src={photo.image_url} alt={photo.name} /><div><h2>{photo.name}</h2><p>{photo.description}</p><b>{fmt(photo.price)} AZN</b></div></div></div> : null}
  </div>
}

function RatingStars({ value, count }) {
  const r = Number(value || 0)
  return <div className="qr-rating-view"><div className="qr-stars">{[1,2,3,4,5].map(i => <span key={i} className={r >= i ? 'filled' : r >= i - .5 ? 'half' : ''}>★</span>)}<b>{r ? r.toFixed(1) : '—'}</b></div><span>{count ? `${count} оценок` : 'оцените блюдо'}</span></div>
}

function StatusList({ statuses }) {
  return <div className="qr-status-box"><h3>Статус кухни</h3>{!statuses.length ? <p>Активных статусов пока нет.</p> : <div className="qr-status-list">{statuses.map(s => <div key={s.id}><b>{s.status_label || s.status}</b><span>{s.comment || s.source || ''}</span></div>)}</div>}</div>
}

function InfoCard({ title, value, sub }) {
  return <div className="qr-info-card"><span>{title}</span><b>{value || '—'}</b>{sub ? <p>{sub}</p> : null}</div>
}
