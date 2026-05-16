import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './QRMenu.css'

const fmt = (n) => Number(n || 0).toFixed(2)
const CASHBACK_PERCENT = 5
const MAX_REDEEM_PERCENT = 30

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
  const [loyaltyOtp, setLoyaltyOtp] = useState('')
  const [loyaltyClient, setLoyaltyClient] = useState(null)
  const [loyaltySession, setLoyaltySession] = useState(null)
  const [loyaltyToken, setLoyaltyToken] = useState(null)
  const [loyaltyMessage, setLoyaltyMessage] = useState('')
  const [loyaltyStep, setLoyaltyStep] = useState('phone')

  useEffect(() => {
    loadAll()
    restoreLoyaltySession()
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
    await supabase.from('rms_qr_waiter_calls').insert({
      branch_id: branchId,
      table_number: tableNumber,
      guest_session: guestSession,
      call_type: 'cart_review',
      status: 'new',
      comment: loyaltyClient ? `Подтвердить QR заказ · Loyalty ${loyaltyClient.phone}` : 'Подтвердить общий заказ QR Menu'
    })
    await supabase.from('rms_qr_order_status').insert({ branch_id: branchId, table_number: tableNumber, status: 'requested', status_label: 'Запрос отправлен официанту', source: 'qr_shared_cart' })
    alert('Запрос отправлен официанту.')
  }

  async function callWaiter(type, comment) {
    if (!tableNumber) return alert('Вызов официанта доступен только через QR конкретного стола.')
    await supabase.from('rms_qr_waiter_calls').insert({ branch_id: branchId, table_number: tableNumber, guest_session: guestSession, call_type: type, status: 'new', comment })
    alert('Запрос отправлен.')
  }

  async function restoreLoyaltySession() {
    const sessionId = localStorage.getItem('qr_loyalty_session_id')
    if (!sessionId) return

    const { data: session } = await supabase
      .from('rms_loyalty_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!session) {
      localStorage.removeItem('qr_loyalty_session_id')
      return
    }

    const { data: client } = await supabase
      .from('rms_loyalty_clients')
      .select('*')
      .eq('id', session.client_id)
      .maybeSingle()

    if (client) {
      setLoyaltySession(session)
      setLoyaltyClient(client)
      setLoyaltyPhone(client.phone)
      setLoyaltyStep('verified')
      await ensureLoyaltyToken(client.id)
    }
  }

  async function sendLoyaltyOtp() {
    const phone = String(loyaltyPhone || '').trim()
    if (!phone) return setLoyaltyMessage('Введите номер телефона.')

    setLoyaltyMessage('')

    let { data: client } = await supabase
      .from('rms_loyalty_clients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (!client) {
      const created = await supabase
        .from('rms_loyalty_clients')
        .insert({
          name: 'Гость QR',
          phone,
          level: 'new',
          bonus_balance: 0,
          total_spent: 0,
          visits_count: 0,
          is_active: true,
          whatsapp_opt_in: true
        })
        .select('*')
        .single()

      if (created.error) {
        setLoyaltyMessage(created.error.message)
        return
      }
      client = created.data
    }

    const code = String(Math.floor(1000 + Math.random() * 9000))

    const { error } = await supabase.from('rms_loyalty_otp_codes').insert({
      phone,
      code,
      channel: 'test',
      guest_session: guestSession,
      status: 'pending'
    })

    if (error) {
      setLoyaltyMessage(error.message)
      return
    }

    localStorage.setItem('qr_loyalty_phone', phone)
    setLoyaltyClient(client)
    setLoyaltyStep('otp')
    setLoyaltyMessage(`Тестовый OTP: ${code}. В продакшене этот код уйдёт через WhatsApp/SMS.`)
  }

  async function verifyLoyaltyOtp() {
    const phone = String(loyaltyPhone || '').trim()
    const code = String(loyaltyOtp || '').trim()
    if (!phone || !code) return setLoyaltyMessage('Введите номер и OTP-код.')

    const { data: otp, error } = await supabase
      .from('rms_loyalty_otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return setLoyaltyMessage(error.message)
    if (!otp) return setLoyaltyMessage('Неверный или просроченный OTP-код.')

    const { data: client, error: clientError } = await supabase
      .from('rms_loyalty_clients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (clientError || !client) return setLoyaltyMessage(clientError?.message || 'Клиент не найден.')

    await supabase.from('rms_loyalty_otp_codes').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', otp.id)
    await supabase.from('rms_loyalty_clients').update({ last_verified_at: new Date().toISOString() }).eq('id', client.id)

    const { data: session, error: sessionError } = await supabase
      .from('rms_loyalty_sessions')
      .insert({
        client_id: client.id,
        phone,
        guest_session: guestSession,
        source: 'qr_menu',
        is_active: true
      })
      .select('*')
      .single()

    if (sessionError) return setLoyaltyMessage(sessionError.message)

    localStorage.setItem('qr_loyalty_session_id', session.id)
    setLoyaltyClient(client)
    setLoyaltySession(session)
    setLoyaltyStep('verified')
    setLoyaltyMessage('Вы вошли в программу лояльности.')
    await ensureLoyaltyToken(client.id)
  }

  async function ensureLoyaltyToken(clientId) {
    const { data: token } = await supabase
      .from('rms_loyalty_qr_tokens')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (token) {
      setLoyaltyToken(token)
      return token
    }

    const { data: created } = await supabase
      .from('rms_loyalty_qr_tokens')
      .insert({ client_id: clientId, purpose: 'pos_scan', status: 'active' })
      .select('*')
      .single()

    setLoyaltyToken(created || null)
    return created
  }

  async function generateNewLoyaltyToken() {
    if (!loyaltyClient) return
    await supabase.from('rms_loyalty_qr_tokens').update({ status: 'cancelled' }).eq('client_id', loyaltyClient.id).eq('status', 'active')
    await ensureLoyaltyToken(loyaltyClient.id)
  }

  async function simulateQrPayment() {
    if (!loyaltyClient) return setLoyaltyMessage('Сначала войдите в Loyalty.')
    const total = billTotal || cartTotal
    if (!total) return setLoyaltyMessage('Нет суммы заказа/счёта для начисления.')

    const cashback = Number((total * CASHBACK_PERCENT / 100).toFixed(2))
    const nextBalance = Number(loyaltyClient.bonus_balance || 0) + cashback
    const nextSpent = Number(loyaltyClient.total_spent || 0) + total
    const nextVisits = Number(loyaltyClient.visits_count || 0) + 1

    const { error: txError } = await supabase.from('rms_loyalty_transactions').insert({
      client_id: loyaltyClient.id,
      client_name: loyaltyClient.name,
      client_phone: loyaltyClient.phone,
      type: 'earn',
      amount: cashback,
      order_total: total,
      branch_id: branchId,
      branch_name: branchId,
      comment: 'Cashback после оплаты через QR Menu'
    })

    if (txError) return setLoyaltyMessage(txError.message)

    await supabase.from('rms_loyalty_order_links').insert({
      client_id: loyaltyClient.id,
      order_source: 'qr_menu',
      order_id: bill?.id || `cart-${guestSession}`,
      branch_id: branchId,
      table_number: tableNumber || null,
      payment_method: 'qr_online',
      order_total: total,
      cashback_amount: cashback,
      status: 'paid'
    })

    const { data: updated, error: updateError } = await supabase
      .from('rms_loyalty_clients')
      .update({
        bonus_balance: nextBalance,
        total_spent: nextSpent,
        visits_count: nextVisits,
        updated_at: new Date().toISOString()
      })
      .eq('id', loyaltyClient.id)
      .select('*')
      .single()

    if (updateError) return setLoyaltyMessage(updateError.message)

    setLoyaltyClient(updated)
    setLoyaltyMessage(`Оплата QR Menu засчитана. Начислено ${fmt(cashback)} AZN бонусов.`)
  }

  function logoutLoyalty() {
    localStorage.removeItem('qr_loyalty_phone')
    localStorage.removeItem('qr_loyalty_session_id')
    setLoyaltyPhone('')
    setLoyaltyOtp('')
    setLoyaltyClient(null)
    setLoyaltySession(null)
    setLoyaltyToken(null)
    setLoyaltyStep('phone')
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
  const loyaltyMaxRedeem = Math.min(loyaltyBalance, Number((loyaltyOrderBase * MAX_REDEEM_PERCENT / 100).toFixed(2)))
  const loyaltyEarnPreview = Number((loyaltyOrderBase * CASHBACK_PERCENT / 100).toFixed(2))
  const loyaltyScanLink = loyaltyToken?.token
    ? `${window.location.origin}${window.location.pathname}?loyalty_scan_token=${encodeURIComponent(loyaltyToken.token)}`
    : ''
  const loyaltyQrUrl = loyaltyScanLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(loyaltyScanLink)}`
    : ''
  const visibleBillItems = billItems.length ? billItems : cart.map((item) => ({
    ...item,
    product_name: item.product_name,
    qty: item.qty,
    price: item.price,
    total: item.total,
    category: item.category
  }))
  const visibleBillTotal = billTotal || cartTotal

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
      {!visibleBillItems.length ? <div className="qr-empty"><h3>Открытого счёта пока нет</h3><p>Если заказ собран в корзине, он появится здесь после добавления позиций.</p></div> : <>
        <div className="qr-bill-list">{visibleBillItems.map(i => <div className="qr-bill-item" key={i.id || i.product_id}><div><b>{i.product_name}</b><p>{i.category || ''}</p></div><div className="qr-bill-price"><span>{fmt(i.qty)} × {fmt(i.price)}</span><b>{fmt(i.total)} AZN</b></div></div>)}</div>
        <div className="qr-bill-total"><div className="qr-grand-total"><span>Total</span><b>{fmt(visibleBillTotal)} AZN</b></div></div>
        <div className="qr-payment-box">{!payChoice ? <button onClick={() => setPayChoice(true)}>Оплатить</button> : <><h3>Выберите способ оплаты</h3><button onClick={simulateQrPayment}>QR online payment · начислить cashback</button><button>Apple Pay</button><button>Google Pay</button><button>Банковская карта</button></>}</div>
      </>}
    </section>}

    {screen === 'loyalty' && <section className="qr-panel qr-loyalty-panel">
      <div className="qr-section-head">
        <div>
          <h1>Loyalty</h1>
          <p>Войдите по номеру телефона через WhatsApp/SMS OTP. После входа можно видеть баланс, получать cashback и показывать QR-код официанту.</p>
        </div>
      </div>

      {loyaltyStep !== 'verified' ? <>
        <div className="qr-loyalty-login">
          <input value={loyaltyPhone} onChange={(e) => setLoyaltyPhone(e.target.value)} placeholder="+994 XX XXX XX XX" />
          <button onClick={sendLoyaltyOtp}>Получить код</button>
        </div>
        {loyaltyStep === 'otp' ? <div className="qr-loyalty-pin">
          <input value={loyaltyOtp} onChange={(e) => setLoyaltyOtp(e.target.value)} placeholder="OTP код" inputMode="numeric" maxLength="6" />
          <button onClick={verifyLoyaltyOtp}>Войти</button>
        </div> : null}
      </> : null}

      {loyaltyMessage ? <div className="qr-loyalty-message">{loyaltyMessage}</div> : null}

      {loyaltyClient && loyaltyStep === 'verified' ? <>
        <div className={`qr-loyalty-card ${loyaltyClient.level || 'new'} verified`}>
          <span>Ваш уровень</span>
          <h2>{String(loyaltyClient.level || 'new').toUpperCase()}</h2>
          <p>{loyaltyClient.name || 'Гость'} · {loyaltyClient.phone}</p>
          <div className="qr-loyalty-balance">
            <div><small>Баланс</small><b>{fmt(loyaltyBalance)} AZN</b></div>
            <div><small>Покупки</small><b>{fmt(loyaltyClient.total_spent)} AZN</b></div>
            <div><small>Визиты</small><b>{loyaltyClient.visits_count || 0}</b></div>
          </div>
        </div>

        <div className="qr-loyalty-rules">
          <div><span>Cashback</span><b>{CASHBACK_PERCENT}%</b><small>после оплаты QR/POS</small></div>
          <div><span>Можно списать</span><b>{fmt(loyaltyMaxRedeem)} AZN</b><small>максимум {MAX_REDEEM_PERCENT}% от текущего чека</small></div>
          <div><span>Будет начислено</span><b>{fmt(loyaltyEarnPreview)} AZN</b><small>по текущему заказу/счёту</small></div>
        </div>

        <div className="qr-loyalty-token">
          <span>QR-код для официанта / POS</span>
          {loyaltyQrUrl ? <div className="qr-token-box"><img src={loyaltyQrUrl} alt="Loyalty QR" /><small>{loyaltyToken?.token?.slice(0, 8).toUpperCase()}</small></div> : <div className="qr-token-box">QR</div>}
          <p>Официант сканирует этот QR обычной камерой телефона. Откроется RMS Pro → Loyalty POS Scan: можно начислить cashback или списать бонусы при оплате.</p>
          <button onClick={generateNewLoyaltyToken}>Обновить QR-код</button>
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
