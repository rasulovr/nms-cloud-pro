import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './QRMenu.css'

const fmt = (n) => Number(n || 0).toFixed(2)

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555507036-ab794f4afe5e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80'
]

const DEFAULT_INFO = {
  wifi_name: 'RMS Guest',
  wifi_password: 'ask waiter',
  working_hours: '09:00 — 23:00',
  phone: '+994 XX XXX XX XX',
  instagram: '@restaurant',
  facebook: '',
  tiktok: '',
  website: '',
  address: 'Baku, Azerbaijan'
}

const DEMO_PRODUCTS = [
  { id: 'demo-cappuccino', name: 'Cappuccino', category: 'Coffee', description: 'Classic espresso with steamed milk and soft foam.', price: 5.5, rating: 4.8, image_url: FALLBACK_PHOTOS[0] },
  { id: 'demo-croissant', name: 'Butter Croissant', category: 'Breakfast', description: 'Fresh baked butter croissant.', price: 4.5, rating: 4.7, image_url: FALLBACK_PHOTOS[1] },
  { id: 'demo-caesar', name: 'Caesar Salad', category: 'Salads', description: 'Romaine lettuce, parmesan, croutons and Caesar dressing.', price: 12, rating: 4.6, image_url: FALLBACK_PHOTOS[2] },
  { id: 'demo-salmon', name: 'Grilled Salmon', category: 'Main Courses', description: 'Grilled salmon with seasonal vegetables.', price: 24, rating: 4.9, image_url: FALLBACK_PHOTOS[3] },
  { id: 'demo-cheesecake', name: 'Basque Cheesecake', category: 'Desserts', description: 'Creamy burnt cheesecake with delicate caramel notes.', price: 9, rating: 4.8, image_url: FALLBACK_PHOTOS[4] },
  { id: 'demo-lemonade', name: 'Homemade Lemonade', category: 'Drinks', description: 'Fresh lemon, mint and sparkling water.', price: 6, rating: 4.5, image_url: FALLBACK_PHOTOS[5] }
]

const DEMO_RECOMMENDATIONS = {
  'demo-cappuccino': ['Butter Croissant', 'Basque Cheesecake'],
  'demo-croissant': ['Cappuccino', 'Homemade Lemonade'],
  'demo-caesar': ['Grilled Salmon', 'Homemade Lemonade'],
  'demo-salmon': ['Caesar Salad', 'Homemade Lemonade']
}

const DEMO_AD = {
  title: 'Special offer',
  text: 'Cappuccino + croissant combo is available today.',
  image_url: FALLBACK_PHOTOS[1],
  is_active: true
}

export default function QRMenu() {
  const rawParams = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')
  const params = new URLSearchParams(rawParams)
  const initialBranch = params.get('branch') || 'BC1'
  const initialTable = params.get('table') || '1'

  const [branchId] = useState(initialBranch)
  const [tableNumber] = useState(initialTable)
  const [screen, setScreen] = useState('menu')
  const [products, setProducts] = useState([])
  const [ratings, setRatings] = useState({})
  const [recommendations, setRecommendations] = useState({})
  const [category, setCategory] = useState('All')
  const [bill, setBill] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [info, setInfo] = useState(DEFAULT_INFO)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [loadingBill, setLoadingBill] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showPaymentChoice, setShowPaymentChoice] = useState(false)
  const [ad, setAd] = useState(null)
  const [showAd, setShowAd] = useState(false)

  useEffect(() => {
    loadProducts()
    loadRatings()
    loadBill()
    loadActiveAd()
    loadInfo()
    loadRecommendations()
  }, [])

  useEffect(() => {
    if (!showAd) return
    const timer = setTimeout(() => setShowAd(false), 4500)
    return () => clearTimeout(timer)
  }, [showAd])

  async function loadProducts() {
    setLoadingMenu(true)
    const { data, error } = await supabase.from('rms_menu_products').select('*').order('name', { ascending: true })

    if (!error && data?.length) {
      setProducts(data
        .filter((p) => p.is_active !== false && p.is_available !== false && p.is_stop !== true)
        .map((p, index) => ({
          ...p,
          id: String(p.id),
          name: p.name || p.product_name || p.title || 'Unnamed item',
          category: p.category || p.category_name || 'Menu',
          description: p.description || p.desc || '',
          price: Number(p.price ?? p.sale_price ?? p.menu_price ?? 0),
          image_url: p.image_url || p.photo_url || p.image || FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length]
        })))
    } else {
      setProducts(DEMO_PRODUCTS)
    }
    setLoadingMenu(false)
  }

  async function loadRecommendations() {
    const { data, error } = await supabase.from('rms_qr_recommendations').select('*').eq('is_active', true)
    if (error || !data?.length) {
      setRecommendations(DEMO_RECOMMENDATIONS)
      return
    }

    const grouped = {}
    data.forEach((r) => {
      const key = String(r.product_id)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r.recommended_product_name || r.recommended_product_id)
    })
    setRecommendations(grouped)
  }

  async function loadRatings() {
    const { data } = await supabase.from('rms_qr_dish_ratings').select('product_id, rating')
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
      next[id] = { rating: value.count ? value.sum / value.count : 0, count: value.count }
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

  async function loadInfo() {
    const { data, error } = await supabase.from('rms_qr_info').select('*').eq('branch_id', branchId).limit(1).maybeSingle()
    if (!error && data) setInfo({ ...DEFAULT_INFO, ...data })
  }

  async function loadActiveAd() {
    const { data, error } = await supabase.from('rms_qr_ads').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!error && data) {
      setAd(data)
      setShowAd(true)
    } else {
      setAd(DEMO_AD)
      setShowAd(true)
    }
  }

  async function rateDish(product, rating) {
    const guestSession = localStorage.getItem('qr_guest_session') || crypto.randomUUID()
    localStorage.setItem('qr_guest_session', guestSession)
    const todayKey = new Date().toISOString().slice(0, 10)
    const localVoteKey = `qr_vote_${branchId}_${product.id}_${todayKey}`

    if (localStorage.getItem(localVoteKey)) {
      alert('Вы уже оценили это блюдо сегодня.')
      return
    }

    const { error } = await supabase.from('rms_qr_dish_ratings').insert({
      branch_id: branchId,
      product_id: String(product.id),
      product_name: product.name,
      rating,
      guest_session: guestSession,
      rating_date: todayKey
    })

    if (error) {
      alert('Вы уже оценили это блюдо сегодня.')
      return
    }

    localStorage.setItem(localVoteKey, '1')
    await loadRatings()
  }

  function startPayment(method) {
    alert(`${method} пока подключается. Следующий этап — интеграция платежного провайдера и сохранение оплаты в RMS.`)
  }

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))], [products])
  const filteredProducts = useMemo(() => category === 'All' ? products : products.filter((p) => p.category === category), [products, category])

  const billSubtotal = billItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const serviceAmount = Number(bill?.service_amount || 0)
  const discountAmount = Number(bill?.discount_amount || 0)
  const billTotal = Number(bill?.total || billSubtotal + serviceAmount - discountAmount)
  const billCategories = [...new Set(billItems.map((item) => item.category || item.category_name || 'Без категории'))]

  return (
    <div className="qr-page theme-mediterranean">
      <Header branchId={branchId} tableNumber={tableNumber} screen={screen} setScreen={setScreen} />

      {screen === 'bill' ? (
        <BillScreen
          bill={bill}
          billItems={billItems}
          billCategories={billCategories}
          billSubtotal={billSubtotal}
          serviceAmount={serviceAmount}
          discountAmount={discountAmount}
          billTotal={billTotal}
          loadingBill={loadingBill}
          loadBill={loadBill}
          showPaymentChoice={showPaymentChoice}
          setShowPaymentChoice={setShowPaymentChoice}
          startPayment={startPayment}
        />
      ) : screen === 'info' ? (
        <InfoScreen info={info} />
      ) : (
        <MenuScreen
          categories={categories}
          category={category}
          setCategory={setCategory}
          loadingMenu={loadingMenu}
          filteredProducts={filteredProducts}
          ratings={ratings}
          recommendations={recommendations}
          rateDish={rateDish}
          setSelectedPhoto={setSelectedPhoto}
        />
      )}

      {selectedPhoto ? <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} /> : null}
      {showAd && ad?.is_active ? <AdPopup ad={ad} onClose={() => setShowAd(false)} /> : null}
    </div>
  )
}

function Header({ branchId, tableNumber, screen, setScreen }) {
  return (
    <header className="qr-header">
      <div className="qr-brand">
        <b>RMS QR Menu</b>
        <span>Филиал {branchId} · Стол {tableNumber}</span>
      </div>

      <nav>
        <button className={screen === 'menu' ? 'active' : ''} onClick={() => setScreen('menu')}>Меню</button>
        <button className={screen === 'bill' ? 'active' : ''} onClick={() => setScreen('bill')}>Счёт</button>
        <button className={screen === 'info' ? 'active' : ''} onClick={() => setScreen('info')}>Инфо</button>
      </nav>
    </header>
  )
}

function MenuScreen({ categories, category, setCategory, loadingMenu, filteredProducts, ratings, recommendations, rateDish, setSelectedPhoto }) {
  return (
    <>
      <div className="qr-categories">
        {categories.map((cat) => (
          <button key={cat} className={cat === category ? 'active' : ''} onClick={() => setCategory(cat)}>
            {cat === 'All' ? 'Все' : cat}
          </button>
        ))}
      </div>

      {loadingMenu ? <div className="qr-empty">Загрузка меню...</div> : null}

      <div className="qr-products">
        {filteredProducts.map((product) => {
          const rate = ratings[String(product.id)]
          const displayRating = rate?.rating || product.rating || 0
          const recs = recommendations[String(product.id)] || recommendations[product.name] || []

          return (
            <article className="qr-card" key={product.id}>
              <button className="qr-photo" onClick={() => setSelectedPhoto(product)} title="Увеличить фото">
                <img src={product.image_url} alt={product.name} loading="lazy" />
                <span>Увеличить</span>
              </button>

              <div className="qr-card-body">
                <div className="qr-card-top">
                  <div>
                    <h3>{product.name}</h3>
                    <small>{product.category}</small>
                  </div>
                  <b>{fmt(product.price)} AZN</b>
                </div>

                <p>{product.description || 'Описание блюда будет добавлено в RMS.'}</p>

                <div className="qr-card-footer">
                  <div className="qr-rating-view">
                    <RatingStars value={displayRating} />
                    {rate?.count ? <span>{rate.count} оценок</span> : <span>оцените блюдо</span>}
                  </div>

                  <div className="qr-rating-actions">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} onClick={() => rateDish(product, r)}>★</button>
                    ))}
                  </div>
                </div>

                {recs.length ? (
                  <div className="qr-recommendations">
                    <span>Рекомендуем:</span>
                    <div>
                      {recs.slice(0, 3).map((r) => <b key={r}>{r}</b>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

function RatingStars({ value }) {
  const rating = Number(value || 0)
  return (
    <div className="qr-stars" title={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={rating >= i ? 'filled' : rating >= i - 0.5 ? 'half' : ''}>★</span>
      ))}
      <b>{rating ? rating.toFixed(1) : '—'}</b>
    </div>
  )
}

function BillScreen({ bill, billItems, billCategories, billSubtotal, serviceAmount, discountAmount, billTotal, loadingBill, loadBill, showPaymentChoice, setShowPaymentChoice, startPayment }) {
  return (
    <section className="qr-panel">
      <div className="qr-section-head">
        <div>
          <h1>Ваш счёт</h1>
          <p>Позиции подтягиваются из RMS/POS по вашему столу.</p>
        </div>
        <button className="qr-refresh" onClick={loadBill}>Обновить</button>
      </div>

      {loadingBill ? (
        <div className="qr-empty">Загрузка счёта...</div>
      ) : !bill ? (
        <div className="qr-empty"><h3>Открытого счёта пока нет</h3><p>Когда официант откроет счёт на этот стол в POS/RMS, он появится здесь.</p></div>
      ) : (
        <>
          <div className="qr-bill-meta"><span>Статус: {bill.status || 'open'}</span><span>Оплата: {bill.payment_status || 'unpaid'}</span></div>

          {!billItems.length ? (
            <div className="qr-empty"><h3>Позиции пока не добавлены</h3><p>Счёт открыт, но блюда ещё не переданы в таблицу rms_qr_live_bill_items.</p></div>
          ) : (
            <div className="qr-bill-list">
              {billCategories.map((cat) => (
                <div className="qr-bill-category" key={cat}>
                  <h3>{cat}</h3>
                  {billItems.filter((item) => (item.category || item.category_name || 'Без категории') === cat).map((item) => (
                    <div className="qr-bill-item" key={item.id}>
                      <div><b>{item.product_name}</b>{item.comment ? <p>{item.comment}</p> : null}</div>
                      <div className="qr-bill-price"><span>{fmt(item.qty)} × {fmt(item.price)}</span><b>{fmt(item.total)} AZN</b></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="qr-bill-total">
            <div><span>Subtotal</span><b>{fmt(billSubtotal)} AZN</b></div>
            <div><span>Service</span><b>{fmt(serviceAmount)} AZN</b></div>
            {discountAmount > 0 ? <div><span>Discount</span><b>-{fmt(discountAmount)} AZN</b></div> : null}
            <div className="qr-grand-total"><span>Total</span><b>{fmt(billTotal)} AZN</b></div>
          </div>

          <div className="qr-payment-box">
            {!showPaymentChoice ? <button onClick={() => setShowPaymentChoice(true)}>Оплатить</button> : (
              <>
                <h3>Выберите способ оплаты</h3>
                <button onClick={() => startPayment('Apple Pay')}>Apple Pay</button>
                <button onClick={() => startPayment('Google Pay')}>Google Pay</button>
                <button onClick={() => startPayment('Card')}>Банковская карта</button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function InfoScreen({ info }) {
  return (
    <section className="qr-panel">
      <h1>Информация</h1>
      <div className="qr-info-grid">
        <InfoCard title="Wi‑Fi" value={info.wifi_name} sub={info.wifi_password ? `Пароль: ${info.wifi_password}` : ''} />
        <InfoCard title="Рабочие часы" value={info.working_hours} />
        <InfoCard title="Телефон" value={info.phone} />
        <InfoCard title="Адрес" value={info.address} />
      </div>

      <div className="qr-socials">
        {info.instagram ? <a href={normalizeSocial(info.instagram, 'instagram')} target="_blank" rel="noreferrer">Instagram</a> : null}
        {info.facebook ? <a href={normalizeSocial(info.facebook, 'facebook')} target="_blank" rel="noreferrer">Facebook</a> : null}
        {info.tiktok ? <a href={normalizeSocial(info.tiktok, 'tiktok')} target="_blank" rel="noreferrer">TikTok</a> : null}
        {info.website ? <a href={normalizeUrl(info.website)} target="_blank" rel="noreferrer">Website</a> : null}
      </div>

      <div className="qr-review-box">
        <h3>Отзывы</h3>
        <p>Расскажите, как вам обслуживание и блюда. Этот блок будет связан с рейтингом RMS.</p>
        <button onClick={() => alert('Отзывы будут подключены на следующем этапе QR Menu Admin.')}>Оставить отзыв</button>
      </div>
    </section>
  )
}

function InfoCard({ title, value, sub }) {
  return <div className="qr-info-card"><span>{title}</span><b>{value || '—'}</b>{sub ? <p>{sub}</p> : null}</div>
}

function normalizeUrl(value) {
  if (!value) return '#'
  return value.startsWith('http') ? value : `https://${value}`
}

function normalizeSocial(value, network) {
  if (!value) return '#'
  if (value.startsWith('http')) return value
  const clean = value.replace('@', '')
  if (network === 'instagram') return `https://instagram.com/${clean}`
  if (network === 'facebook') return `https://facebook.com/${clean}`
  if (network === 'tiktok') return `https://tiktok.com/@${clean}`
  return normalizeUrl(value)
}

function PhotoModal({ photo, onClose }) {
  return (
    <div className="qr-modal" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="qr-modal-close" onClick={onClose}>×</button>
        <img src={photo.image_url} alt={photo.name} />
        <div><h2>{photo.name}</h2><p>{photo.description}</p><b>{fmt(photo.price)} AZN</b></div>
      </div>
    </div>
  )
}

function AdPopup({ ad, onClose }) {
  return (
    <div className="qr-ad-popup">
      <button onClick={onClose}>×</button>
      {ad.image_url ? <img src={ad.image_url} alt={ad.title || 'Advertisement'} /> : null}
      <div><b>{ad.title || 'Акция'}</b><p>{ad.text || ad.description || 'Специальное предложение'}</p></div>
    </div>
  )
}
