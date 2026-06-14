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
  return token ? `${base}/loyalty/card/${encodeURIComponent(token)}` : ''
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


function getStampProgress(client) {
  const raw = getStampCount(client)
  const filled = raw % STAMPS_FOR_FREE_DRINK
  const percent = Math.round((filled / STAMPS_FOR_FREE_DRINK) * 100)
  const remaining = filled === 0 ? STAMPS_FOR_FREE_DRINK : STAMPS_FOR_FREE_DRINK - filled
  const freeBalance = getFreeDrinkBalance(client)
  const giftAvailable = freeBalance > 0
  return { raw, filled, percent, remaining, freeBalance, giftAvailable }
}

function progressPhrase(client) {
  const progress = getStampProgress(client)
  if (progress.giftAvailable) return `Подарок доступен · баланс: ${intFmt(progress.freeBalance)}`
  if (progress.filled === 0) return `Осталось ${STAMPS_FOR_FREE_DRINK} напитков до подарка`
  return `Осталось ${progress.remaining} напитков до подарка`
}

function DrinkProgressRing({ client, compact = false }) {
  const progress = getStampProgress(client)
  const rotation = Math.round((progress.percent / 100) * 360)
  return (
    <div className={`drink-progress-ring ${compact ? 'compact' : ''}`} style={{ '--drink-progress': `${rotation}deg` }}>
      <div className="drink-progress-ring-inner">
        <strong>{progress.percent}%</strong>
        {!compact && <span>{progress.filled}/{STAMPS_FOR_FREE_DRINK}</span>}
      </div>
    </div>
  )
}

function DrinkProgressSummary({ client }) {
  const progress = getStampProgress(client)
  return (
    <div className={`drink-progress-summary ${progress.giftAvailable ? 'gift' : ''}`}>
      <b>{progress.giftAvailable ? 'Подарок доступен' : `${progress.filled} из ${STAMPS_FOR_FREE_DRINK} напитков`}</b>
      <span>{progressPhrase(client)}</span>
    </div>
  )
}

function formatLoyaltyDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatLoyaltyTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function txOperationMeta(tx = {}) {
  const type = String(tx.type || '')
  const amount = Number(tx.amount || 0)
  if (type === 'drink_stamp' || type === 'pos_drink_stamp') {
    return { label: `+${Math.abs(amount).toFixed(0)} напиток`, kind: 'plus', icon: '☕' }
  }
  if (type === 'drink_redeem' || type === 'pos_drink_redeem') {
    return { label: `-${Math.abs(amount).toFixed(0)} подарок`, kind: 'minus', icon: '🎁' }
  }
  if (amount > 0) return { label: `+${amount.toFixed(0)}`, kind: 'plus', icon: '＋' }
  if (amount < 0) return { label: `${amount.toFixed(0)}`, kind: 'minus', icon: '−' }
  return { label: 'Операция', kind: 'neutral', icon: '•' }
}

function CoffeeStampRow({ client, size = 'default' }) {
  const progress = getStampProgress(client)
  return (
    <div className={`coffee-stamp-row ${size}`} aria-label={`${progress.filled} из ${STAMPS_FOR_FREE_DRINK} напитков`}>
      {Array.from({ length: STAMPS_FOR_FREE_DRINK }).map((_, idx) => (
        <span key={idx} className={idx < progress.filled ? 'filled' : ''}>{idx < progress.filled ? '☕' : '○'}</span>
      ))}
    </div>
  )
}

function ClientOperationsHistory({ transactions = [] }) {
  const rows = transactions.slice(0, 8)
  return (
    <div className="client-history-list">
      {rows.map((tx) => {
        const meta = txOperationMeta(tx)
        return (
          <div className={`client-history-row ${meta.kind}`} key={tx.id || `${tx.created_at}-${tx.comment}`}> 
            <div className="client-history-icon">{meta.icon}</div>
            <div className="client-history-main">
              <b>{meta.label}</b>
              <span>{tx.comment || 'Операция по карте напитков'}</span>
            </div>
            <div className="client-history-date">
              <strong>{formatLoyaltyDate(tx.created_at)}</strong>
              <small>{formatLoyaltyTime(tx.created_at)}</small>
            </div>
          </div>
        )
      })}
      {!rows.length && <div className="loyalty-empty">Истории операций пока нет.</div>}
    </div>
  )
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
  const progress = getStampProgress(client)
  const freeBalance = progress.freeBalance

  return (
    <div className="drink-card-wallet-wrap">
      <div className="ios-wallet-topbar">
        <span>Отменить</span>
        <b>Карта лояльности</b>
        <span>Добавить</span>
      </div>

      <div className="drink-wallet-card progress-card">
        <div className="drink-wallet-head">
          <div className="bc-lockup">
            <div className="bc-emblem"><span /></div>
            <div><b>{DEFAULT_BRAND}</b><small>{DEFAULT_SUBTITLE}</small></div>
          </div>
          <div className="guest-card-label">КАРТА<br />ГОСТЯ</div>
        </div>

        <div className="drink-progress-hero">
          <DrinkProgressRing client={client} />
          <DrinkProgressSummary client={client} />
        </div>

        <div className="stamp-grid progress-stamps">
          {Array.from({ length: STAMPS_FOR_FREE_DRINK }).map((_, idx) => <CoffeeIcon key={idx} filled={idx < progress.filled} />)}
        </div>

        <CoffeeStampRow client={client} />

        <div className="drink-card-client-row">
          <div><small>ИМЯ</small><strong>{client?.name || 'Гость'}</strong></div>
          <div><small>БАЛАНС</small><strong>{intFmt(freeBalance)}</strong></div>
        </div>

        <div className="drink-card-progress enhanced">
          <span>{progress.percent}% · {progress.filled}/{STAMPS_FOR_FREE_DRINK} отметок</span>
          <i><em style={{ width: `${progress.percent}%` }} /></i>
          <small>{progressPhrase(client)}</small>
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


function extractLoyaltyToken(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const fromPath = url.pathname.match(/\/loyalty\/card\/([^/?#]+)/)?.[1]
    if (fromPath) return decodeURIComponent(fromPath)
    return url.searchParams.get('loyalty_wallet') || url.searchParams.get('token') || raw
  } catch (_error) {
    const fromPath = raw.match(/\/loyalty\/card\/([^/?#]+)/)?.[1]
    if (fromPath) return decodeURIComponent(fromPath)
    return raw
  }
}

async function findLoyaltyClientByTokenOrCode(value) {
  const token = extractLoyaltyToken(value)
  if (!token) return { client: null, error: 'Введите token, ссылку карты, номер карты или телефон.' }

  const selectFields = 'id,name,phone,card_number,wallet_token,wallet_enabled,stamp_count,free_drink_balance,visits_count,created_at,updated_at,is_active'

  const checks = [
    { field: 'wallet_token', value: token },
    { field: 'card_number', value: token },
  ]

  const digits = normalizeDigits(token)
  if (digits) {
    checks.push({ field: 'phone', value: token })
    checks.push({ field: 'phone', value: `+${digits}` })
    checks.push({ field: 'card_number', value: digits })
  }

  for (const check of checks) {
    const { data, error } = await supabase
      .from('rms_loyalty_clients')
      .select(selectFields)
      .eq(check.field, check.value)
      .maybeSingle()
    if (error) return { client: null, error: error.message }
    if (data) return { client: data, error: '' }
  }

  return { client: null, error: 'Клиент не найден. Проверьте QR, номер карты или телефон.' }
}


async function rmsLoyaltyApplyDrinkStampRpc({ clientId, drinks, receiptNumber, branchId, staffName, comment }) {
  const { data, error } = await supabase.rpc('rms_loyalty_apply_drink_stamp_secure', {
    p_client_id: clientId,
    p_drinks: drinks,
    p_receipt_number: receiptNumber || null,
    p_branch_id: branchId || null,
    p_staff_name: staffName || null,
    p_comment: comment || null,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

function LoyaltyPOSDrinkScan({ onDone }) {
  const [scanValue, setScanValue] = useState('')
  const [client, setClient] = useState(null)
  const [drinks, setDrinks] = useState('1')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [branchId, setBranchId] = useState('BC1')
  const [staffName, setStaffName] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('loyalty_scan_token') || params.get('loyalty_wallet') || params.get('token') || ''
    if (token) {
      setScanValue(token)
      findClient(token)
    }
  }, [])

  async function findClient(value = scanValue) {
    setBusy(true)
    setMessage('')
    const result = await findLoyaltyClientByTokenOrCode(value)
    setBusy(false)
    if (result.error) {
      setClient(null)
      setMessage(result.error)
      return
    }
    setClient(result.client)
    setMessage('Клиент найден. Можно начислить отметки за напитки.')
  }

  async function applyPosStamps(e) {
    e.preventDefault()
    setMessage('')
    let currentClient = client
    if (!currentClient) {
      const result = await findLoyaltyClientByTokenOrCode(scanValue)
      if (result.error) return setMessage(result.error)
      currentClient = result.client
      setClient(result.client)
    }

    const count = Math.max(1, Math.floor(parseNum(drinks)))
    const receipt = receiptNumber.trim()
    const cleanStaff = staffName.trim()
    const cleanComment = comment.trim() || (receipt ? `POS чек ${receipt}: напитков ${count}` : `POS Scan: напитков ${count}`)

    setBusy(true)
    try {
      const result = await rmsLoyaltyApplyDrinkStampRpc({
        clientId: currentClient.id,
        drinks: count,
        receiptNumber: receipt,
        branchId,
        staffName: cleanStaff,
        comment: cleanComment,
      })

      const updatedClient = {
        ...currentClient,
        stamp_count: Number(result?.stamp_count ?? 0),
        free_drink_balance: Number(result?.free_drink_balance ?? 0),
        visits_count: Number(result?.visits_count ?? currentClient.visits_count ?? 0),
        updated_at: result?.updated_at || new Date().toISOString(),
      }

      setClient(updatedClient)
      setDrinks('1')
      setReceiptNumber('')
      setComment('')
      if (typeof onDone === 'function') await onDone()

      const giftCount = Number(result?.gift_added || 0)
      setMessage(giftCount > 0 ? `Начислено ${count}. Подарок доступен: +${giftCount} напиток.` : `Начислено отметок: ${count}.`)
    } catch (err) {
      const text = String(err?.message || err || '')
      if (text.includes('already_used')) return setMessage('Этот POS чек уже использован для начисления Loyalty.')
      if (text.includes('client_not_found')) return setMessage('Клиент не найден или карта отключена.')
      if (text.includes('invalid_drinks')) return setMessage('Количество напитков должно быть больше 0.')
      return setMessage(text || 'Не удалось начислить отметки.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="loyalty-pos-lite">
      <div className="loyalty-card pos-lite-card">
        <div className="loyalty-card-head">
          <div>
            <h2>POS Scan</h2>
            <p>Сканируйте QR карты гостя или вставьте ссылку / token вручную.</p>
          </div>
        </div>

        {message && <div className="pos-lite-message">{message}</div>}

        <div className="pos-lite-grid">
          <div className="pos-lite-block">
            <label>QR / token / номер карты / телефон
              <textarea value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Вставьте ссылку из QR или wallet_token" />
            </label>
            <button type="button" className="loyalty-primary" onClick={() => findClient()} disabled={busy}>{busy ? 'Поиск…' : 'Найти клиента'}</button>
          </div>

          <div className="pos-lite-client">
            {client ? (
              <>
                <div className="pos-lite-client-head">
                  <div><span>Клиент</span><b>{client.name || 'Гость'}</b><small>{client.phone || buildCardNumber(client)}</small></div>
                  <strong>{getStampCount(client)}/{STAMPS_FOR_FREE_DRINK}</strong>
                  <DrinkProgressRing client={client} compact />
                </div>
                <div className="pos-lite-progress-note">{progressPhrase(client)}</div>
                <CoffeeStampRow client={client} size="compact" />
                <DrinkStampCard client={client} />
              </>
            ) : (
              <div className="loyalty-empty">Клиент пока не выбран.</div>
            )}
          </div>
        </div>
      </div>

      <div className="loyalty-card pos-lite-card">
        <div className="loyalty-card-head"><div><h2>Начисление с POS</h2><p>Для текущего этапа начисляем отметки за напитки.</p></div></div>
        <form className="loyalty-form pos-lite-form" onSubmit={applyPosStamps}>
          <div className="pos-lite-form-grid">
            <label>Филиал
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="BC1">BC1</option>
                <option value="BC2">BC2</option>
                <option value="BC3">BC3</option>
                <option value="BC4">BC4</option>
                <option value="BC5">BC5</option>
                <option value="Bistro">Bistro</option>
              </select>
            </label>
            <label>POS чек
              <input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Например: POS-1258" />
            </label>
            <label>Количество напитков
              <input value={drinks} onChange={(e) => setDrinks(e.target.value)} placeholder="1" />
            </label>
            <label>Сотрудник
              <input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Имя кассира / официанта" />
            </label>
          </div>
          <label>Комментарий
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" />
          </label>
          <button className="loyalty-primary" disabled={!client}>Начислить отметки</button>
        </form>
      </div>
    </section>
  )
}

function WalletQrPanel({ client, onEnsure, onCopy, busy }) {
  const landingUrl = buildWalletLandingUrl(client)
  const hasToken = Boolean(getWalletToken(client))

  return (
    <div className="wallet-qr-panel compact-wallet-qr">
      <div className="wallet-qr-header">
        <div>
          <h3>QR карта клиента</h3>
          <p>Гость сканирует QR и открывает карту лояльности на телефоне.</p>
        </div>
        <button type="button" onClick={onEnsure} disabled={busy}>{hasToken ? 'Обновить QR' : 'Создать QR'}</button>
      </div>

      {hasToken ? (
        <div className="wallet-qr-body compact">
          <div className="wallet-qr-code"><img src={qrImageUrl(landingUrl)} alt="QR карты лояльности" /></div>
          <div className="wallet-qr-links compact">
            <button type="button" onClick={() => onCopy(landingUrl)}>Скопировать ссылку</button>
          </div>
        </div>
      ) : (
        <div className="loyalty-empty">Для этой карты ещё нет QR. Нажмите “Создать QR”.</div>
      )}
    </div>
  )
}


function LoyaltyWalletLanding({ token }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function loadPublicCard() {
      setLoading(true)
      setError('')
      const { data, error: rpcError } = await supabase.rpc('rms_loyalty_wallet_card_by_token', { p_wallet_token: token })
      if (!alive) return
      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (!row) setError('Карта не найдена или отключена.')
      setClient(row || null)
      setLoading(false)
    }
    loadPublicCard()
    return () => { alive = false }
  }, [token])

  const appleUrl = client ? buildAppleWalletUrl(client) : ''
  const googleUrl = client ? buildGoogleWalletUrl(client) : ''

  return (
    <div className="wallet-public-page">
      <div className="wallet-public-shell">
        <div className="wallet-public-top">
          <b>Barista&Chef</b>
          <span>Drink Loyalty Card</span>
        </div>

        {loading && <div className="wallet-public-state">Загрузка карты…</div>}
        {!loading && error && <div className="wallet-public-state error">{error}</div>}

        {!loading && client && (
          <>
            <DrinkStampCard client={client} />
            <div className="wallet-public-addbox">
              <h1>Добавьте карту в Wallet</h1>
              <p>После добавления карта будет открываться на телефоне как обычная wallet-карта. На кассе достаточно показать barcode.</p>
              <button type="button" className="wallet-apple-btn" onClick={() => window.location.href = appleUrl}>Добавить в Apple Wallet</button>
              <button type="button" className="wallet-google-btn" onClick={() => window.location.href = googleUrl}>Добавить в Google Wallet</button>
              <small>Если кнопка пока открывает служебную страницу — значит backend-pass ещё не подключён.</small>
            </div>
            <div className="wallet-public-how">
              <div><b>1 напиток</b><span>= 1 отметка</span></div>
              <div><b>10 отметок</b><span>= 1 напиток в подарок</span></div>
              <div><b>Покажите карту</b><span>на кассе перед оплатой</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function readWalletTokenFromLocation() {
  if (typeof window === 'undefined') return ''
  const paramsToken = new URLSearchParams(window.location.search).get('loyalty_wallet') || ''
  if (paramsToken) return paramsToken

  const match = window.location.pathname.match(/\/loyalty\/card\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export default function RMSLoyalty() {
  const walletTokenFromUrl = readWalletTokenFromLocation()

  if (walletTokenFromUrl) {
    return <LoyaltyWalletLanding token={walletTokenFromUrl} />
  }

  return <RMSLoyaltyAdmin />
}

function RMSLoyaltyAdmin() {
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
  const [activeTab, setActiveTab] = useState('cards')

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

    let savedRow = null
    let saveError = null

    const rpcRes = await supabase.rpc('rms_loyalty_wallet_enable_secure', {
      p_client_id: client.id,
      p_card_number: nextCardNumber,
      p_wallet_token: nextToken,
    })

    if (rpcRes.error) {
      const directRes = await supabase
        .from('rms_loyalty_clients')
        .update({
          card_number: nextCardNumber,
          wallet_token: nextToken,
          wallet_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id)
        .select('id,name,phone,card_number,wallet_token,wallet_enabled,stamp_count,free_drink_balance,visits_count,created_at,updated_at')
        .maybeSingle()

      saveError = directRes.error
      savedRow = directRes.data
    } else {
      savedRow = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    }

    setQrBusy(false)
    if (saveError) return setMessage(saveError.message)
    if (!savedRow?.wallet_token || savedRow.wallet_enabled !== true) {
      return setMessage('QR не сохранён в базе. Запустите SQL v7 и повторите “Обновить данные QR”.')
    }

    await loadLoyalty()
    setSelectedClientId(client.id)
    setMessage(`Wallet QR сохранён в базе. Token: ${savedRow.wallet_token}`)
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
      type: 'drink_stamp',
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
      type: 'drink_redeem',
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
    if (!selectedClientId) return []
    return transactions.filter((item) => item.client_id === selectedClientId).slice(0, 12)
  }, [transactions, selectedClientId])


  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter((item) => item.is_active !== false).length
    const totalStamps = clients.reduce((sum, item) => sum + getStampCount(item), 0)
    const freeDrinks = clients.reduce((sum, item) => sum + getFreeDrinkBalance(item), 0)
    const totalVisits = clients.reduce((sum, item) => sum + Number(item.visits_count || 0), 0)
    const earnedStamps = transactions
      .filter((item) => ['drink_stamp', 'pos_drink_stamp'].includes(String(item.type || '')))
      .reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0)
    const redeemedGifts = Math.abs(transactions
      .filter((item) => ['drink_redeem', 'pos_drink_redeem'].includes(String(item.type || '')))
      .reduce((sum, item) => sum + Math.min(0, Number(item.amount || 0)), 0))
    return { totalClients, activeClients, totalStamps, freeDrinks, totalVisits, earnedStamps, redeemedGifts }
  }, [clients, transactions])


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

      <div className="loyalty-tabs">
        <button type="button" className={activeTab === 'cards' ? 'active' : ''} onClick={() => setActiveTab('cards')}>Клиенты и карты</button>
        <button type="button" className={activeTab === 'pos' ? 'active' : ''} onClick={() => setActiveTab('pos')}>POS Scan</button>
      </div>

      {activeTab === 'pos' ? (
        <section className="loyalty-pos-tab">
          <LoyaltyPOSDrinkScan onDone={loadLoyalty} />
        </section>
      ) : (
        <div className="loyalty-cards-tab">

      <section className="loyalty-kpis drink-kpis">
        <div className="loyalty-kpi"><span>Клиенты</span><b>{stats.totalClients}</b><small>в базе карт</small></div>
        <div className="loyalty-kpi"><span>Активные</span><b>{stats.activeClients}</b><small>можно начислять</small></div>
        <div className="loyalty-kpi"><span>Начислено</span><b>{stats.earnedStamps}</b><small>напитков по операциям</small></div>
        <div className="loyalty-kpi"><span>Подарки</span><b>{stats.freeDrinks}</b><small>баланс к выдаче</small></div>
        <div className="loyalty-kpi"><span>Выдано</span><b>{stats.redeemedGifts}</b><small>подарков списано</small></div>
        <div className="loyalty-kpi"><span>Текущие отметки</span><b>{stats.totalStamps}</b><small>до следующих подарков</small></div>
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
                <div><b>{client.name || 'Гость'}</b><span>{client.phone}</span><CoffeeStampRow client={client} size="mini" /></div>
                <div><em>{getStampProgress(client).percent}%</em><strong>{intFmt(getFreeDrinkBalance(client))}</strong></div>
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
          <div className="loyalty-card-head"><div><h2>Карта клиента</h2><p>Вид карты на телефоне клиента.</p></div></div>
          {selectedClient ? <DrinkStampCard client={selectedClient} /> : <div className="loyalty-empty">Выберите клиента из списка.</div>}
        </div>
      </section>

      {selectedClient && (
        <section className="loyalty-grid bottom drink-actions-grid">
          <div className="loyalty-card">
            <div className="loyalty-card-head"><div><h2>Начислить отметки</h2><p>1 напиток = 1 отметка. После 10 отметок автоматически добавляется подарок.</p></div></div>
            <form className="loyalty-form" onSubmit={addDrinkStamps}>
              <label>Количество напитков<input value={stampForm.drinks} onChange={(e) => setStampForm({ ...stampForm, drinks: e.target.value })} placeholder="1" /></label>
              <div className="loyalty-rule-preview progress-preview"><DrinkProgressRing client={selectedClient} compact /><div><b>Текущий прогресс</b><span>{getStampProgress(selectedClient).percent}% · {getStampCount(selectedClient)}/{STAMPS_FOR_FREE_DRINK} отметок · {progressPhrase(selectedClient)}</span></div></div>
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

          <div className="loyalty-card wallet-qr-card">
            <WalletQrPanel client={selectedClient} onEnsure={() => ensureWalletIdentity(selectedClient)} onCopy={copyText} busy={qrBusy} />
          </div>

          <div className="loyalty-card client-history-card">
            <div className="loyalty-card-head"><div><h2>История клиента</h2><p>Последние начисления и списания по выбранной карте.</p></div></div>
            <ClientOperationsHistory transactions={selectedTransactions} />
          </div>
        </section>
      )}
        </div>
      )}
    </div>
  )
}
