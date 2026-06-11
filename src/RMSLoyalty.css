import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './RMSLoyalty.css'

const parseNum = (v) => Number(String(v ?? '0').replace(',', '.')) || 0
const fmt = (n) => `${Number(n || 0).toFixed(2)} AZN`
const intFmt = (n) => `${Number(n || 0).toFixed(0)} ед.`

const STAMPS_FOR_FREE_DRINK = 10
const DEFAULT_BRAND = 'BARISTA&CHEF'
const DEFAULT_SUBTITLE = 'COFFEE HOUSE'

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function stableHash(value) {
  const input = String(value || '')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function buildCardNumber(client) {
  if (!client) return '940 000 000 0'
  const saved = client.card_number || client.loyalty_card_no || client.card_no
  if (saved) return String(saved)
  const digits = normalizeDigits(client.phone)
  if (digits.length >= 9) return digits.slice(-10).replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, '$1 $2 $3 $4')
  const seed = String(stableHash(client.id || client.phone || client.name) % 10000000000).padStart(10, '0')
  return seed.replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, '$1 $2 $3 $4')
}

function rawCardNumber(client) {
  return buildCardNumber(client).replace(/\s+/g, '')
}

function createWalletToken(client) {
  const base = `${client?.id || ''}-${client?.phone || ''}-${client?.created_at || ''}-${Date.now()}`
  return `bcw_${stableHash(base)}_${Math.random().toString(36).slice(2, 10)}`
}

function getWalletToken(client) {
  return client?.wallet_token || client?.qr_token || client?.pass_token || ''
}

function getPublicOrigin() {
  if (typeof window === 'undefined') return 'https://app.rms.rest'
  return window.location.origin || 'https://app.rms.rest'
}

function buildWalletLandingUrl(client) {
  const token = getWalletToken(client)
  const base = getPublicOrigin()
  return token ? `${base}/?loyalty_wallet=${encodeURIComponent(token)}` : ''
}

function buildAppleWalletUrl(client) {
  const token = getWalletToken(client)
  return token ? `${getPublicOrigin()}/api/loyalty/apple-wallet?token=${encodeURIComponent(token)}` : ''
}

function buildGoogleWalletUrl(client) {
  const token = getWalletToken(client)
  return token ? `${getPublicOrigin()}/api/loyalty/google-wallet?token=${encodeURIComponent(token)}` : ''
}

function qrImageUrl(value, size = 260) {
  return value ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}` : ''
}

function barcodeBars(value) {
  const clean = String(value || '9400000000').replace(/[^A-Za-z0-9]/g, '')
  const source = `${clean}${stableHash(clean)}`.padEnd(44, '314159265358979323846')
  return source.split('').slice(0, 48).map((char, idx) => {
    const code = char.charCodeAt(0) + idx
    return { width: (code % 4) + 2, gap: (code % 3) + 1, tall: code % 5 !== 0 }
  })
}

function getStampCount(client) {
  return Number(client?.stamp_count ?? client?.drink_stamps ?? client?.visits_count ?? 0) || 0
}

function getFreeDrinkBalance(client) {
  return Number(client?.free_drink_balance ?? client?.drink_balance ?? 0) || 0
}

function CoffeeIcon({ filled }) {
  return (
    <span className={`stamp-cup ${filled ? 'filled' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path d="M12 12h21l-3 27H15L12 12Z" />
        <path d="M15 39h15" />
        <path d="M16 17h13" />
        <path className="bean" d="M25.5 21c4 3.5 3.3 9.2-.7 11.8-3.9-3.4-3.3-9.1.7-11.8Z" />
      </svg>
    </span>
  )
}

function DrinkStampCard({ client }) {
  const cardNumber = buildCardNumber(client)
  const appleUrl = buildAppleWalletUrl(client)
  const googleUrl = buildGoogleWalletUrl(client)
  const bars = barcodeBars(cardNumber)
  const stampCount = getStampCount(client)
  const filled = stampCount % STAMPS_FOR_FREE_DRINK
  const freeBalance = getFreeDrinkBalance(client)

  return (
    <div className="drink-card-wallet-wrap">
      <div className="ios-wallet-topbar">
        <span>Отменить</span>
        <b>Карта лояльности</b>
        <span>Добавить</span>
      </div>

      <div className="drink-wallet-card">
        <div className="drink-wallet-head">
          <div className="bc-lockup">
            <div className="bc-emblem"><span /></div>
            <div><b>{DEFAULT_BRAND}</b><small>{DEFAULT_SUBTITLE}</small></div>
          </div>
          <div className="guest-card-label">КАРТА<br />ГОСТЯ</div>
        </div>

        <div className="stamp-grid">
          {Array.from({ length: STAMPS_FOR_FREE_DRINK }).map((_, idx) => <CoffeeIcon key={idx} filled={idx < filled} />)}
        </div>

        <div className="drink-card-client-row">
          <div><small>ИМЯ</small><strong>{client?.name || 'Гость'}</strong></div>
          <div><small>БАЛАНС</small><strong>{intFmt(freeBalance)}</strong></div>
        </div>

        <div className="drink-card-progress">
          <span>{filled}/{STAMPS_FOR_FREE_DRINK} отметок</span>
          <i><em style={{ width: `${(filled / STAMPS_FOR_FREE_DRINK) * 100}%` }} /></i>
        </div>

        <div className="drink-barcode-box">
          <div className="drink-bars">
            {bars.map((bar, idx) => <i key={idx} style={{ width: `${bar.width}px`, marginRight: `${bar.gap}px`, height: bar.tall ? '64px' : '48px' }} />)}
          </div>
          <b>{cardNumber}</b>
        </div>
      </div>

      <div className="wallet-actions">
        <button type="button" onClick={() => appleUrl && window.open(appleUrl, '_blank')}>Добавить в Apple Wallet</button>
        <button type="button" onClick={() => googleUrl && window.open(googleUrl, '_blank')}>Добавить в Google Wallet</button>
      </div>
      <p>QR и ссылки подготовлены. Реальные Apple/Google pass-файлы подключаются через backend-pass endpoints.</p>
    </div>
  )
}


function WalletQrPanel({ client, onEnsure, onCopy, busy }) {
  const landingUrl = buildWalletLandingUrl(client)
  const appleUrl = buildAppleWalletUrl(client)
  const googleUrl = buildGoogleWalletUrl(client)
  const hasToken = Boolean(getWalletToken(client))

  return (
    <div className="wallet-qr-panel">
      <div className="wallet-qr-header">
        <div>
          <h3>QR для подключения Wallet</h3>
          <p>Гость сканирует QR, открывает страницу карты и нажимает Apple Wallet / Google Wallet.</p>
        </div>
        <button type="button" onClick={onEnsure} disabled={busy}>{hasToken ? 'Обновить данные QR' : 'Создать QR'}</button>
      </div>

      {hasToken ? (
        <div className="wallet-qr-body">
          <div className="wallet-qr-code"><img src={qrImageUrl(landingUrl)} alt="Loyalty wallet QR" /></div>
          <div className="wallet-qr-links">
            <label>Landing link<input value={landingUrl} readOnly /></label>
            <label>Apple endpoint<input value={appleUrl} readOnly /></label>
            <label>Google endpoint<input value={googleUrl} readOnly /></label>
            <button type="button" onClick={() => onCopy(landingUrl)}>Скопировать ссылку</button>
          </div>
        </div>
      ) : (
        <div className="loyalty-empty">Для этой карты ещё нет wallet_token. Нажмите “Создать QR”.</div>
      )}
    </div>
  )
}

export default function RMSLoyalty() {
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrBusy, setQrBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [clientForm, setClientForm] = useState({ name: '', phone: '', birthday: '', notes: '' })
  const [stampForm, setStampForm] = useState({ drinks: '1', comment: '' })
  const [redeemForm, setRedeemForm] = useState({ count: '1', comment: '' })

  useEffect(() => { loadLoyalty() }, [])

  async function loadLoyalty() {
    setLoading(true)
    setMessage('')
    const [clientsRes, txRes] = await Promise.all([
      supabase.from('rms_loyalty_clients').select('*').order('created_at', { ascending: false }),
      supabase.from('rms_loyalty_transactions').select('*').order('created_at', { ascending: false }).limit(300),
    ])
    if (clientsRes.error) setMessage(clientsRes.error.message)
    if (txRes.error) setMessage(txRes.error.message)
    setClients(clientsRes.data || [])
    setTransactions(txRes.data || [])
    setLoading(false)
  }

  async function ensureWalletIdentity(clientArg = selectedClient) {
    const client = clientArg || clients.find((item) => item.id === selectedClientId)
    if (!client) return setMessage('Выберите клиента.')
    setQrBusy(true)
    setMessage('')

    const nextCardNumber = client.card_number || rawCardNumber(client)
    const nextToken = getWalletToken(client) || createWalletToken(client)
    const { error } = await supabase.from('rms_loyalty_clients').update({
      card_number: nextCardNumber,
      wallet_token: nextToken,
      wallet_enabled: true,
      updated_at: new Date().toISOString(),
    }).eq('id', client.id)

    setQrBusy(false)
    if (error) return setMessage(error.message)
    await loadLoyalty()
    setSelectedClientId(client.id)
    setMessage('Wallet QR создан. Гость может сканировать код и открыть карту на телефоне.')
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage('Ссылка скопирована.')
    } catch (error) {
      setMessage('Не удалось скопировать ссылку. Скопируйте вручную из поля.')
    }
  }

  async function createClient(e) {
    e.preventDefault()
    setMessage('')
    const phone = clientForm.phone.trim()
    if (!phone) return setMessage('Укажите номер телефона клиента.')

    const tempClient = { phone, name: clientForm.name.trim() || 'Гость', created_at: new Date().toISOString() }
    const { error } = await supabase.from('rms_loyalty_clients').insert({
      name: clientForm.name.trim() || 'Гость',
      phone,
      birthday: clientForm.birthday || null,
      notes: clientForm.notes.trim() || null,
      level: 'drink_card',
      bonus_balance: 0,
      total_spent: 0,
      visits_count: 0,
      stamp_count: 0,
      free_drink_balance: 0,
      card_number: rawCardNumber(tempClient),
      wallet_token: createWalletToken(tempClient),
      wallet_enabled: true,
      is_active: true,
    })

    if (error) return setMessage(error.message)
    setClientForm({ name: '', phone: '', birthday: '', notes: '' })
    await loadLoyalty()
    setMessage('Клиент добавлен. Карта напитков создана.')
  }

  async function addDrinkStamps(e) {
    e.preventDefault()
    setMessage('')
    const client = clients.find((item) => item.id === selectedClientId)
    if (!client) return setMessage('Выберите клиента.')

    const drinks = Math.max(1, Math.floor(parseNum(stampForm.drinks)))
    const currentStamps = getStampCount(client)
    const currentFree = getFreeDrinkBalance(client)
    const totalStamps = currentStamps + drinks
    const newFree = Math.floor(totalStamps / STAMPS_FOR_FREE_DRINK)
    const nextStamps = totalStamps % STAMPS_FOR_FREE_DRINK
    const nextFreeBalance = currentFree + newFree

    const { error: txError } = await supabase.from('rms_loyalty_transactions').insert({
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      type: 'drink_stamp_earn',
      amount: drinks,
      order_total: null,
      comment: stampForm.comment.trim() || `Начислено отметок за напитки: ${drinks}`,
    })
    if (txError) return setMessage(txError.message)

    const { error: clientError } = await supabase.from('rms_loyalty_clients').update({
      stamp_count: nextStamps,
      free_drink_balance: nextFreeBalance,
      visits_count: Number(client.visits_count || 0) + drinks,
      updated_at: new Date().toISOString(),
    }).eq('id', client.id)
    if (clientError) return setMessage(clientError.message)

    setStampForm({ drinks: '1', comment: '' })
    await loadLoyalty()
    setMessage(newFree > 0 ? `Начислено. Клиент получил бесплатных напитков: ${newFree}.` : 'Отметки начислены.')
  }

  async function redeemFreeDrink(e) {
    e.preventDefault()
    setMessage('')
    const client = clients.find((item) => item.id === selectedClientId)
    if (!client) return setMessage('Выберите клиента.')
    const count = Math.max(1, Math.floor(parseNum(redeemForm.count)))
    const currentFree = getFreeDrinkBalance(client)
    if (count > currentFree) return setMessage(`Недостаточно бесплатных напитков. Доступно: ${intFmt(currentFree)}.`)

    const { error: txError } = await supabase.from('rms_loyalty_transactions').insert({
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      type: 'free_drink_redeem',
      amount: -count,
      order_total: null,
      comment: redeemForm.comment.trim() || `Списан бесплатный напиток: ${count}`,
    })
    if (txError) return setMessage(txError.message)

    const { error: clientError } = await supabase.from('rms_loyalty_clients').update({
      free_drink_balance: currentFree - count,
      updated_at: new Date().toISOString(),
    }).eq('id', client.id)
    if (clientError) return setMessage(clientError.message)

    setRedeemForm({ count: '1', comment: '' })
    await loadLoyalty()
    setMessage('Бесплатный напиток списан.')
  }

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => [client.name, client.phone, client.notes, buildCardNumber(client)]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  }, [clients, query])

  const selectedClient = clients.find((item) => item.id === selectedClientId) || null

  const selectedTransactions = useMemo(() => {
    if (!selectedClientId) return transactions.slice(0, 12)
    return transactions.filter((item) => item.client_id === selectedClientId).slice(0, 20)
  }, [transactions, selectedClientId])

  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter((item) => item.is_active !== false).length
    const totalStamps = clients.reduce((sum, item) => sum + getStampCount(item), 0)
    const freeDrinks = clients.reduce((sum, item) => sum + getFreeDrinkBalance(item), 0)
    const totalVisits = clients.reduce((sum, item) => sum + Number(item.visits_count || 0), 0)
    const earnedStamps = transactions.filter((item) => item.type === 'drink_stamp_earn').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const redeemedDrinks = Math.abs(transactions.filter((item) => item.type === 'free_drink_redeem').reduce((sum, item) => sum + Number(item.amount || 0), 0))
    return { totalClients, activeClients, totalStamps, freeDrinks, totalVisits, earnedStamps, redeemedDrinks }
  }, [clients, transactions])

  const topClients = useMemo(() => [...clients].sort((a, b) => (getFreeDrinkBalance(b) + Number(b.visits_count || 0)) - (getFreeDrinkBalance(a) + Number(a.visits_count || 0))).slice(0, 8), [clients])

  return (
    <div className="loyalty-page drink-mode">
      <section className="loyalty-hero drink-hero">
        <div>
          <span className="loyalty-eyebrow">RMS Pro Loyalty · Drink Card</span>
          <h1>Карта напитков</h1>
          <p>Простая схема для старта: клиент покупает напитки, получает отметки, после 10 отметок получает 1 напиток в подарок.</p>
        </div>
        <div className="loyalty-hero-card">
          <span>Правило</span>
          <b>10 = 1</b>
          <small>1 напиток = 1 отметка · 10 отметок = 1 подарок</small>
        </div>
      </section>

      {message && <div className="loyalty-message">{message}</div>}

      <section className="loyalty-kpis drink-kpis">
        <div className="loyalty-kpi"><span>Клиенты</span><b>{stats.totalClients}</b><small>в базе карт</small></div>
        <div className="loyalty-kpi"><span>Активные</span><b>{stats.activeClients}</b><small>можно начислять</small></div>
        <div className="loyalty-kpi"><span>Текущие отметки</span><b>{stats.totalStamps}</b><small>до следующих подарков</small></div>
        <div className="loyalty-kpi"><span>Баланс подарков</span><b>{stats.freeDrinks}</b><small>напитков к выдаче</small></div>
        <div className="loyalty-kpi"><span>Начислено отметок</span><b>{stats.earnedStamps}</b><small>по операциям</small></div>
        <div className="loyalty-kpi"><span>Списано подарков</span><b>{stats.redeemedDrinks}</b><small>выдано клиентам</small></div>
      </section>

      <section className="loyalty-grid drink-grid-main">
        <div className="loyalty-card loyalty-client-card">
          <div className="loyalty-card-head">
            <div><h2>Клиенты</h2><p>Выберите клиента для начисления отметок или показа карты.</p></div>
            <button onClick={loadLoyalty} disabled={loading}>{loading ? 'Загрузка…' : 'Обновить'}</button>
          </div>
          <input className="loyalty-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, телефону или номеру карты..." />
          <div className="loyalty-client-list">
            {filteredClients.map((client) => (
              <button key={client.id} className={`loyalty-client-row ${selectedClientId === client.id ? 'active' : ''}`} onClick={() => setSelectedClientId(client.id)}>
                <div><b>{client.name || 'Гость'}</b><span>{client.phone}</span></div>
                <div><em>{getStampCount(client)}/{STAMPS_FOR_FREE_DRINK}</em><strong>{intFmt(getFreeDrinkBalance(client))}</strong></div>
              </button>
            ))}
            {!filteredClients.length && <div className="loyalty-empty">Клиенты не найдены.</div>}
          </div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Новый клиент</h2><p>Минимальная регистрация по телефону.</p></div></div>
          <form className="loyalty-form" onSubmit={createClient}>
            <label>Имя<input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Например: Ruslan" /></label>
            <label>Телефон<input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="+994..." /></label>
            <label>День рождения<input type="date" value={clientForm.birthday} onChange={(e) => setClientForm({ ...clientForm, birthday: e.target.value })} /></label>
            <label>Заметка<textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} placeholder="Предпочтения, любимый филиал, комментарий..." /></label>
            <button className="loyalty-primary">Добавить клиента</button>
          </form>
        </div>

        <div className="loyalty-card wallet-preview-card">
          <div className="loyalty-card-head"><div><h2>Wallet preview</h2><p>Вид карты на телефоне клиента.</p></div></div>
          {selectedClient ? <DrinkStampCard client={selectedClient} /> : <div className="loyalty-empty">Выберите клиента из списка.</div>}
        </div>
      </section>

      {selectedClient && (
        <section className="loyalty-grid bottom drink-actions-grid">
          <div className="loyalty-card">
            <div className="loyalty-card-head"><div><h2>Начислить отметки</h2><p>1 напиток = 1 отметка. После 10 отметок автоматически добавляется подарок.</p></div></div>
            <form className="loyalty-form" onSubmit={addDrinkStamps}>
              <label>Количество напитков<input value={stampForm.drinks} onChange={(e) => setStampForm({ ...stampForm, drinks: e.target.value })} placeholder="1" /></label>
              <div className="loyalty-rule-preview"><b>Текущий прогресс</b><span>{getStampCount(selectedClient)}/{STAMPS_FOR_FREE_DRINK} отметок · баланс подарков: {intFmt(getFreeDrinkBalance(selectedClient))}</span></div>
              <label>Комментарий<textarea value={stampForm.comment} onChange={(e) => setStampForm({ ...stampForm, comment: e.target.value })} placeholder="Например: чек POS #1258" /></label>
              <button className="loyalty-primary">Начислить</button>
            </form>
          </div>

          <div className="loyalty-card">
            <div className="loyalty-card-head"><div><h2>Списать подарок</h2><p>Используется, когда клиент получает бесплатный напиток.</p></div></div>
            <form className="loyalty-form" onSubmit={redeemFreeDrink}>
              <label>Количество подарков<input value={redeemForm.count} onChange={(e) => setRedeemForm({ ...redeemForm, count: e.target.value })} placeholder="1" /></label>
              <div className="loyalty-rule-preview"><b>Доступно к списанию</b><span>{intFmt(getFreeDrinkBalance(selectedClient))}</span></div>
              <label>Комментарий<textarea value={redeemForm.comment} onChange={(e) => setRedeemForm({ ...redeemForm, comment: e.target.value })} placeholder="Например: free drink redeemed" /></label>
              <button className="loyalty-primary">Списать подарок</button>
            </form>
          </div>

          <div className="loyalty-card how-card">
            <div className="loyalty-card-head"><div><h2>Как работает</h2><p>Правила для персонала.</p></div></div>
            <div className="how-list">
              <div><CoffeeIcon filled /><b>1 напиток = 1 отметка</b></div>
              <div><span className="mini-beans">••••••••••</span><b>10 отметок = 1 подарок</b></div>
              <div><span className="gift-icon">□</span><b>Подарок списывается на кассе</b></div>
            </div>
          </div>

          <div className="loyalty-card wallet-qr-card">
            <WalletQrPanel client={selectedClient} onEnsure={() => ensureWalletIdentity(selectedClient)} onCopy={copyText} busy={qrBusy} />
          </div>
        </section>
      )}

      <section className="loyalty-grid bottom">
        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Топ клиентов</h2><p>По визитам и балансу подарков.</p></div></div>
          <div className="loyalty-table">
            <div className="loyalty-table-head"><span>Клиент</span><span>Карта</span><span>Отметки</span><span>Баланс</span></div>
            {topClients.map((client) => <div className="loyalty-table-row" key={client.id}><span>{client.name}<small>{client.phone}</small></span><span>{buildCardNumber(client)}</span><span>{getStampCount(client)}/{STAMPS_FOR_FREE_DRINK}</span><span>{intFmt(getFreeDrinkBalance(client))}</span></div>)}
          </div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Операции</h2><p>{selectedClient ? 'По выбранному клиенту' : 'Последние операции'}</p></div></div>
          <div className="loyalty-ops">
            {selectedTransactions.map((tx) => <div className="loyalty-op" key={tx.id}><div><b>{tx.client_name || 'Клиент'}</b><span>{tx.comment || tx.client_phone || 'Операция Loyalty'}</span></div><strong className={Number(tx.amount || 0) >= 0 ? 'plus' : 'minus'}>{Number(tx.amount || 0) >= 0 ? '+' : ''}{Number(tx.amount || 0).toFixed(0)}</strong></div>)}
            {!selectedTransactions.length && <div className="loyalty-empty">Операций пока нет.</div>}
          </div>
        </div>
      </section>
    </div>
  )
}
