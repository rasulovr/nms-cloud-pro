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
  const tableNumber = params.get('table') || ''
  const isBranchMenu = !tableNumber
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
  const [ads, setAds] = useState([])
  const [activeAd, setActiveAd] = useState(null)
  const [loyaltyPhone, setLoyaltyPhone] = useState(() => localStorage.getItem('qr_loyalty_phone') || '')
  const [loyaltyClient, setLoyaltyClient] = useState(null)
  const [loyaltyPin, setLoyaltyPin] = useState('')
  const [loyaltyVerified, setLoyaltyVerified] = useState(false)
  const [loyaltyMessage, setLoyaltyMessage] = useState('')

  useEffect(() => {
    loadAll()
    const savedPhone = localStorage.getItem('qr_loyalty_phone')
    if (savedPhone) findLoyaltyClient(savedPhone, false)
  }, [])

  useEffect(() => {
    const channel = supabase.channel(`qr-${branchId}-${tableNumber || 'branch'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_live_cart' }, loadCart)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_order_status' }, loadStatuses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_qr_waiter_calls' }, loadCalls)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [branchId, tableNumber])

  async function loadAll() {
    await Promise.all([loadProducts(), loadRatings(), loadPairings(), loadCart(), loadCalls(), loadStatuses(), loadBill(), loadInfo(), loadAds()])
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
    if (!tableNumber) { setCart([]); return }
    const { data } = await supabase.from('rms_qr_live_cart')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).eq('status', 'draft')
      .order('created_at')
    setCart(data || [])
  }

  async function loadCalls() {
    if (!tableNumber) { setCalls([]); return }
    const { data } = await supabase.from('rms_qr_waiter_calls')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).order('created_at', { ascending: false }).limit(10)
    setCalls(data || [])
  }

  async function loadStatuses() {
    if (!tableNumber) { setStatuses([]); return }
    const { data } = await supabase.from('rms_qr_order_status')
      .select('*').eq('branch_id', branchId).eq('table_number', tableNumber).order('created_at', { ascending: false }).limit(10)
    setStatuses(data || [])
  }

  async function loadBill() {
    if (!tableNumber) { setBill(null); setBillItems([]); return }
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

  async function loadAds() {
    const { data } = await supabase.from('rms_qr_ads').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5)
    setAds(data || [])
    if (data?.length) {
      setActiveAd(data[0])
      setTimeout(() => setActiveAd(null), 5000)
    }
  }

  async function addToCart(p) {
    if (!tableNumber) return alert('Это общее меню филиала. Для заказа отсканируйте QR конкретного стола.')
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
    if (!tableNumber) return alert('Для заказа нужен QR конкретного стола.')
    await supabase.from('rms_qr_waiter_calls').insert({ branch_id: branchId, table_number: tableNumber, guest_session: guestSession, call_type: 'cart_review', status: 'new', comment: 'Подтвердить общий заказ QR Menu' })
    await supabase.from('rms_qr_order_status').insert({ branch_id: branchId, table_number: tableNumber, status: 'requested', status_label: 'Запрос отправлен официанту', source: 'qr_shared_cart' })
    alert('Запрос отправлен официанту.')
  }

  async function callWaiter(type, comment) {
    if (!tableNumber) return alert('Вызов официанта доступен только через QR конкретного стола.')
    await supabase.from('rms_qr_waiter_calls').insert({ branch_id: branchId, table_number: tableNumber, guest_session: guestSession, call_type: type, status: 'new', comment })
    alert('Запрос отправлен.')
  }

  async function findLoyaltyClient(phoneValue = loyaltyPhone, showMessages = true) {
    const phone = String(phoneValue || '').trim()
    if (!phone) {
      if (showMessages) setLoyaltyMessage('Введите номер телефона.')
      return
    }

    setLoyaltyMessage('')
    setLoyaltyVerified(false)
    setLoyaltyPin('')

    const { data, error } = await supabase
      .from('rms_loyalty_clients')
      .select('id,name,phone,level,bonus_balance,total_spent,visits_count,loyalty_pin')
      .eq('phone', phone)
      .maybeSingle()

    if (error) {
      setLoyaltyClient(null)
      if (showMessages) setLoyaltyMessage(error.message)
      return
    }

    if (!data) {
      setLoyaltyClient(null)
      if (showMessages) setLoyaltyMessage('Клиент не найден. Можно зарегистрироваться по этому номеру.')
      return
    }

    localStorage.setItem('qr_loyalty_phone', phone)
    setLoyaltyPhone(phone)
    setLoyaltyClient(data)
    if (showMessages) setLoyaltyMessage('Клиент найден. Для просмотра баланса введите PIN/OTP.')
  }

  async function verifyLoyaltyPin() {
    if (!loyaltyClient) {
      setLoyaltyMessage('Сначала найдите клиента по номеру телефона.')
      return
    }

    const pin = String(loyaltyPin || '').trim()
    if (!pin) {
      setLoyaltyMessage('Введите PIN/OTP-код.')
      return
    }

    if (!loyaltyClient.loyalty_pin) {
      setLoyaltyMessage('Для этого клиента PIN ещё не создан. Нажмите “Создать PIN”.')
      return
    }

    if (pin !== String(loyaltyClient.loyalty_pin)) {
      setLoyaltyVerified(false)
      setLoyaltyMessage('Неверный PIN/OTP-код.')
      return
    }

    setLoyaltyVerified(true)
    setLoyaltyMessage('Проверка пройдена. Баланс открыт.')
  }

  async function registerLoyaltyClient() {
    const phone = String(loyaltyPhone || '').trim()
    if (!phone) {
      setLoyaltyMessage('Введите номер телефона.')
      return
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000))

    const { data, error } = await supabase
      .from('rms_loyalty_clients')
      .insert({
        name: 'Гость QR',
        phone,
        loyalty_pin: pin,
        level: 'new',
        bonus_balance: 0,
        total_spent: 0,
        visits_count: 0,
        is_active: true
      })
      .select('id,name,phone,level,bonus_balance,total_spent,visits_count,loyalty_pin')
      .single()

    if (error) {
      setLoyaltyMessage(error.message)
      return
    }

    localStorage.setItem('qr_loyalty_phone', phone)
    setLoyaltyClient(data)
    setLoyaltyVerified(false)
    setLoyaltyPin('')
    setLoyaltyMessage(`Регистрация выполнена. Тестовый PIN: ${pin}. В реальной версии код будет приходить по SMS/WhatsApp.`)
  }

  async function createOrResetLoyaltyPin() {
    const phone = String(loyaltyPhone || '').trim()
    if (!phone) {
      setLoyaltyMessage('Введите номер телефона.')
      return
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000))
    const { data, error } = await supabase
      .from('rms_loyalty_clients')
      .update({ loyalty_pin: pin, updated_at: new Date().toISOString() })
      .eq('phone', phone)
      .select('id,name,phone,level,bonus_balance,total_spent,visits_count,loyalty_pin')
      .maybeSingle()

    if (error) {
      setLoyaltyMessage(error.message)
      return
    }

    if (!data) {
      setLoyaltyMessage('Клиент не найден.')
      return
    }

    setLoyaltyClient(data)
    setLoyaltyVerified(false)
    setLoyaltyPin('')
    setLoyaltyMessage(`Тестовый PIN создан: ${pin}. В реальной версии код будет отправляться по SMS/WhatsApp.`)
  }

  function logoutLoyalty() {
    localStorage.removeItem('qr_loyalty_phone')
    setLoyaltyClient(null)
    setLoyaltyPhone('')
    setLoyaltyPin('')
    setLoyaltyVerified(false)
    setLoyaltyMessage('')
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
  const loyaltyBalance = Number(loyaltyClient?.bonus_balance || 0)
  const loyaltyOrderBase = billTotal || cartTotal || 0
  const loyaltyMaxRedeem = Math.min(loyaltyBalance, Number((loyaltyOrderBase * 0.30).toFixed(2)))
  const loyaltyEarnPreview = Number((loyaltyOrderBase * 0.05).toFixed(2))

  return <div className="qr-page theme-mediterranean">
    <header className="qr-header">
      <div className="qr-brand"><b>RMS QR Menu</b><span>{isBranchMenu ? `${branchId} · общее меню филиала` : `${branchId} · стол ${tableNumber}`}</span></div>
      <nav>
        <button className={screen==='menu'?'active':''} onClick={() => setScreen('menu')}>Меню</button>
        {!isBranchMenu && <button className={screen==='cart'?'active':''} onClick={() => setScreen('cart')}>Корзина{cart.length ? ` · ${cart.length}` : ''}</button>}
        {!isBranchMenu && <button className={screen==='bill'?'active':''} onClick={() => setScreen('bill')}>Счёт</button>}
        <button className={screen==='loyalty'?'active':''} onClick={() => setScreen('loyalty')}>Loyalty{loyaltyClient ? ` · ${fmt(loyaltyBalance)}` : ''}</button>
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
            <RatingStars value={r?.avg || p.rating || 0} count={r?.count} onRate={x => rate(p, x)} />
            {recs.length ? <div className="qr-recommendations"><span>Рекомендуем:</span><div>{recs.slice(0,3).map(x => <b key={x}>{x}</b>)}</div></div> : null}
            {!isBranchMenu ? <button className="qr-add-cart" onClick={() => addToCart(p)}>+ Добавить в общий заказ</button> : <button className="qr-add-cart" onClick={() => alert('Для заказа отсканируйте QR конкретного стола.')}>QR стола для заказа</button>}
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

    {screen === 'loyalty' && <section className="qr-panel qr-loyalty-panel">
      <div className="qr-section-head">
        <div>
          <h1>Loyalty</h1>
          <p>Баланс и списание бонусов доступны только после PIN/OTP-подтверждения.</p>
        </div>
      </div>

      <div className="qr-loyalty-login">
        <input value={loyaltyPhone} onChange={(e) => setLoyaltyPhone(e.target.value)} placeholder="+994 XX XXX XX XX" />
        <button onClick={() => findLoyaltyClient()}>Найти клиента</button>
        <button className="secondary" onClick={registerLoyaltyClient}>Регистрация</button>
      </div>

      {loyaltyClient ? <div className="qr-loyalty-pin">
        <input value={loyaltyPin} onChange={(e) => setLoyaltyPin(e.target.value)} placeholder="PIN / OTP" inputMode="numeric" maxLength="6" />
        <button onClick={verifyLoyaltyPin}>Подтвердить</button>
        <button className="secondary" onClick={createOrResetLoyaltyPin}>Создать PIN</button>
      </div> : null}

      {loyaltyMessage ? <div className="qr-loyalty-message">{loyaltyMessage}</div> : null}

      {loyaltyClient ? <>
        <div className={`qr-loyalty-card ${loyaltyClient.level || 'new'} ${loyaltyVerified ? 'verified' : 'locked'}`}>
          <span>{loyaltyVerified ? 'Ваш уровень' : 'Клиент найден'}</span>
          <h2>{String(loyaltyClient.level || 'new').toUpperCase()}</h2>
          <p>{loyaltyClient.name || 'Гость'} · {loyaltyClient.phone}</p>
          {!loyaltyVerified ? <div className="qr-loyalty-lock">Баланс скрыт до подтверждения PIN/OTP</div> : null}
          <div className="qr-loyalty-balance">
            <div><small>Баланс</small><b>{loyaltyVerified ? `${fmt(loyaltyBalance)} AZN` : '••••'}</b></div>
            <div><small>Покупки</small><b>{loyaltyVerified ? `${fmt(loyaltyClient.total_spent)} AZN` : '••••'}</b></div>
            <div><small>Визиты</small><b>{loyaltyVerified ? (loyaltyClient.visits_count || 0) : '••'}</b></div>
          </div>
        </div>

        <div className="qr-loyalty-rules">
          <div><span>Cashback</span><b>5%</b><small>начисление возможно без раскрытия баланса</small></div>
          <div><span>Можно списать</span><b>{loyaltyVerified ? `${fmt(loyaltyMaxRedeem)} AZN` : '••••'}</b><small>только после PIN/OTP</small></div>
          <div><span>Будет начислено</span><b>{fmt(loyaltyEarnPreview)} AZN</b><small>по текущему заказу/счёту</small></div>
        </div>

        <button className="qr-loyalty-logout" onClick={logoutLoyalty}>Выйти из Loyalty</button>
      </> : null}
    </section>}

    {screen === 'info' && <section className="qr-panel">
      <h1>Информация</h1>
      {!isBranchMenu && <div className="qr-call-grid">
        <button onClick={() => callWaiter('waiter','Позвать официанта')}>Позвать официанта</button>
        <button onClick={() => callWaiter('bill','Попросить счёт')}>Попросить счёт</button>
        <button onClick={() => callWaiter('water','Вода')}>Вода</button>
        <button onClick={() => callWaiter('clean','Убрать стол')}>Убрать стол</button>
      </div>}
      <div className="qr-info-grid">
        <InfoCard title="Wi‑Fi" value={info?.wifi_name || 'RMS Guest'} sub={info?.wifi_password ? `Пароль: ${info.wifi_password}` : ''} />
        <InfoCard title="Рабочие часы" value={info?.working_hours || '09:00 — 23:00'} />
        <InfoCard title="Телефон" value={info?.phone || '+994 XX XXX XX XX'} />
        <InfoCard title="Адрес" value={info?.address || 'Baku'} />
      </div>
      <StatusList statuses={statuses} />
    </section>}

    {activeAd ? <div className="qr-ad-popup" onClick={() => setActiveAd(null)}><div className="qr-ad-card" onClick={e => e.stopPropagation()}><button className="qr-modal-close" onClick={() => setActiveAd(null)}>×</button>{activeAd.image_url ? <img src={activeAd.image_url} alt={activeAd.title} /> : null}<div><h2>{activeAd.title}</h2><p>{activeAd.text}</p></div></div></div> : null}

    {photo ? <div className="qr-modal" onClick={() => setPhoto(null)}><div className="qr-modal-card" onClick={e => e.stopPropagation()}><button className="qr-modal-close" onClick={() => setPhoto(null)}>×</button><img src={photo.image_url} alt={photo.name} /><div><h2>{photo.name}</h2><p>{photo.description}</p><b>{fmt(photo.price)} AZN</b></div></div></div> : null}
  </div>
}

function RatingStars({ value, count, onRate }) {
  const r = Number(value || 0)
  const tone = r >= 4.5 ? 'excellent' : r >= 4 ? 'good' : r >= 3 ? 'mid' : r > 0 ? 'low' : 'empty'
  return <div className={`qr-rating-view ${tone}`}>
    <div className="qr-stars">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" className={r >= i ? 'filled' : r >= i - .5 ? 'half' : ''} onClick={() => onRate?.(i)}>★</button>
      ))}
      <b>{r ? r.toFixed(1) : '—'}</b>
    </div>
    <span>{count ? `${count} оценок` : 'оцените блюдо'}</span>
  </div>
}


function StatusList({ statuses }) {
  return <div className="qr-status-box"><h3>Статус кухни</h3>{!statuses.length ? <p>Активных статусов пока нет.</p> : <div className="qr-status-list">{statuses.map(s => <div key={s.id}><b>{s.status_label || s.status}</b><span>{s.comment || s.source || ''}</span></div>)}</div>}</div>
}

function InfoCard({ title, value, sub }) {
  return <div className="qr-info-card"><span>{title}</span><b>{value || '—'}</b>{sub ? <p>{sub}</p> : null}</div>
}
