import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const fmt = (n) => Number(n || 0).toFixed(2)
const appOrigin = () => window.location.origin

const defaultInfo = {
  branch_id: 'BC1',
  wifi_name: '',
  wifi_password: '',
  working_hours: '',
  phone: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  address: ''
}

const defaultProduct = {
  name: '',
  category: '',
  description: '',
  price: '',
  image_url: '',
  is_active: true,
  is_available: true,
  is_stop: false
}

export default function RMSQRMenuAdmin() {
  const [tab, setTab] = useState('tables')
  const [products, setProducts] = useState([])
  const [tables, setTables] = useState([])
  const [ratings, setRatings] = useState([])
  const [ads, setAds] = useState([])
  const [bills, setBills] = useState([])
  const [info, setInfo] = useState(defaultInfo)
  const [recommendations, setRecommendations] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [tableForm, setTableForm] = useState({ branch_id: 'BC1', from: 1, to: 10, prefix: '' })
  const [productForm, setProductForm] = useState(defaultProduct)
  const [adForm, setAdForm] = useState({ title: '', text: '', image_url: '', is_active: true })
  const [recForm, setRecForm] = useState({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadProducts(), loadTables(), loadRatings(), loadAds(), loadBills(), loadInfo(), loadRecommendations()])
    setLoading(false)
  }

  async function loadProducts() {
    const { data } = await supabase.from('rms_menu_products').select('*').order('name', { ascending: true })
    setProducts((data || []).map(normalizeProduct))
  }

  function normalizeProduct(p) {
    return {
      ...p,
      id: String(p.id),
      name: p.name || p.product_name || p.title || 'Unnamed item',
      category: p.category || p.category_name || 'Menu',
      description: p.description || p.desc || '',
      price: Number(p.price ?? p.sale_price ?? p.menu_price ?? 0),
      image_url: p.image_url || p.photo_url || p.image || '',
      is_active: p.is_active !== false,
      is_available: p.is_available !== false,
      is_stop: p.is_stop === true
    }
  }

  async function loadTables() {
    const { data } = await supabase.from('rms_qr_tables').select('*').order('branch_id').order('table_number')
    setTables(data || [])
  }

  async function loadRatings() {
    const { data } = await supabase.from('rms_qr_dish_ratings').select('*').order('created_at', { ascending: false }).limit(300)
    setRatings(data || [])
  }

  async function loadAds() {
    const { data } = await supabase.from('rms_qr_ads').select('*').order('created_at', { ascending: false })
    setAds(data || [])
  }

  async function loadBills() {
    const { data } = await supabase.from('rms_qr_live_bills').select('*').order('created_at', { ascending: false }).limit(100)
    setBills(data || [])
  }

  async function loadInfo() {
    const { data } = await supabase.from('rms_qr_info').select('*').eq('branch_id', info.branch_id || 'BC1').maybeSingle()
    if (data) setInfo({ ...defaultInfo, ...data })
  }

  async function loadRecommendations() {
    const { data } = await supabase.from('rms_qr_recommendations').select('*').order('created_at', { ascending: false })
    setRecommendations(data || [])
  }

  function qrUrl(branchId, tableNumber) {
    return `${appOrigin()}/?qr=menu&branch=${encodeURIComponent(branchId)}&table=${encodeURIComponent(tableNumber)}`
  }

  function qrImageUrl(branchId, tableNumber) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrUrl(branchId, tableNumber))}`
  }

  async function generateTables() {
    const from = Number(tableForm.from || 1)
    const to = Number(tableForm.to || from)
    if (!tableForm.branch_id || to < from) {
      setMsg('Проверь филиал и диапазон столов')
      return
    }

    const rows = []
    for (let i = from; i <= to; i++) {
      const tableNumber = `${tableForm.prefix || ''}${i}`
      rows.push({
        branch_id: tableForm.branch_id,
        table_number: tableNumber,
        qr_code_url: qrUrl(tableForm.branch_id, tableNumber),
        is_active: true
      })
    }

    const { error } = await supabase.from('rms_qr_tables').upsert(rows, { onConflict: 'branch_id,table_number' })
    if (error) setMsg(error.message)
    else {
      await loadTables()
      setMsg(`QR-столы созданы: ${rows.length}`)
    }
  }

  async function updateTable(row, patch) {
    const next = { ...patch }
    if (patch.branch_id || patch.table_number) {
      const branch = patch.branch_id || row.branch_id
      const table = patch.table_number || row.table_number
      next.qr_code_url = qrUrl(branch, table)
    }

    const { error } = await supabase.from('rms_qr_tables').update(next).eq('id', row.id)
    if (error) setMsg(error.message)
    else {
      await loadTables()
      setMsg('Стол обновлён')
    }
  }

  async function addProduct() {
    if (!productForm.name.trim()) {
      setMsg('Введите название позиции')
      return
    }

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category.trim() || 'Menu',
      description: productForm.description.trim(),
      price: Number(productForm.price || 0),
      image_url: productForm.image_url.trim(),
      is_active: productForm.is_active,
      is_available: productForm.is_available,
      is_stop: productForm.is_stop
    }

    const { error } = await supabase.from('rms_menu_products').insert(payload)
    if (error) setMsg(error.message)
    else {
      setProductForm(defaultProduct)
      await loadProducts()
      setMsg('Позиция добавлена в QR Menu / RMS Menu')
    }
  }

  async function updateProduct(id, patch) {
    const { error } = await supabase.from('rms_menu_products').update(patch).eq('id', id)
    if (error) {
      setMsg(error.message)
      return
    }
    setProducts(prev => prev.map(p => p.id === String(id) ? { ...p, ...patch } : p))
    setMsg('Позиция сохранена')
  }

  async function saveInfo() {
    const { error } = await supabase.from('rms_qr_info').upsert(info, { onConflict: 'branch_id' })
    setMsg(error ? error.message : 'Информация QR Menu сохранена')
  }

  async function saveAd() {
    if (!adForm.title.trim()) {
      setMsg('Введите название рекламы')
      return
    }
    const { error } = await supabase.from('rms_qr_ads').insert(adForm)
    if (error) {
      setMsg(error.message)
      return
    }
    setAdForm({ title: '', text: '', image_url: '', is_active: true })
    await loadAds()
    setMsg('Реклама добавлена')
  }

  async function toggleAd(row) {
    const { error } = await supabase.from('rms_qr_ads').update({ is_active: !row.is_active }).eq('id', row.id)
    if (error) setMsg(error.message)
    else {
      await loadAds()
      setMsg('Статус рекламы обновлён')
    }
  }

  async function saveRecommendation() {
    if (!recForm.product_id || !recForm.recommended_product_name) {
      setMsg('Выберите блюдо и рекомендацию')
      return
    }
    const source = products.find(p => p.id === recForm.product_id)
    const payload = {
      ...recForm,
      product_name: recForm.product_name || source?.name || '',
      is_active: true
    }
    const { error } = await supabase.from('rms_qr_recommendations').insert(payload)
    if (error) setMsg(error.message)
    else {
      setRecForm({ product_id: '', product_name: '', recommended_product_id: '', recommended_product_name: '' })
      await loadRecommendations()
      setMsg('Рекомендация добавлена')
    }
  }

  async function deleteRecommendation(id) {
    const { error } = await supabase.from('rms_qr_recommendations').delete().eq('id', id)
    if (error) setMsg(error.message)
    else {
      await loadRecommendations()
      setMsg('Рекомендация удалена')
    }
  }

  const ratingSummary = useMemo(() => {
    const grouped = {}
    ratings.forEach(r => {
      const key = String(r.product_id)
      if (!grouped[key]) grouped[key] = { product_name: r.product_name, sum: 0, count: 0 }
      grouped[key].sum += Number(r.rating || 0)
      grouped[key].count += 1
    })
    return Object.entries(grouped).map(([product_id, v]) => ({
      product_id,
      product_name: v.product_name,
      avg: v.sum / v.count,
      count: v.count
    }))
  }, [ratings])

  return (
    <section>
      <section className="topbar">
        <div>
          <h2>QR Menu</h2>
          <p>Генерация QR по столам, меню, фото, рейтинги, реклама, рекомендации, счёт и информация для гостей.</p>
        </div>
        <button className="small primary" onClick={loadAll}>{loading ? 'Загрузка...' : 'Обновить'}</button>
      </section>

      <div className="settings-tabs">
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>QR столы</button>
        <button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>Позиции меню</button>
        <button className={tab === 'recommendations' ? 'active' : ''} onClick={() => setTab('recommendations')}>Рекомендации</button>
        <button className={tab === 'ratings' ? 'active' : ''} onClick={() => setTab('ratings')}>Рейтинги</button>
        <button className={tab === 'bills' ? 'active' : ''} onClick={() => setTab('bills')}>Счета / оплаты</button>
        <button className={tab === 'ads' ? 'active' : ''} onClick={() => setTab('ads')}>Реклама</button>
        <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>Инфо</button>
      </div>

      {msg ? <p className="hint good">{msg}</p> : null}

      <section className="grid">
        {tab === 'tables' && (
          <>
            <div className="card span-2">
              <h3>Генерация QR для филиала</h3>
              <p className="hint">Создаёт QR-ссылку для каждого стола выбранного филиала. QR ведёт на гостевое меню конкретного стола.</p>
              <div className="form-grid compact">
                <label><span>Филиал</span><input value={tableForm.branch_id} onChange={e => setTableForm({...tableForm, branch_id: e.target.value})} placeholder="BC1" /></label>
                <label><span>С</span><input type="number" value={tableForm.from} onChange={e => setTableForm({...tableForm, from: e.target.value})} /></label>
                <label><span>По</span><input type="number" value={tableForm.to} onChange={e => setTableForm({...tableForm, to: e.target.value})} /></label>
                <label><span>Префикс</span><input value={tableForm.prefix} onChange={e => setTableForm({...tableForm, prefix: e.target.value})} placeholder="VIP-" /></label>
              </div>
              <button className="small primary" onClick={generateTables}>Сгенерировать QR-столы</button>
            </div>

            <div className="card span-2">
              <h3>QR по столам</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>QR</th><th>Филиал</th><th>Стол</th><th>Ссылка</th><th>Активен</th></tr></thead>
                  <tbody>
                    {tables.map(row => (
                      <tr key={row.id}>
                        <td><img src={qrImageUrl(row.branch_id, row.table_number)} alt="QR" style={{ width: 86, height: 86, borderRadius: 8, background: '#fff' }} /></td>
                        <td><input defaultValue={row.branch_id} onBlur={e => updateTable(row, { branch_id: e.target.value.trim() })} /></td>
                        <td><input defaultValue={row.table_number} onBlur={e => updateTable(row, { table_number: e.target.value.trim() })} /></td>
                        <td><a href={qrUrl(row.branch_id, row.table_number)} target="_blank" rel="noreferrer">Открыть</a></td>
                        <td><select defaultValue={String(row.is_active !== false)} onChange={e => updateTable(row, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td>
                      </tr>
                    ))}
                    {!tables.length && <tr><td colSpan="5" className="hint">QR-столы пока не созданы.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'menu' && (
          <>
            <div className="card span-2">
              <h3>Добавить позицию меню</h3>
              <div className="form-grid compact">
                <label><span>Название</span><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} /></label>
                <label><span>Категория</span><input value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} /></label>
                <label><span>Цена</span><input value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} /></label>
                <label><span>Фото URL</span><input value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} /></label>
                <label className="span-2"><span>Описание</span><input value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} /></label>
              </div>
              <button className="small primary" onClick={addProduct}>+ Добавить позицию</button>
            </div>

            <div className="card span-2">
              <h3>Позиции QR Menu</h3>
              <p className="hint">Фото, цена и видимость подтягиваются из RMS-меню. Здесь можно быстро добавить URL фото и скорректировать цену.</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Фото</th><th>Позиция</th><th>Категория</th><th>Описание</th><th>Цена</th><th>Image URL</th><th>Активна</th><th>Stop</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>{p.image_url ? <img src={p.image_url} alt="" style={{width:64,height:48,objectFit:'cover',borderRadius:10}} /> : '—'}</td>
                        <td><input defaultValue={p.name} onBlur={e => updateProduct(p.id, { name: e.target.value.trim() })} /></td>
                        <td><input defaultValue={p.category} onBlur={e => updateProduct(p.id, { category: e.target.value.trim() })} /></td>
                        <td><input defaultValue={p.description || ''} onBlur={e => updateProduct(p.id, { description: e.target.value.trim() })} /></td>
                        <td><input defaultValue={p.price} onBlur={e => updateProduct(p.id, { price: Number(e.target.value || 0) })} /></td>
                        <td><input defaultValue={p.image_url || ''} onBlur={e => updateProduct(p.id, { image_url: e.target.value.trim() })} placeholder="https://..." /></td>
                        <td><select defaultValue={String(p.is_active !== false)} onChange={e => updateProduct(p.id, { is_active: e.target.value === 'true' })}><option value="true">Да</option><option value="false">Нет</option></select></td>
                        <td><select defaultValue={String(p.is_stop === true)} onChange={e => updateProduct(p.id, { is_stop: e.target.value === 'true' })}><option value="false">Нет</option><option value="true">Да</option></select></td>
                      </tr>
                    ))}
                    {!products.length && <tr><td colSpan="8" className="hint">Позиции не найдены.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'recommendations' && (
          <>
            <div className="card span-2">
              <h3>Добавить рекомендацию</h3>
              <p className="hint">Например: к Cappuccino рекомендовать Basque Cheesecake или Croissant.</p>
              <div className="form-grid compact">
                <label><span>Основная позиция</span><select value={recForm.product_id} onChange={e => {
                  const p = products.find(x => x.id === e.target.value)
                  setRecForm(s => ({...s, product_id: e.target.value, product_name: p?.name || ''}))
                }}><option value="">Выбрать</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <label><span>Рекомендуемая позиция</span><select value={recForm.recommended_product_id} onChange={e => {
                  const p = products.find(x => x.id === e.target.value)
                  setRecForm(s => ({...s, recommended_product_id: e.target.value, recommended_product_name: p?.name || ''}))
                }}><option value="">Выбрать</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              </div>
              <button className="small primary" onClick={saveRecommendation}>+ Добавить рекомендацию</button>
            </div>

            <div className="card span-2">
              <h3>Список рекомендаций</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>К позиции</th><th>Рекомендуем</th><th>Статус</th><th></th></tr></thead>
                  <tbody>
                    {recommendations.map(r => <tr key={r.id}><td>{r.product_name || r.product_id}</td><td><b>{r.recommended_product_name || r.recommended_product_id}</b></td><td>{r.is_active ? 'Активна' : 'Откл.'}</td><td><button className="small danger" onClick={() => deleteRecommendation(r.id)}>Удалить</button></td></tr>)}
                    {!recommendations.length && <tr><td colSpan="4" className="hint">Рекомендаций пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'ratings' && (
          <div className="card span-2">
            <h3>Рейтинги блюд</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Блюдо</th><th>Средний рейтинг</th><th>Голосов</th></tr></thead>
                <tbody>
                  {ratingSummary.map(r => <tr key={r.product_id}><td>{r.product_name}</td><td><b>★ {fmt(r.avg)}</b></td><td>{r.count}</td></tr>)}
                  {!ratingSummary.length && <tr><td colSpan="3" className="hint">Оценок пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'bills' && (
          <div className="card span-2">
            <h3>Счета / оплаты QR Menu</h3>
            <p className="hint">Здесь отображаются live-счета, которые гость видит по QR. Полная интеграция с POS будет следующим этапом.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Филиал</th><th>Стол</th><th>Статус</th><th>Оплата</th><th>Итого</th><th>Создан</th></tr></thead>
                <tbody>
                  {bills.map(b => <tr key={b.id}><td>{b.branch_id}</td><td>{b.table_number}</td><td>{b.status}</td><td>{b.payment_status}</td><td><b>{fmt(b.total)} AZN</b></td><td>{new Date(b.created_at).toLocaleString()}</td></tr>)}
                  {!bills.length && <tr><td colSpan="6" className="hint">Счетов пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'ads' && (
          <>
            <div className="card span-2">
              <h3>Добавить рекламу / popup</h3>
              <div className="form-grid compact">
                <label><span>Заголовок</span><input value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} /></label>
                <label><span>Текст</span><input value={adForm.text} onChange={e => setAdForm({...adForm, text: e.target.value})} /></label>
                <label><span>Image URL</span><input value={adForm.image_url} onChange={e => setAdForm({...adForm, image_url: e.target.value})} /></label>
                <label><span>Активна</span><select value={String(adForm.is_active)} onChange={e => setAdForm({...adForm, is_active: e.target.value === 'true'})}><option value="true">Да</option><option value="false">Нет</option></select></label>
              </div>
              <button className="small primary" onClick={saveAd}>+ Добавить рекламу</button>
            </div>
            <div className="card span-2">
              <h3>Активные рекламы</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Фото</th><th>Заголовок</th><th>Текст</th><th>Активна</th><th></th></tr></thead>
                  <tbody>
                    {ads.map(a => <tr key={a.id}><td>{a.image_url ? <img src={a.image_url} alt="" style={{width:64,height:48,objectFit:'cover',borderRadius:10}} /> : '—'}</td><td><b>{a.title}</b></td><td>{a.text}</td><td>{a.is_active ? 'Да' : 'Нет'}</td><td><button className="small" onClick={() => toggleAd(a)}>{a.is_active ? 'Отключить' : 'Включить'}</button></td></tr>)}
                    {!ads.length && <tr><td colSpan="5" className="hint">Рекламы пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'info' && (
          <div className="card span-2">
            <h3>Информация для гостей</h3>
            <div className="form-grid compact">
              <label><span>Филиал</span><input value={info.branch_id} onChange={e => setInfo({...info, branch_id: e.target.value})} /></label>
              <label><span>Wi‑Fi</span><input value={info.wifi_name || ''} onChange={e => setInfo({...info, wifi_name: e.target.value})} /></label>
              <label><span>Пароль Wi‑Fi</span><input value={info.wifi_password || ''} onChange={e => setInfo({...info, wifi_password: e.target.value})} /></label>
              <label><span>Рабочие часы</span><input value={info.working_hours || ''} onChange={e => setInfo({...info, working_hours: e.target.value})} /></label>
              <label><span>Телефон</span><input value={info.phone || ''} onChange={e => setInfo({...info, phone: e.target.value})} /></label>
              <label><span>Instagram</span><input value={info.instagram || ''} onChange={e => setInfo({...info, instagram: e.target.value})} /></label>
              <label><span>Facebook</span><input value={info.facebook || ''} onChange={e => setInfo({...info, facebook: e.target.value})} /></label>
              <label><span>TikTok</span><input value={info.tiktok || ''} onChange={e => setInfo({...info, tiktok: e.target.value})} /></label>
              <label><span>Website</span><input value={info.website || ''} onChange={e => setInfo({...info, website: e.target.value})} /></label>
              <label><span>Адрес</span><input value={info.address || ''} onChange={e => setInfo({...info, address: e.target.value})} /></label>
            </div>
            <button className="small primary" onClick={saveInfo}>Сохранить информацию</button>
          </div>
        )}
      </section>
    </section>
  )
}
