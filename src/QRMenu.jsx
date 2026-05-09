import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './QRMenu.css'

const fmt = (n) => Number(n || 0).toFixed(2)

const FALLBACK_PRODUCTS = [
  {
    id: 'demo-cappuccino',
    name: 'Cappuccino',
    category: 'Coffee',
    description: 'Classic espresso with steamed milk and soft foam.',
    price: 5.5,
    image_url: '',
    is_active: true
  },
  {
    id: 'demo-croissant',
    name: 'Croissant',
    category: 'Breakfast',
    description: 'Fresh butter croissant.',
    price: 4.5,
    image_url: '',
    is_active: true
  },
  {
    id: 'demo-salmon',
    name: 'Grilled Salmon',
    category: 'Main Courses',
    description: 'Grilled salmon with seasonal vegetables.',
    price: 24,
    image_url: '',
    is_active: true
  }
]

function getParam(name, fallback) {
  const rawParams =
    window.location.search ||
    (window.location.hash.includes('?')
      ? '?' + window.location.hash.split('?')[1]
      : '')

  const params = new URLSearchParams(rawParams)
  return params.get(name) || fallback
}

function normalizeProduct(row) {
  return {
    id: String(row.id || row.product_id || crypto.randomUUID()),
    name: row.name || row.product_name || row.title || 'Без названия',
    category: row.category || row.category_name || 'Menu',
    description: row.description || row.note || '',
    price: Number(row.price || row.sale_price || row.menu_price || 0),
    image_url: row.image_url || row.photo_url || '',
    is_active: row.is_active !== false,
    is_stop: row.is_stop === true || row.stop_list === true || row.is_available === false
  }
}

export default function QRMenu() {
  const [branchId] = useState(getParam('branch', 'BC1'))
  const [tableNumber] = useState(getParam('table', '1'))
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [screen, setScreen] = useState('menu')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [orderId, setOrderId] = useState(null)
  const [orderStatus, setOrderStatus] = useState('new')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [guestComment, setGuestComment] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (!orderId) return

    const channel = supabase
      .channel(`qr-order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rms_qr_orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if (payload?.new?.status) setOrderStatus(payload.new.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  async function loadProducts() {
    setLoading(true)
    setErrorText('')

    const candidates = [
      { table: 'rms_menu_products', select: '*' },
      { table: 'rms_recipes_workspace', select: '*' },
      { table: 'rms_products_workspace', select: '*' }
    ]

    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from(candidate.table)
        .select(candidate.select)
        .limit(500)

      if (!error && Array.isArray(data) && data.length) {
        const normalized = data
          .map(normalizeProduct)
          .filter((p) => p.is_active && !p.is_stop)

        if (normalized.length) {
          setProducts(normalized)
          setLoading(false)
          return
        }
      }
    }

    setProducts(FALLBACK_PRODUCTS)
    setErrorText('Показано demo-меню. Для реальной интеграции подключите таблицу меню RMS.')
    setLoading(false)
  }

  const categories = useMemo(() => {
    const list = [...new Set(products.map((p) => p.category).filter(Boolean))]
    return ['All', ...list]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (category === 'All') return products
    return products.filter((p) => p.category === category)
  }, [products, category])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [cart]
  )

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === product.id)
      if (found) return prev.map((x) => (x.id === product.id ? { ...x, qty: x.qty + 1 } : x))
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, comment: '' }]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    )
  }

  function updateComment(id, comment) {
    setCart((prev) => prev.map((x) => (x.id === id ? { ...x, comment } : x)))
  }

  function getGuestSession() {
    const existing = localStorage.getItem('rms_qr_guest_session')
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem('rms_qr_guest_session', created)
    return created
  }

  async function submitOrder() {
    if (!cart.length) return
    setLoading(true)
    setErrorText('')

    const guestSession = getGuestSession()

    const { data: order, error } = await supabase
      .from('rms_qr_orders')
      .insert({
        branch_id: branchId,
        table_number: tableNumber,
        guest_session: guestSession,
        total,
        status: 'new',
        payment_status: paymentMethod === 'cash' ? 'pay_at_counter' : 'pending',
        payment_method: paymentMethod,
        comment: guestComment || ''
      })
      .select()
      .single()

    if (error) {
      setErrorText(`Заказ не отправлен: ${error.message}`)
      setLoading(false)
      return
    }

    const items = cart.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      qty: item.qty,
      price: item.price,
      total: Number(item.qty || 0) * Number(item.price || 0),
      comment: item.comment || ''
    }))

    const { error: itemsError } = await supabase.from('rms_qr_order_items').insert(items)

    if (itemsError) {
      setErrorText(`Заказ создан, но товары не записались: ${itemsError.message}`)
      setLoading(false)
      return
    }

    setOrderId(order.id)
    setOrderStatus(order.status || 'new')
    setCart([])
    setGuestComment('')
    setScreen('status')
    setLoading(false)
  }

  async function rateDish(product, rating) {
    const { error } = await supabase.from('rms_qr_dish_ratings').insert({
      branch_id: branchId,
      product_id: product.id,
      product_name: product.name,
      rating,
      guest_session: getGuestSession()
    })

    if (error) {
      setErrorText(`Оценка не сохранена: ${error.message}`)
      return
    }

    setErrorText('Спасибо, оценка сохранена.')
  }

  if (screen === 'cart') {
    return (
      <div className="qr-page">
        <Header branchId={branchId} tableNumber={tableNumber} />
        <button className="qr-link-btn" onClick={() => setScreen('menu')}>← Назад в меню</button>
        <h2>Ваш заказ</h2>
        {errorText && <div className="qr-alert">{errorText}</div>}
        {!cart.length && <p className="qr-muted">Корзина пока пустая.</p>}

        <div className="qr-cart-list">
          {cart.map((item) => (
            <div className="qr-cart-item" key={item.id}>
              <div className="qr-cart-row">
                <div>
                  <b>{item.name}</b>
                  <div className="qr-muted">{fmt(item.price)} AZN</div>
                </div>
                <div className="qr-qty">
                  <button onClick={() => changeQty(item.id, -1)}>-</button>
                  <span>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)}>+</button>
                </div>
              </div>
              <textarea
                placeholder="Комментарий к блюду: без сахара, без лука и т.д."
                value={item.comment}
                onChange={(e) => updateComment(item.id, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="qr-payment-box">
          <h3>Способ оплаты</h3>
          <div className="qr-payment-options">
            <button className={paymentMethod === 'cash' ? 'active' : ''} onClick={() => setPaymentMethod('cash')}>Официанту</button>
            <button className={paymentMethod === 'card' ? 'active' : ''} onClick={() => setPaymentMethod('card')}>Картой</button>
            <button className={paymentMethod === 'apple_google_pay' ? 'active' : ''} onClick={() => setPaymentMethod('apple_google_pay')}>Apple/Google Pay</button>
          </div>
          <textarea
            placeholder="Общий комментарий к заказу"
            value={guestComment}
            onChange={(e) => setGuestComment(e.target.value)}
          />
        </div>

        <div className="qr-total">
          <span>Итого</span>
          <b>{fmt(total)} AZN</b>
        </div>

        <button className="qr-main-btn" disabled={!cart.length || loading} onClick={submitOrder}>
          {loading ? 'Отправляем...' : 'Отправить заказ'}
        </button>
      </div>
    )
  }

  if (screen === 'status') {
    return (
      <div className="qr-page">
        <Header branchId={branchId} tableNumber={tableNumber} />
        <h2>Заказ принят</h2>
        {errorText && <div className="qr-alert">{errorText}</div>}
        <p className="qr-muted">Статус обновляется автоматически после изменения в RMS/POS.</p>
        <StatusBox status={orderStatus} />
        <button className="qr-main-btn" onClick={() => setScreen('menu')}>Вернуться в меню</button>
      </div>
    )
  }

  return (
    <div className="qr-page">
      <Header branchId={branchId} tableNumber={tableNumber} />
      <div className="qr-hero">
        <h1>Menu</h1>
        <p>Выберите блюда, отправьте заказ со стола и оцените понравившиеся позиции.</p>
      </div>

      {errorText && <div className="qr-alert">{errorText}</div>}
      {loading && <p className="qr-muted">Загрузка меню...</p>}

      <div className="qr-categories">
        {categories.map((cat) => (
          <button key={cat} className={cat === category ? 'active' : ''} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div className="qr-products">
        {filteredProducts.map((product) => (
          <div className="qr-card" key={product.id}>
            <div className="qr-photo">
              {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name?.slice(0, 1)}</span>}
            </div>
            <div className="qr-card-body">
              <div className="qr-card-top">
                <h3>{product.name}</h3>
                <b>{fmt(product.price)} AZN</b>
              </div>
              <p>{product.description || 'Описание будет подтягиваться из RMS.'}</p>
              <div className="qr-actions">
                <button onClick={() => addToCart(product)}>+ Добавить</button>
                <div className="qr-rating" title="Оценить блюдо">
                  {[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => rateDish(product, r)}>★</button>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="qr-cart-floating" onClick={() => setScreen('cart')}>
        Заказ · {cart.reduce((sum, item) => sum + item.qty, 0)} · {fmt(total)} AZN
      </button>
    </div>
  )
}

function Header({ branchId, tableNumber }) {
  return (
    <div className="qr-header">
      <div>
        <b>RMS QR Menu</b>
        <span>{branchId} · Стол {tableNumber}</span>
      </div>
      <button type="button" onClick={() => alert('Вызов официанта будет отправляться в POS/RMS на следующем этапе.')}>Позвать официанта</button>
    </div>
  )
}

function StatusBox({ status }) {
  const steps = [
    { id: 'new', label: 'Принят' },
    { id: 'cooking', label: 'Готовится' },
    { id: 'ready', label: 'Готов к подаче' },
    { id: 'served', label: 'Подан' }
  ]
  const currentIndex = Math.max(0, steps.findIndex((s) => s.id === status))

  return (
    <div className="qr-status-box">
      {steps.map((step, index) => (
        <div key={step.id} className={index <= currentIndex ? 'active' : ''}>{step.label}</div>
      ))}
    </div>
  )
}
