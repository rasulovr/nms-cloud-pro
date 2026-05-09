import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const fmt = (n) => Number(n || 0).toFixed(2)

const demoProducts = [
  { id: 'demo-cappuccino', name: 'Cappuccino', category: 'Coffee', description: 'Espresso, steamed milk and soft foam.', price: 5.5, image_url: '' },
  { id: 'demo-croissant', name: 'Butter Croissant', category: 'Breakfast', description: 'Fresh butter croissant.', price: 4.5, image_url: '' },
  { id: 'demo-salmon', name: 'Grilled Salmon', category: 'Main Courses', description: 'Grilled salmon with seasonal vegetables.', price: 24, image_url: '' },
  { id: 'demo-cheesecake', name: 'Cheesecake', category: 'Desserts', description: 'Classic creamy cheesecake.', price: 9, image_url: '' }
]

function getQrParams() {
  const searchParams = new URLSearchParams(window.location.search || '')
  const hash = window.location.hash || ''
  let hashParams = new URLSearchParams('')

  if (hash.includes('?')) {
    hashParams = new URLSearchParams(hash.split('?')[1] || '')
  }

  return {
    branch: searchParams.get('branch') || hashParams.get('branch') || 'BC1',
    table: searchParams.get('table') || hashParams.get('table') || '1'
  }
}

export default function QRMenu() {
  const { branch, table } = getQrParams()
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [screen, setScreen] = useState('menu')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    setMessage('')

    const possibleTables = ['rms_menu_products', 'menu_products', 'products']

    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(200)
        if (!error && Array.isArray(data) && data.length) {
          const normalized = data
            .filter((p) => p.is_active !== false && p.active !== false && p.is_available !== false)
            .map((p) => ({
              id: String(p.id),
              name: p.name || p.product_name || p.title || 'Без названия',
              category: p.category || p.category_name || p.group_name || 'Menu',
              description: p.description || p.comment || '',
              price: Number(p.price ?? p.sale_price ?? p.unit_price ?? 0),
              image_url: p.image_url || p.photo_url || p.image || ''
            }))

          if (normalized.length) {
            setProducts(normalized)
            setLoading(false)
            return
          }
        }
      } catch (_) {
        // Continue to demo fallback
      }
    }

    setProducts(demoProducts)
    setMessage('Демо-меню: реальные блюда RMS не найдены или таблица меню называется иначе.')
    setLoading(false)
  }

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))], [products])
  const shownProducts = useMemo(() => category === 'All' ? products : products.filter((p) => p.category === category), [products, category])
  const total = cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0)

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === product.id)
      if (found) return prev.map((x) => x.id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, { id: product.id, name: product.name, price: Number(product.price || 0), qty: 1, comment: '' }]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) => prev.map((x) => x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter((x) => x.qty > 0))
  }

  function updateComment(id, comment) {
    setCart((prev) => prev.map((x) => x.id === id ? { ...x, comment } : x))
  }

  function guestSession() {
    let session = localStorage.getItem('rms_qr_guest_session')
    if (!session) {
      session = window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now())
      localStorage.setItem('rms_qr_guest_session', session)
    }
    return session
  }

  async function submitOrder() {
    if (!cart.length) return
    setLoading(true)
    setMessage('')

    try {
      const { data: order, error } = await supabase
        .from('rms_qr_orders')
        .insert({ branch_id: branch, table_number: table, guest_session: guestSession(), total, status: 'new', payment_status: 'unpaid' })
        .select()
        .single()

      if (error) throw error

      const items = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        qty: item.qty,
        price: item.price,
        total: item.qty * item.price,
        comment: item.comment || ''
      }))

      const { error: itemsError } = await supabase.from('rms_qr_order_items').insert(items)
      if (itemsError) throw itemsError

      setOrderId(order.id)
      setCart([])
      setScreen('status')
    } catch (e) {
      setMessage(`Заказ не отправлен: ${e?.message || 'проверь SQL таблицы Supabase'}`)
    }

    setLoading(false)
  }

  async function rateDish(product, rating) {
    try {
      await supabase.from('rms_qr_dish_ratings').insert({ branch_id: branch, product_id: product.id, product_name: product.name, rating, guest_session: guestSession() })
      setMessage(`Оценка ${rating}★ сохранена: ${product.name}`)
    } catch (e) {
      setMessage(`Оценка не сохранена: ${e?.message || 'ошибка'}`)
    }
  }

  if (screen === 'cart') {
    return <div className="qr-page">
      <Header branch={branch} table={table} />
      <button className="qr-back" onClick={() => setScreen('menu')}>← Назад</button>
      <h2>Ваш заказ</h2>
      {message && <div className="qr-alert">{message}</div>}
      {!cart.length && <p className="qr-muted">Корзина пока пустая.</p>}
      <div className="qr-cart-list">
        {cart.map((item) => <div className="qr-cart-item" key={item.id}>
          <div className="qr-cart-line"><div><b>{item.name}</b><span>{fmt(item.price)} AZN</span></div><strong>{fmt(item.price * item.qty)} AZN</strong></div>
          <div className="qr-qty"><button onClick={() => changeQty(item.id, -1)}>-</button><span>{item.qty}</span><button onClick={() => changeQty(item.id, 1)}>+</button></div>
          <textarea placeholder="Комментарий к блюду" value={item.comment} onChange={(e) => updateComment(item.id, e.target.value)} />
        </div>)}
      </div>
      <div className="qr-total"><span>Итого</span><b>{fmt(total)} AZN</b></div>
      <button className="qr-main-btn" disabled={!cart.length || loading} onClick={submitOrder}>{loading ? 'Отправляем...' : 'Отправить заказ'}</button>
    </div>
  }

  if (screen === 'status') {
    return <div className="qr-page">
      <Header branch={branch} table={table} />
      <div className="qr-success"><h1>Заказ принят</h1><p>Заказ отправлен в RMS/POS.</p><small>{orderId}</small></div>
      <div className="qr-status-box"><div className="active">Принят</div><div>Готовится</div><div>Готов к подаче</div><div>Подан</div></div>
      <button className="qr-main-btn" onClick={() => setScreen('menu')}>Вернуться в меню</button>
    </div>
  }

  return <div className="qr-page">
    <Header branch={branch} table={table} />
    <div className="qr-hero"><h1>QR Menu</h1><p>Выберите блюда, отправьте заказ и оплатите прямо со стола.</p></div>
    {message && <div className="qr-alert">{message}</div>}
    <div className="qr-categories">{categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
    {loading && <p className="qr-muted">Загрузка меню...</p>}
    <div className="qr-products">
      {shownProducts.map((product) => <div className="qr-card" key={product.id}>
        <div className="qr-photo">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name.slice(0, 1)}</span>}</div>
        <div className="qr-card-body"><div className="qr-card-top"><h3>{product.name}</h3><b>{fmt(product.price)} AZN</b></div><p>{product.description || 'Описание блюда будет добавлено в RMS.'}</p><div className="qr-actions"><button onClick={() => addToCart(product)}>+ Добавить</button><div className="qr-rating">{[1,2,3,4,5].map((r) => <button key={r} onClick={() => rateDish(product, r)}>★</button>)}</div></div></div>
      </div>)}
    </div>
    <button className="qr-cart-floating" onClick={() => setScreen('cart')}>Заказ · {cart.reduce((s, i) => s + i.qty, 0)} · {fmt(total)} AZN</button>
  </div>
}

function Header({ branch, table }) {
  return <div className="qr-header"><div><b>RMS QR Menu</b><span>Филиал {branch} · Стол {table}</span></div><button onClick={() => alert('Официант будет уведомлён на следующем этапе.')}>Позвать официанта</button></div>
}
