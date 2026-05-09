import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './QRMenu.css'

const fmt = (n) => Number(n || 0).toFixed(2)

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1555507036-ab794f4afe5e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80'
]

const DEMO_PRODUCTS = [
  {
    id: 'demo-cappuccino',
    name: 'Cappuccino',
    category: 'Coffee',
    description: 'Classic espresso with steamed milk and soft foam.',
    price: 5.5,
    rating: 4.8,
    image_url: FALLBACK_PHOTOS[0]
  },
  {
    id: 'demo-croissant',
    name: 'Butter Croissant',
    category: 'Breakfast',
    description: 'Fresh baked butter croissant.',
    price: 4.5,
    rating: 4.7,
    image_url: FALLBACK_PHOTOS[1]
  },
  {
    id: 'demo-caesar',
    name: 'Caesar Salad',
    category: 'Salads',
    description: 'Romaine lettuce, parmesan, croutons and Caesar dressing.',
    price: 12,
    rating: 4.6,
    image_url: FALLBACK_PHOTOS[2]
  },
  {
    id: 'demo-salmon',
    name: 'Grilled Salmon',
    category: 'Main Courses',
    description: 'Grilled salmon with seasonal vegetables.',
    price: 24,
    rating: 4.9,
    image_url: FALLBACK_PHOTOS[3]
  },
  {
    id: 'demo-cheesecake',
    name: 'Basque Cheesecake',
    category: 'Desserts',
    description: 'Creamy burnt cheesecake with delicate caramel notes.',
    price: 9,
    rating: 4.8,
    image_url: FALLBACK_PHOTOS[4]
  },
  {
    id: 'demo-lemonade',
    name: 'Homemade Lemonade',
    category: 'Drinks',
    description: 'Fresh lemon, mint and sparkling water.',
    price: 6,
    rating: 4.5,
    image_url: FALLBACK_PHOTOS[5]
  }
]

export default function QRMenu() {
  const rawParams =
    window.location.search ||
    (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')

  const params = new URLSearchParams(rawParams)
  const initialBranch = params.get('branch') || 'BC1'
  const initialTable = params.get('table') || '1'

  const [branchId] = useState(initialBranch)
  const [tableNumber] = useState(initialTable)
  const [screen, setScreen] = useState('menu')
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState({})
  const [category, setCategory] = useState('All')
  const [bill, setBill] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [loadingBill, setLoadingBill] = useState(false)

  useEffect(() => {
    loadProducts()
    loadRatings()
    loadBill()
  }, [])

  async function loadProducts() {
    setLoadingMenu(true)

    const { data, error } = await supabase
      .from('rms_menu_products')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data?.length) {
      const normalized = data
        .filter((p) => p.is_active !== false && p.is_available !== false && p.is_stop !== true)
        .map((p, index) => ({
          ...p,
          id: String(p.id),
          name: p.name || p.product_name || p.title || 'Unnamed item',
          category: p.category || p.category_name || 'Menu',
          description: p.description || p.desc || '',
          price: Number(p.price ?? p.sale_price ?? p.menu_price ?? 0),
          image_url: p.image_url || p.photo_url || p.image || FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length]
        }))

      setProducts(normalized)
    } else {
      setProducts(DEMO_PRODUCTS)
    }

    setLoadingMenu(false)
  }

  async function loadRatings() {
    const { data } = await supabase
      .from('rms_qr_dish_ratings')
      .select('product_id, rating')

    if (!data?.length) return

    const grouped = {}

    data.forEach((r) => {
      const id = String(r.product_id)
      if (!grouped[id]) grouped[id] = { sum: 0, count: 0 }
      grouped[id].sum += Number(r.rating || 0)
      grouped[id].count += 1
    })

    const next = {}

    Object.entries(grouped).forEach(([id, value]) => {
      next[id] = {
        rating: value.count ? value.sum / value.count : 0,
        count: value.count
      }
    })

    setRatings(next)
  }

  async function loadBill() {
    setLoadingBill(true)

    const { data: billData, error: billError } = await supabase
      .from('rms_qr_live_bills')
      .select('*')
      .eq('branch_id', branchId)
      .eq('table_number', tableNumber)
      .in('status', ['open', 'pending', 'unpaid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!billError && billData?.id) {
      const { data: itemsData } = await supabase
        .from('rms_qr_live_bill_items')
        .select('*')
        .eq('bill_id', billData.id)
        .order('created_at', { ascending: true })

      setBill(billData)
      setBillItems(itemsData || [])
    } else {
      setBill(null)
      setBillItems([])
    }

    setLoadingBill(false)
  }

  async function rateDish(product, rating) {
    const guestSession = localStorage.getItem('qr_guest_session') || crypto.randomUUID()
    localStorage.setItem('qr_guest_session', guestSession)

    await supabase.from('rms_qr_dish_ratings').insert({
      branch_id: branchId,
      product_id: String(product.id),
      product_name: product.name,
      rating,
      guest_session: guestSession
    })

    await loadRatings()
  }

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))]
    return ['All', ...cats]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (category === 'All') return products
    return products.filter((p) => p.category === category)
  }, [products, category])

  const billSubtotal = billItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const serviceAmount = Number(bill?.service_amount || 0)
  const discountAmount = Number(bill?.discount_amount || 0)
  const billTotal = Number(bill?.total || billSubtotal + serviceAmount - discountAmount)

  if (screen === 'bill') {
    return (
      <div className="qr-page">
        <Header branchId={branchId} tableNumber={tableNumber} screen={screen} setScreen={setScreen} />

        <section className="qr-panel">
          <div className="qr-section-head">
            <div>
              <h1>Ваш счёт</h1>
              <p>Позиции отображаются из RMS/POS. Заказ через QR Menu пока отключён.</p>
            </div>
            <button className="qr-refresh" onClick={loadBill}>Обновить</button>
          </div>

          {loadingBill ? (
            <div className="qr-empty">Загрузка счёта...</div>
          ) : !bill ? (
            <div className="qr-empty">
              <h3>Открытого счёта пока нет</h3>
              <p>Когда официант откроет счёт на этот стол в POS/RMS, он появится здесь.</p>
            </div>
          ) : (
            <>
              <div className="qr-bill-meta">
                <span>Статус: {bill.status || 'open'}</span>
                <span>Оплата: {bill.payment_status || 'unpaid'}</span>
              </div>

              <div className="qr-bill-list">
                {billItems.map((item) => (
                  <div className="qr-bill-item" key={item.id}>
                    <div>
                      <b>{item.product_name}</b>
                      {item.comment ? <p>{item.comment}</p> : null}
                    </div>
                    <div className="qr-bill-price">
                      <span>{fmt(item.qty)} × {fmt(item.price)}</span>
                      <b>{fmt(item.total)} AZN</b>
                    </div>
                  </div>
                ))}
              </div>

              <div className="qr-bill-total">
                <div><span>Subtotal</span><b>{fmt(billSubtotal)} AZN</b></div>
                <div><span>Service</span><b>{fmt(serviceAmount)} AZN</b></div>
                {discountAmount > 0 ? <div><span>Discount</span><b>-{fmt(discountAmount)} AZN</b></div> : null}
                <div className="qr-grand-total"><span>Total</span><b>{fmt(billTotal)} AZN</b></div>
              </div>
            </>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="qr-page">
      <Header branchId={branchId} tableNumber={tableNumber} screen={screen} setScreen={setScreen} />

      <section className="qr-hero">
        <div>
          <span className="qr-kicker">Digital Menu</span>
          <h1>RMS QR Menu</h1>
          <p>Смотрите меню, фото блюд, цены, рейтинги и текущий счёт по вашему столу.</p>
        </div>
        <button className="qr-bill-button" onClick={() => setScreen('bill')}>
          Мой счёт
        </button>
      </section>

      <div className="qr-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={cat === category ? 'active' : ''}
            onClick={() => setCategory(cat)}
          >
            {cat === 'All' ? 'Все' : cat}
          </button>
        ))}
      </div>

      {loadingMenu ? <div className="qr-empty">Загрузка меню...</div> : null}

      <div className="qr-products">
        {filteredProducts.map((product) => {
          const rate = ratings[String(product.id)]
          const displayRating = rate?.rating || product.rating || 0

          return (
            <article className="qr-card" key={product.id}>
              <div className="qr-photo">
                <img src={product.image_url} alt={product.name} loading="lazy" />
              </div>

              <div className="qr-card-body">
                <div className="qr-card-top">
                  <div>
                    <h3>{product.name}</h3>
                    <span>{product.category}</span>
                  </div>
                  <b>{fmt(product.price)} AZN</b>
                </div>

                <p>{product.description || 'Описание блюда будет добавлено в RMS.'}</p>

                <div className="qr-card-footer">
                  <div className="qr-rating-view">
                    <b>★ {displayRating ? displayRating.toFixed(1) : '—'}</b>
                    {rate?.count ? <span>{rate.count} оценок</span> : <span>оцените блюдо</span>}
                  </div>

                  <div className="qr-rating-actions">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} onClick={() => rateDish(product, r)}>★</button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <button className="qr-floating-bill" onClick={() => setScreen('bill')}>
        Мой счёт · стол {tableNumber}
      </button>
    </div>
  )
}

function Header({ branchId, tableNumber, screen, setScreen }) {
  return (
    <header className="qr-header">
      <div>
        <b>RMS QR Menu</b>
        <span>Филиал {branchId} · Стол {tableNumber}</span>
      </div>

      <nav>
        <button className={screen === 'menu' ? 'active' : ''} onClick={() => setScreen('menu')}>Меню</button>
        <button className={screen === 'bill' ? 'active' : ''} onClick={() => setScreen('bill')}>Счёт</button>
      </nav>
    </header>
  )
}
