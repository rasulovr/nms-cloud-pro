// RMS Loyalty v24 — cleanup of obsolete manual Wallet/stamp/redeem UI
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import './RMSLoyalty.css'

const parseNum = (v) => Number(String(v ?? '0').replace(',', '.')) || 0
const fmt = (n) => `${Number(n || 0).toFixed(2)} AZN`
const intFmt = (n) => `${Number(n || 0).toFixed(0)} ед.`

const VIP_DEFAULT_THRESHOLD = 10
const DEFAULT_BRAND = 'BARISTA&CHEF'
const DEFAULT_SUBTITLE = 'COFFEE HOUSE'

const VIP_LEVELS = [
  { key: 'classic', title: 'Classic', min: 0, short: 'CL', threshold: 10, benefit: '10 → 1' },
  { key: 'silver', title: 'Silver', min: 50, short: 'SV', threshold: 9, benefit: '9 → 1' },
  { key: 'gold', title: 'Gold', min: 150, short: 'GD', threshold: 8, benefit: '8 → 1' },
  { key: 'black', title: 'Black', min: 300, short: 'BK', threshold: 6, benefit: '6 → 1' },
]

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

function formatPhoneDisplay(phone) {
  const raw = String(phone || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('994') && digits.length >= 12) {
    return `+994 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }
  return raw
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

function safeJsonParse(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback } catch (_e) { return fallback }
}

function normalizeScannerLogin(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/@(rms|nms)\.local\.az$/i, '')
    .replace(/@rms\.internal$/i, '')
}

function getCurrentRmsInternalScannerProfile() {
  if (typeof window === 'undefined') return null
  const session = safeJsonParse(window.localStorage.getItem('rms_internal_session_v2'), null)
    || safeJsonParse(window.localStorage.getItem('rms_internal_session_v1'), null)
  if (!session?.rms_internal) return null
  const login = normalizeScannerLogin(session?.user?.login_name || session?.user?.email || '')
  const users = safeJsonParse(window.localStorage.getItem('rms_internal_users_v2'), {}) || {}
  const user = users[login] || Object.values(users).find((item) => item?.id === session?.user?.id) || {}
  const isScanner = Boolean(
    user.loyalty_scanner_only ||
    user.role === 'loyalty_scanner' ||
    user.access_profile === 'loyalty_scanner' ||
    login.includes('scanner') ||
    login.includes('scan')
  )
  if (!isScanner) return null
  return {
    id: user.id || session?.user?.id || login,
    login,
    full_name: user.full_name || session?.user?.full_name || login || 'Loyalty Scanner',
    branch_id: user.branch_id || user.branch || 'BC1',
    scanner: true,
  }
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

function getLifetimeDrinkCount(client) {
  return Number(client?.lifetime_drinks ?? client?.total_drinks ?? client?.visits_count ?? 0) || 0
}

function getVipLevelInfo(client) {
  const drinks = getLifetimeDrinkCount(client)
  let current = VIP_LEVELS[0]
  for (const level of VIP_LEVELS) {
    if (drinks >= level.min) current = level
  }
  const currentIndex = VIP_LEVELS.findIndex((level) => level.key === current.key)
  const next = VIP_LEVELS[currentIndex + 1] || null
  const previousMin = current.min
  const nextMin = next?.min || current.min
  const span = Math.max(1, nextMin - previousMin)
  const progressToNext = next ? Math.min(100, Math.max(0, Math.round(((drinks - previousMin) / span) * 100))) : 100
  const remaining = next ? Math.max(0, next.min - drinks) : 0
  return {
    ...current,
    threshold: Number(current.threshold || VIP_DEFAULT_THRESHOLD),
    drinks,
    next,
    nextTitle: next?.title || '',
    remaining,
    progressToNext,
    isMax: !next,
  }
}

function getRewardThreshold(client) {
  const explicit = Number(client?.reward_threshold || 0)
  if (explicit > 0) return explicit
  return Number(getVipLevelInfo(client).threshold || VIP_DEFAULT_THRESHOLD)
}

function getVipBenefitText(client) {
  const vip = getVipLevelInfo(client)
  return vip.benefit || `${getRewardThreshold(client)} → 1`
}

function getStampProgress(client) {
  const raw = getStampCount(client)
  const threshold = getRewardThreshold(client)
  const filled = raw % threshold
  const percent = Math.round((filled / threshold) * 100)
  const remaining = filled === 0 ? threshold : threshold - filled
  const freeBalance = getFreeDrinkBalance(client)
  const giftAvailable = freeBalance > 0
  return { raw, filled, percent, remaining, freeBalance, giftAvailable, threshold }
}

function progressPhrase(client) {
  const progress = getStampProgress(client)
  if (progress.giftAvailable) return `Подарок доступен · баланс: ${intFmt(progress.freeBalance)}`
  if (progress.filled === 0) return `Осталось ${progress.threshold} напитков до подарка`
  return `Осталось ${progress.remaining} напитков до подарка`
}

function DrinkProgressRing({ client, compact = false }) {
  const progress = getStampProgress(client)
  const rotation = Math.round((progress.percent / 100) * 360)
  return (
    <div className={`drink-progress-ring ${compact ? 'compact' : ''}`} style={{ '--drink-progress': `${rotation}deg` }}>
      <div className="drink-progress-ring-inner">
        <strong>{progress.percent}%</strong>
        {!compact && <span>{progress.filled}/{progress.threshold}</span>}
      </div>
    </div>
  )
}

function DrinkProgressSummary({ client }) {
  const progress = getStampProgress(client)
  return (
    <div className={`drink-progress-summary ${progress.giftAvailable ? 'gift' : ''}`}>
      <b>{progress.giftAvailable ? 'Подарок доступен' : `${progress.filled} из ${progress.threshold} напитков`}</b>
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
    <div className={`coffee-stamp-row ${size}`} aria-label={`${progress.filled} из ${progress.threshold} напитков`}>
      {Array.from({ length: progress.threshold }).map((_, idx) => (
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
  const landingUrl = buildWalletLandingUrl(client)
  const copyCardLink = async () => {
    if (!landingUrl) return
    try { await navigator.clipboard.writeText(landingUrl) } catch (_e) {}
  }
  const progress = getStampProgress(client)
  const freeBalance = progress.freeBalance
  const vip = getVipLevelInfo(client)
  const nextLevelText = vip.isMax ? 'Максимальный уровень' : `До ${vip.nextTitle}: ${vip.remaining} напитков`
  const nextLevelPct = vip.isMax ? '100%' : `${vip.progressToNext}%`

  return (
    <div className="drink-card-wallet-wrap">
      <div className="drink-wallet-card progress-card bc-premium-card-v212">
        <div className="bc-premium-logo-row">
          <div className="bc-round-logo" aria-label="Barista&Chef">
            <span className="bc-script-logo">Barista<span>&amp;</span>Chef</span>
            <small>COFFEE &amp; KITCHEN</small>
          </div>
        </div>

        <div className="bc-card-owner">
          <strong>{client?.name || 'Гость'}</strong>
        </div>

        <div className={`vip-level-card vip-${vip.key} bc-vip-summary`}>
          <div>
            <span>Level</span>
            <b>{vip.title}</b>
            <small>{vip.benefit || `${vip.threshold} → 1`}</small>
          </div>
          <div>
            <span>ВСЕГО</span>
            <b>{vip.drinks}</b>
            <small>напитков</small>
          </div>
        </div>

        <div className="bc-reward-panel">
          <div className="bc-panel-title">Прогресс до подарка</div>
          <div className="stamp-grid progress-stamps bc-cups-row" style={{ '--stamp-columns': progress.threshold }}>
            {Array.from({ length: progress.threshold }).map((_, idx) => <CoffeeIcon key={idx} filled={idx < progress.filled} />)}
          </div>

          <div className="bc-main-count">
            <strong>{progress.filled}</strong>
            <span>из {progress.threshold}</span>
            <small>напитков</small>
          </div>

        </div>

        <div className="bc-next-level-strip">
          <span>{nextLevelText}</span>
        </div>

        <div className="drink-qr-box bc-premium-qr">
          {landingUrl ? (
            <img src={qrImageUrl(landingUrl, 220)} alt="QR карты клиента" />
          ) : (
            <div className="drink-qr-placeholder">QR</div>
          )}
          <b>{cardNumber}</b>
          <small>Покажите QR-код для начисления напитка</small>
        </div>

        <div className={`bc-card-footer-note ${freeBalance > 0 ? 'ready' : ''}`}>
          {freeBalance > 0 ? `🎁 Доступно подарков: ${intFmt(freeBalance)}` : '🎁 Подарок доступен после достижения цели'}
        </div>
      </div>

      <div className="wallet-actions qr-only-actions">
        <button type="button" onClick={() => landingUrl && window.open(landingUrl, '_blank')}>Открыть карту</button>
        <button type="button" onClick={copyCardLink}>Скопировать ссылку</button>
      </div>
      <p>QR-карта для гостя. Сотрудник сканирует QR для начисления напитков или выдачи подарка.</p>
    </div>
  )
}


function extractLoyaltyToken(value) {
  const rawInput = String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()

  if (!rawInput) return ''

  // QR scanners on iOS/Safari can return a full URL, a URL with spaces/newlines,
  // plain wallet_token, card number, or phone. Normalize all common QR payloads here.
  const compact = rawInput.replace(/\s+/g, '')

  const decodeSafe = (input) => {
    try { return decodeURIComponent(input || '') } catch (_error) { return input || '' }
  }

  const cleanToken = (input) => decodeSafe(String(input || '')
    .replace(/^loyalty:/i, '')
    .replace(/^token:/i, '')
    .replace(/^wallet:/i, '')
    .replace(/^card:/i, '')
    .trim()
    .replace(/[?&#].*$/, ''))

  const parseFromText = (input) => {
    const text = String(input || '')
    const pathMatch = text.match(/(?:https?:\/\/[^\s/]+)?\/loyalty\/card\/([^\s/?#]+)/i)
    if (pathMatch?.[1]) return cleanToken(pathMatch[1])

    const queryMatch = text.match(/[?&](?:loyalty_wallet|wallet_token|token)=([^&#\s]+)/i)
    if (queryMatch?.[1]) return cleanToken(queryMatch[1])

    return cleanToken(text)
  }

  try {
    const url = new URL(compact)
    const fromPath = url.pathname.match(/\/loyalty\/card\/([^/?#]+)/i)?.[1]
    if (fromPath) return cleanToken(fromPath)

    const fromQuery =
      url.searchParams.get('loyalty_wallet') ||
      url.searchParams.get('wallet_token') ||
      url.searchParams.get('token')

    if (fromQuery) return cleanToken(fromQuery)
  } catch (_error) {
    // Not a valid URL. Continue with text parsing.
  }

  return parseFromText(compact) || parseFromText(rawInput)
}

async function findLoyaltyClientByTokenOrCode(value) {
  const token = extractLoyaltyToken(value)
  if (!token) return { client: null, error: 'Введите token, ссылку карты, номер карты или телефон.' }

  const selectFields = 'id,name,phone,card_number,wallet_token,wallet_enabled,stamp_count,free_drink_balance,visits_count,lifetime_drinks,total_drinks,vip_level,reward_threshold,created_at,updated_at,is_active'

  // First try the public wallet RPC. It is SECURITY DEFINER and is the same source
  // used by the public card page, so QR scanning works even when direct table RLS
  // blocks/filters the anon client on mobile scanner sessions.
  const looksLikeWalletToken = /^[a-z0-9]{24,128}$/i.test(token) && !String(token).startsWith('BC-')
  if (looksLikeWalletToken) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('rms_loyalty_wallet_card_by_token', { p_wallet_token: token })
    if (rpcError) return { client: null, error: rpcError.message }
    const rpcClient = Array.isArray(rpcData) ? rpcData[0] : rpcData
    if (rpcClient?.id) {
      return {
        client: {
          id: rpcClient.id,
          name: rpcClient.name,
          phone: rpcClient.phone,
          card_number: rpcClient.card_number,
          wallet_token: rpcClient.wallet_token || token,
          wallet_enabled: true,
          stamp_count: Number(rpcClient.stamp_count || 0),
          free_drink_balance: Number(rpcClient.free_drink_balance || 0),
          visits_count: Number(rpcClient.visits_count || 0),
          lifetime_drinks: Number(rpcClient.lifetime_drinks ?? rpcClient.total_drinks ?? rpcClient.visits_count ?? 0),
          total_drinks: Number(rpcClient.total_drinks ?? rpcClient.lifetime_drinks ?? rpcClient.visits_count ?? 0),
          vip_level: rpcClient.vip_level || getVipLevelInfo({ lifetime_drinks: Number(rpcClient.lifetime_drinks ?? rpcClient.total_drinks ?? rpcClient.visits_count ?? 0) }).key,
          reward_threshold: Number(rpcClient.reward_threshold || getRewardThreshold({ lifetime_drinks: Number(rpcClient.lifetime_drinks ?? rpcClient.total_drinks ?? rpcClient.visits_count ?? 0) })),
          created_at: rpcClient.created_at || null,
          updated_at: rpcClient.updated_at || null,
          is_active: rpcClient.is_active !== false,
        },
        error: '',
      }
    }
  }

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


async function rmsLoyaltyApplyDrinkStampRpc({ clientId, drinks, branchId, staffName, comment }) {
  const { data, error } = await supabase.rpc('rms_loyalty_apply_drink_stamp_secure', {
    p_client_id: clientId,
    p_drinks: drinks,
    p_receipt_number: null,
    p_branch_id: branchId || null,
    p_staff_name: staffName || null,
    p_comment: comment || null,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}


async function rmsLoyaltyRedeemFreeDrinkRpc({ clientId, branchId, staffName, comment }) {
  const { data, error } = await supabase.rpc('rms_loyalty_redeem_free_drink_secure', {
    p_client_id: clientId,
    p_branch_id: branchId || null,
    p_staff_name: staffName || null,
    p_comment: comment || null,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

function LoyaltyPOSDrinkScan({ onDone, scannerProfile = null, scannerOnly = false }) {
  const [scanValue, setScanValue] = useState('')
  const [client, setClient] = useState(null)
  const [drinks, setDrinks] = useState('1')
  const [branchId, setBranchId] = useState(scannerProfile?.branch_id || 'BC1')
  const [staffName, setStaffName] = useState(scannerProfile?.full_name || '')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [fraudRows, setFraudRows] = useState([])
  const [todayRows, setTodayRows] = useState([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStatus, setCameraStatus] = useState('')
  const [successFlash, setSuccessFlash] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanLoopRef = useRef(null)
  const scanActiveRef = useRef(false)
  const zxingControlsRef = useRef(null)
  const successTimerRef = useRef(null)
  const autoApplyLockRef = useRef(false)
  const autoRestartCameraRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('loyalty_scan_token') || params.get('loyalty_wallet') || params.get('token') || ''
    if (token) {
      setScanValue(token)
      findClient(token)
    }
    loadFraudRows()
    loadTodayRows()
    return () => {
      stopCameraScan()
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  function stopCameraScan() {
    scanActiveRef.current = false
    if (scanLoopRef.current) {
      try { cancelAnimationFrame(scanLoopRef.current) } catch (_e) {}
      scanLoopRef.current = null
    }
    if (zxingControlsRef.current) {
      try { zxingControlsRef.current.stop() } catch (_e) {}
      zxingControlsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop() } catch (_e) {}
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch (_e) {}
    }
    setCameraOpen(false)
    setCameraStatus('')
  }

  async function handleScannedQr(rawValue) {
    const value = String(rawValue || '').trim()
    const tokenValue = extractLoyaltyToken(value)
    if (!value || !scanActiveRef.current) return
    scanActiveRef.current = false
    setScanValue(tokenValue || value)
    setCameraStatus('QR найден. Ищу клиента…')
    stopCameraScan()
    await findClient(tokenValue || value, { autoApply: scannerOnly })
  }

  async function startNativeBarcodeScan() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    scanActiveRef.current = true
    setCameraStatus('Наведите камеру на QR клиента')

    const scanFrame = async () => {
      if (!scanActiveRef.current || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        const rawValue = codes?.[0]?.rawValue || ''
        if (rawValue) {
          await handleScannedQr(rawValue)
          return
        }
      } catch (_err) {
        // Keep scanning. Some frames may fail before the video is ready.
      }
      scanLoopRef.current = requestAnimationFrame(scanFrame)
    }

    scanLoopRef.current = requestAnimationFrame(scanFrame)
  }

  async function startZxingSafariScan() {
    setCameraStatus('Запуск камеры Safari…')
    const mod = await import('https://esm.sh/@zxing/browser@0.1.5')
    const BrowserQRCodeReader = mod.BrowserQRCodeReader
    if (!BrowserQRCodeReader || !videoRef.current) throw new Error('QR scanner module unavailable')

    const reader = new BrowserQRCodeReader()
    scanActiveRef.current = true
    setCameraStatus('Наведите камеру на QR клиента')

    let selectedDeviceId = undefined
    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const backCamera = devices.find((item) => /back|rear|environment|зад/i.test(item.label || ''))
      selectedDeviceId = (backCamera || devices[0])?.deviceId
    } catch (_err) {
      selectedDeviceId = undefined
    }

    const controls = await reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, async (result) => {
      const rawValue = result?.getText?.() || result?.text || ''
      if (rawValue && scanActiveRef.current) {
        await handleScannedQr(rawValue)
      }
    })
    zxingControlsRef.current = controls
  }

  async function startCameraScan() {
    setMessage('')
    if (typeof window === 'undefined') return
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMessage('Камера недоступна в этом браузере. Откройте RMS через Safari/Chrome по HTTPS и разрешите доступ к камере.')
      return
    }

    stopCameraScan()
    setCameraOpen(true)
    setCameraStatus('Запуск камеры…')

    try {
      if ('BarcodeDetector' in window) {
        await startNativeBarcodeScan()
      } else {
        await startZxingSafariScan()
      }
    } catch (err) {
      stopCameraScan()
      setMessage(err?.name === 'NotAllowedError'
        ? 'Доступ к камере запрещён. Разрешите камеру для app.rms.rest в настройках Safari.'
        : (err?.message || 'Не удалось открыть камеру. На iPhone используйте Safari по HTTPS и разрешите камеру для сайта.'))
    }
  }


  function playScanSuccessFeedback() {
    try {
      if (navigator?.vibrate) navigator.vibrate([45, 35, 45])
    } catch (_e) {}
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.07)
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => { try { ctx.close() } catch (_e) {} }, 280)
    } catch (_e) {}
  }

  function resetScannerForNextGuest(delayMs = 2600, restartCamera = false) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    autoRestartCameraRef.current = Boolean(restartCamera)
    successTimerRef.current = setTimeout(() => {
      setClient(null)
      setScanValue('')
      setComment('')
      setMessage('')
      setSuccessFlash(null)
      setCameraStatus('')
      autoApplyLockRef.current = false
      const shouldRestart = autoRestartCameraRef.current
      autoRestartCameraRef.current = false
      if (shouldRestart) {
        setTimeout(() => {
          try { startCameraScan() } catch (_e) {}
        }, 180)
      }
    }, delayMs)
  }

  async function loadFraudRows() {
    const { data, error } = await supabase
      .from('rms_loyalty_suspicious_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12)
    if (!error) setFraudRows(data || [])
  }


  async function loadTodayRows() {
    const branch = scannerProfile?.branch_id || branchId || null
    const staff = scannerProfile?.full_name || staffName || null

    const { data: rpcRows, error: rpcError } = await supabase.rpc('rms_loyalty_scan_log_today_secure', {
      p_branch_id: branch,
      p_staff_name: scannerOnly ? staff : null,
    })

    if (!rpcError && Array.isArray(rpcRows)) {
      setTodayRows(rpcRows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        client_name: row.client_name || 'Клиент',
        client_phone: row.client_phone || '',
        card_number: row.card_number || '',
        amount: String(row.operation_type || '').includes('redeem') ? -Math.abs(Number(row.drinks || row.stamps || 1)) : Number(row.drinks || row.stamps || 1),
        comment: row.operation_type || 'drink_stamp',
      })))
      return
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    let query = supabase
      .from('rms_loyalty_scan_log')
      .select('*')
      .gte('created_at', start.toISOString())
      .eq('operation_type', 'drink_stamp')
      .eq('cooldown_blocked', false)
      .order('created_at', { ascending: false })
      .limit(40)

    if (branch) query = query.eq('branch_id', branch)
    if (scannerOnly && staff) query = query.eq('staff_name', staff)

    const { data: scanLog, error: scanLogError } = await query

    if (!scanLogError && Array.isArray(scanLog)) {
      setTodayRows(scanLog.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        client_name: row.client_name || 'Клиент',
        client_phone: row.client_phone || '',
        card_number: row.card_number || '',
        amount: String(row.operation_type || '').includes('redeem') ? -Math.abs(Number(row.drinks || row.stamps || 1)) : Number(row.drinks || row.stamps || 1),
        comment: row.operation_type || 'drink_stamp',
      })))
      return
    }

    setTodayRows([])
  }

  async function findClient(value = scanValue, options = {}) {
    setBusy(true)
    setMessage('')
    const normalizedValue = extractLoyaltyToken(value) || value
    if (normalizedValue && normalizedValue !== scanValue) setScanValue(normalizedValue)
    const result = await findLoyaltyClientByTokenOrCode(normalizedValue)
    setBusy(false)
    if (result.error) {
      setClient(null)
      setMessage(result.error)
      return null
    }
    setClient(result.client)
    const freeBalance = getFreeDrinkBalance(result.client)
    if (freeBalance > 0) {
      autoApplyLockRef.current = false
      setMessage('🎁 У клиента есть бесплатный напиток. Начисление заблокировано — можно только выдать подарок.')
    } else if (options?.autoApply) {
      setMessage('Клиент найден. Начисляю +1…')
      if (!autoApplyLockRef.current) {
        autoApplyLockRef.current = true
        setTimeout(() => applyPosStamps(null, result.client), 120)
      }
    } else {
      setMessage('Клиент найден. Можно начислить +1.')
    }
    return result.client
  }

  async function applyPosStamps(e, forcedClient = null) {
    if (e?.preventDefault) e.preventDefault()
    setMessage('')
    let currentClient = forcedClient || client
    if (!currentClient) {
      const result = await findLoyaltyClientByTokenOrCode(scanValue)
      if (result.error) return setMessage(result.error)
      currentClient = result.client
      setClient(result.client)
    }

    if (getFreeDrinkBalance(currentClient) > 0) {
      autoApplyLockRef.current = false
      setMessage('🎁 У клиента есть бесплатный напиток. Сначала выдайте подарок.')
      return
    }

    const count = 1
    const cleanStaff = staffName.trim()
    const cleanComment = comment.trim() || 'POS Scan: +1 напиток'

    setBusy(true)
    try {
      const result = await rmsLoyaltyApplyDrinkStampRpc({
        clientId: currentClient.id,
        drinks: count,
        branchId: scannerProfile?.branch_id || branchId,
        staffName: scannerProfile?.full_name || cleanStaff,
        comment: cleanComment,
      })

      if (result?.status && result.status !== 'ok') {
        if (result.status === 'cooldown') {
          const mins = Math.max(1, Math.ceil(Number(result?.cooldown_seconds || 0) / 60))
          setMessage(`Повторное начисление для этого клиента доступно примерно через ${mins} мин.`)
        } else if (result.status === 'too_many_drinks') {
          setMessage('Слишком много напитков за одно сканирование. Максимум: 5.')
        } else {
          setMessage(result?.message || 'Начисление заблокировано.')
        }
        await loadFraudRows()
        await loadTodayRows()
        autoApplyLockRef.current = false
        setBusy(false)
        return
      }

      const beforeCount = getStampCount(currentClient)
      const updatedClient = {
        ...currentClient,
        stamp_count: Number(result?.stamp_count ?? 0),
        free_drink_balance: Number(result?.free_drink_balance ?? 0),
        visits_count: Number(result?.visits_count ?? currentClient.visits_count ?? 0),
        lifetime_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0),
        total_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0),
        vip_level: result?.vip_level || getVipLevelInfo({ lifetime_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0) }).key,
        reward_threshold: Number(result?.reward_threshold || getRewardThreshold(currentClient)),
        available_rewards: Number(result?.free_drink_balance ?? currentClient.free_drink_balance ?? 0),
        updated_at: result?.updated_at || new Date().toISOString(),
      }
      const afterCount = getStampCount(updatedClient)
      const giftCount = Number(result?.gift_added || 0)

      setClient(updatedClient)
      setDrinks('1')
      setComment('')
      setMessage('')
      setSuccessFlash({
        name: updatedClient.name || 'Гость',
        before: beforeCount,
        after: afterCount,
        giftCount,
        threshold: Number(result?.reward_threshold || getRewardThreshold(updatedClient)),
        vipLevel: getVipLevelInfo(updatedClient).title,
        freeBalance: Number(updatedClient.free_drink_balance || 0),
        client: updatedClient,
      })
      playScanSuccessFeedback()
      if (typeof onDone === 'function') await onDone()
      await loadFraudRows()
      await loadTodayRows()
      resetScannerForNextGuest(2700, scannerOnly)
    } catch (err) {
      const text = String(err?.message || err || '')
      if (text.includes('cooldown_active')) { autoApplyLockRef.current = false; return setMessage('Повторное начисление для этого клиента пока заблокировано. Интервал — 10 минут.') }
      if (text.includes('client_not_found')) { autoApplyLockRef.current = false; return setMessage('Клиент не найден или карта отключена.') }
      if (text.includes('invalid_drinks')) { autoApplyLockRef.current = false; return setMessage('Начисление доступно только по 1 напитку за одно сканирование.') }
      autoApplyLockRef.current = false
      return setMessage(text || 'Не удалось начислить отметки.')
    } finally {
      setBusy(false)
    }
  }


  async function redeemScannerGift(e, forcedClient = null) {
    if (e?.preventDefault) e.preventDefault()
    setMessage('')
    let currentClient = forcedClient || client
    if (!currentClient) {
      const result = await findLoyaltyClientByTokenOrCode(scanValue)
      if (result.error) return setMessage(result.error)
      currentClient = result.client
      setClient(result.client)
    }

    const beforeFree = getFreeDrinkBalance(currentClient)
    if (beforeFree <= 0) {
      return setMessage('У клиента нет доступного подарка.')
    }

    const cleanStaff = staffName.trim()
    const cleanComment = comment.trim() || 'Scanner: подарок выдан'

    setBusy(true)
    try {
      const result = await rmsLoyaltyRedeemFreeDrinkRpc({
        clientId: currentClient.id,
        branchId: scannerProfile?.branch_id || branchId,
        staffName: scannerProfile?.full_name || cleanStaff,
        comment: cleanComment,
      })

      if (result?.status && result.status !== 'ok') {
        setMessage(result?.message || 'Списание подарка заблокировано.')
        await loadFraudRows()
        await loadTodayRows()
        setBusy(false)
        return
      }

      const updatedClient = {
        ...currentClient,
        stamp_count: Number(result?.stamp_count ?? currentClient.stamp_count ?? 0),
        free_drink_balance: Number(result?.free_drink_balance ?? 0),
        visits_count: Number(result?.visits_count ?? currentClient.visits_count ?? 0),
        lifetime_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0),
        total_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0),
        vip_level: result?.vip_level || getVipLevelInfo({ lifetime_drinks: Number(result?.lifetime_drinks ?? currentClient.lifetime_drinks ?? result?.visits_count ?? currentClient.visits_count ?? 0) }).key,
        reward_threshold: Number(result?.reward_threshold || getRewardThreshold(currentClient)),
        available_rewards: Number(result?.free_drink_balance ?? currentClient.free_drink_balance ?? 0),
        updated_at: result?.updated_at || new Date().toISOString(),
      }
      const afterFree = getFreeDrinkBalance(updatedClient)

      setClient(updatedClient)
      setComment('')
      setMessage('')
      setSuccessFlash({
        name: updatedClient.name || 'Гость',
        before: beforeFree,
        after: afterFree,
        redeemed: true,
        client: updatedClient,
      })
      playScanSuccessFeedback()
      if (typeof onDone === 'function') await onDone()
      await loadFraudRows()
      await loadTodayRows()
      resetScannerForNextGuest(2700, scannerOnly)
    } catch (err) {
      const text = String(err?.message || err || '')
      setMessage(text || 'Не удалось выдать подарок.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`loyalty-pos-lite scanner-compact-mode ${scannerOnly ? 'scanner-only-compact' : ''}`}>
      <div className="loyalty-card pos-lite-card scanner-main-card">
        <div className="scanner-compact-top">
          <h2>Scanner</h2>
          {scannerOnly && <span>{scannerProfile?.branch_id || branchId} · auto +1</span>}
        </div>

        {successFlash && (
          <div className={`scanner-success-flash ${(successFlash.giftCount > 0 || successFlash.redeemed) ? 'gift' : ''}`}>
            <div className="scanner-success-icon">{(successFlash.giftCount > 0 || successFlash.redeemed) ? '🎁' : '✅'}</div>
            <b>{successFlash.redeemed ? 'ПОДАРОК ВЫДАН' : (successFlash.giftCount > 0 ? 'ПОДАРОК ДОСТУПЕН' : 'НАЧИСЛЕНО')}</b>
            <span>{successFlash.name}</span>
            <strong>{successFlash.redeemed ? `Баланс: ${successFlash.before} → ${successFlash.after}` : `${successFlash.before} → ${successFlash.after} из ${successFlash.threshold || VIP_DEFAULT_THRESHOLD}`}</strong>
            {successFlash.giftCount > 0 && <em>Бесплатный напиток доступен</em>}
            {successFlash.redeemed && <em>Бесплатный напиток списан</em>}
            {successFlash.vipLevel && !successFlash.redeemed && <i className="scanner-vip-note">{successFlash.vipLevel} · {successFlash.threshold || VIP_DEFAULT_THRESHOLD} → 1</i>}
          </div>
        )}

        {message && !successFlash && <div className="pos-lite-message scanner-compact-message">{message}</div>}

        <div className="scanner-primary-actions">
          <button type="button" className="loyalty-primary scanner-camera-main" onClick={startCameraScan} disabled={busy || cameraOpen || Boolean(successFlash)}>
            {cameraOpen ? 'Камера открыта…' : 'Сканировать QR'}
          </button>
          {client && getFreeDrinkBalance(client) > 0 ? (
            <button type="button" className="loyalty-primary scanner-redeem-main" onClick={redeemScannerGift} disabled={busy || Boolean(successFlash)}>
              {busy ? 'Выдача…' : 'Выдать подарок'}
            </button>
          ) : (
            <button type="button" className="loyalty-primary scanner-apply-main" onClick={applyPosStamps} disabled={!client || busy || Boolean(successFlash)}>
              {busy ? 'Начисление…' : 'Начислить +1'}
            </button>
          )}
        </div>

        {cameraOpen && (
          <div className="scanner-camera-box compact-camera-box">
            <video ref={videoRef} className="scanner-camera-video" muted playsInline autoPlay />
            <div className="scanner-camera-frame" />
            <div className="scanner-camera-status">{cameraStatus || 'Наведите камеру на QR'}</div>
            <button type="button" onClick={stopCameraScan}>Закрыть</button>
          </div>
        )}

        {client ? (
          <div className="scanner-client-compact">
            <div className="scanner-client-mainline">
              <div>
                <span>Клиент</span>
                <b>{client.name || 'Гость'}</b>
                <small>{client.phone || buildCardNumber(client)}</small>
              </div>
              <div className="scanner-client-score">
                <strong>{getStampCount(client)}/{getRewardThreshold(client)}</strong>
                <em>{getStampProgress(client).percent}%</em>
                <small>{getVipLevelInfo(client).title}</small>
              </div>
            </div>
            <CoffeeStampRow client={client} size="scanner-large" />
            <div className="scanner-progress-line"><i><em style={{ width: `${getStampProgress(client).percent}%` }} /></i></div>
            <p className={Number(client?.free_drink_balance || 0) > 0 ? 'scanner-gift-note' : ''}>
              {Number(client?.free_drink_balance || 0) > 0 ? '🎁 БЕСПЛАТНЫЙ НАПИТОК ДОСТУПЕН' : progressPhrase(client)}
            </p>
          </div>
        ) : (
          <div className="scanner-client-placeholder">Клиент не выбран</div>
        )}

        <details className="scanner-manual-details">
          <summary>Ручной ввод</summary>
          <label className="scanner-manual-input">QR / token / карта / телефон
            <textarea value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Вставьте token, номер карты или телефон" />
          </label>
          <button type="button" className="loyalty-primary secondary-scan-button" onClick={() => findClient()} disabled={busy}>{busy ? 'Поиск…' : 'Найти клиента'}</button>
        </details>
      </div>

      <div className="loyalty-card pos-lite-card scanner-today-card compact-today-card">
        <div className="scanner-today-head">
          <h2>Сегодня</h2>
          <span>{todayRows.length}</span>
        </div>
        <div className="scanner-today-list compact-today-list">
          {todayRows.length ? todayRows.map((row, idx) => (
            <div className="scanner-today-row" key={`${row.id || row.created_at || 'today'}-${idx}`}>
              <div><b>{row.client_name || row.name || 'Клиент'}</b><span>{row.created_at ? new Date(row.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
              <strong>{Number(row.amount || row.stamps || 1) > 0 ? '+' : ''}{Number(row.amount || row.stamps || 1).toFixed(0)}</strong>
            </div>
          )) : <div className="loyalty-empty">Сегодня операций пока нет.</div>}
        </div>
      </div>

      {!scannerOnly && (
        <div className="loyalty-card pos-lite-card antifraud-card">
          <div className="loyalty-card-head"><div><h2>Антифрод</h2><p>Последние подозрительные или заблокированные операции.</p></div></div>
          <div className="antifraud-list">
            {fraudRows.length ? fraudRows.map((row, idx) => (
              <div className="antifraud-row" key={`${row.id || row.client_id || 'row'}-${idx}`}>
                <div><b>{row.reason || row.event_type || 'Проверка'}</b><span>{row.client_name || row.client_phone || row.card_number || 'Клиент не указан'}</span></div>
                <strong>{row.drinks || row.operations_count || 0}</strong>
              </div>
            )) : <div className="loyalty-empty">Подозрительных операций нет.</div>}
          </div>
        </div>
      )}
    </section>
  )
}


function LoyaltyAnalyticsPanel({ clients = [], transactions = [] }) {
  const [scanRows, setScanRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalyticsScanRows()
  }, [])

  async function loadAnalyticsScanRows() {
    setLoading(true)
    setError('')
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)

    const { data, error: scanError } = await supabase
      .from('rms_loyalty_scan_log')
      .select('*')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(800)

    if (scanError) {
      setError(scanError.message)
      setScanRows([])
    } else {
      setScanRows(data || [])
    }
    setLoading(false)
  }

  const analytics = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const activeFrom = new Date(now)
    activeFrom.setDate(activeFrom.getDate() - 30)

    const successfulScans = scanRows.filter((row) => row.cooldown_blocked !== true && String(row.operation_type || '') === 'drink_stamp')
    const redeemedScans = scanRows.filter((row) => row.cooldown_blocked !== true && String(row.operation_type || '').includes('redeem'))
    const blockedScans = scanRows.filter((row) => row.cooldown_blocked === true)
    const todayScans = successfulScans.filter((row) => new Date(row.created_at) >= todayStart)
    const monthScans = successfulScans.filter((row) => new Date(row.created_at) >= monthStart)
    const activeClientIds = new Set(scanRows.filter((row) => row.client_id && new Date(row.created_at) >= activeFrom).map((row) => row.client_id))

    const topClientsMap = new Map()
    successfulScans.forEach((row) => {
      const key = row.client_id || row.card_number || row.client_phone || row.client_name || 'unknown'
      const current = topClientsMap.get(key) || { name: row.client_name || 'Клиент', phone: row.client_phone || '', count: 0 }
      current.count += Number(row.drinks || row.stamps || 1) || 1
      topClientsMap.set(key, current)
    })

    const topStaffMap = new Map()
    successfulScans.forEach((row) => {
      const key = row.staff_name || 'Не указан'
      const current = topStaffMap.get(key) || { name: key, count: 0 }
      current.count += 1
      topStaffMap.set(key, current)
    })

    const topBranchMap = new Map()
    successfulScans.forEach((row) => {
      const key = row.branch_id || 'Без филиала'
      const current = topBranchMap.get(key) || { name: key, count: 0 }
      current.count += 1
      topBranchMap.set(key, current)
    })

    const blockedMap = new Map()
    blockedScans.forEach((row) => {
      const key = row.client_id || row.card_number || row.client_phone || row.client_name || 'unknown'
      const current = blockedMap.get(key) || { name: row.client_name || 'Клиент', phone: row.client_phone || '', count: 0 }
      current.count += 1
      blockedMap.set(key, current)
    })

    const totalStamps = clients.reduce((sum, item) => sum + getStampCount(item), 0)
    const freeBalance = clients.reduce((sum, item) => sum + getFreeDrinkBalance(item), 0)
    const transactionRedeems = Math.abs(transactions
      .filter((item) => ['drink_redeem', 'pos_drink_redeem'].includes(String(item.type || '')))
      .reduce((sum, item) => sum + Math.min(0, Number(item.amount || 0)), 0))

    return {
      totalClients: clients.length,
      activeClients30: activeClientIds.size,
      todayStamps: todayScans.reduce((sum, row) => sum + (Number(row.drinks || row.stamps || 1) || 1), 0),
      monthStamps: monthScans.reduce((sum, row) => sum + (Number(row.drinks || row.stamps || 1) || 1), 0),
      giftsRedeemed: redeemedScans.length || transactionRedeems,
      freeBalance,
      totalStamps,
      blockedCount: blockedScans.length,
      topClients: Array.from(topClientsMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      topStaff: Array.from(topStaffMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
      topBranches: Array.from(topBranchMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
      blockedClients: Array.from(blockedMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
      recentRows: scanRows.slice(0, 12),
      vipDistribution: VIP_LEVELS.map((level) => ({
        ...level,
        count: clients.filter((client) => getVipLevelInfo(client).key === level.key).length,
      })),
    }
  }, [clients, transactions, scanRows])

  function renderRankRows(rows, emptyText, valueLabel = 'начислений') {
    return rows.length ? rows.map((row, idx) => (
      <div className="analytics-rank-row" key={`${row.name || 'row'}-${idx}`}>
        <div>
          <b>{idx + 1}. {row.name || 'Клиент'}</b>
          {row.phone && <span>{row.phone}</span>}
        </div>
        <strong>{row.count} <small>{valueLabel}</small></strong>
      </div>
    )) : <div className="loyalty-empty">{emptyText}</div>
  }

  return (
    <section className="loyalty-analytics-panel">
      <div className="loyalty-card analytics-head-card">
        <div className="loyalty-card-head">
          <div>
            <h2>Loyalty Analytics</h2>
            <p>Ключевые показатели программы лояльности и контроль активности по сканированию.</p>
          </div>
          <button type="button" onClick={loadAnalyticsScanRows} disabled={loading}>{loading ? 'Обновление…' : 'Обновить'}</button>
        </div>
        {error && <div className="pos-lite-message">{error}</div>}
      </div>

      <section className="loyalty-kpis analytics-kpis">
        <div className="loyalty-kpi"><span>Клиентов</span><b>{analytics.totalClients}</b><small>в базе Loyalty</small></div>
        <div className="loyalty-kpi"><span>Активные 30 дней</span><b>{analytics.activeClients30}</b><small>по scan log</small></div>
        <div className="loyalty-kpi"><span>Сегодня</span><b>{analytics.todayStamps}</b><small>начислено напитков</small></div>
        <div className="loyalty-kpi"><span>Этот месяц</span><b>{analytics.monthStamps}</b><small>начислено напитков</small></div>
        <div className="loyalty-kpi"><span>Подарков выдано</span><b>{analytics.giftsRedeemed}</b><small>по журналу</small></div>
        <div className="loyalty-kpi"><span>Блокировки</span><b>{analytics.blockedCount}</b><small>cooldown попытки</small></div>
      </section>

      <section className="analytics-grid">
        <div className="loyalty-card analytics-card">
          <div className="loyalty-card-head"><div><h2>VIP уровни</h2><p>Распределение клиентов по уровням Barista&Chef.</p></div></div>
          <div className="vip-analytics-list">
            {analytics.vipDistribution.map((level) => (
              <div className={`vip-analytics-row vip-${level.key}`} key={level.key}>
                <div><b>{level.title}</b><span>{level.min}+ напитков · {level.benefit}</span></div>
                <strong>{level.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="loyalty-card analytics-card">
          <div className="loyalty-card-head"><div><h2>TOP клиентов</h2><p>Кто чаще всего использует карту.</p></div></div>
          <div className="analytics-rank-list">{renderRankRows(analytics.topClients, 'Пока нет начислений.', 'напитков')}</div>
        </div>

        <div className="loyalty-card analytics-card">
          <div className="loyalty-card-head"><div><h2>TOP сотрудников</h2><p>Кто сделал больше начислений.</p></div></div>
          <div className="analytics-rank-list">{renderRankRows(analytics.topStaff, 'Пока нет операций.', 'сканов')}</div>
        </div>

        <div className="loyalty-card analytics-card">
          <div className="loyalty-card-head"><div><h2>Филиалы</h2><p>Активность Loyalty по филиалам.</p></div></div>
          <div className="analytics-rank-list">{renderRankRows(analytics.topBranches, 'Пока нет данных по филиалам.', 'сканов')}</div>
        </div>

        <div className="loyalty-card analytics-card">
          <div className="loyalty-card-head"><div><h2>Cooldown</h2><p>Попытки повторного начисления раньше 10 минут.</p></div></div>
          <div className="analytics-rank-list danger">{renderRankRows(analytics.blockedClients, 'Заблокированных попыток нет.', 'попыток')}</div>
        </div>
      </section>

      <section className="loyalty-card analytics-card analytics-recent-card">
        <div className="loyalty-card-head"><div><h2>Последние события</h2><p>Начисления, выдачи подарков и cooldown-блокировки.</p></div></div>
        <div className="analytics-events-list">
          {analytics.recentRows.length ? analytics.recentRows.map((row, idx) => {
            const blocked = row.cooldown_blocked === true
            const redeem = String(row.operation_type || '').includes('redeem')
            return (
              <div className={`analytics-event-row ${blocked ? 'blocked' : ''} ${redeem ? 'gift' : ''}`} key={`${row.id || row.created_at || 'event'}-${idx}`}>
                <div className="analytics-event-icon">{blocked ? '⛔' : (redeem ? '🎁' : '+1')}</div>
                <div>
                  <b>{row.client_name || 'Клиент'}</b>
                  <span>{row.branch_id || '—'} · {row.staff_name || '—'} · {row.created_at ? new Date(row.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <strong>{blocked ? 'Блок' : (redeem ? 'Подарок' : 'Начисление')}</strong>
              </div>
            )
          }) : <div className="loyalty-empty">Событий пока нет.</div>}
        </div>
      </section>
    </section>
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
            <div className="wallet-public-addbox qr-save-box">
              <h1>Сохраните карту на телефоне</h1>
              <p>Пока карта работает как QR‑страница. Откройте её в браузере и добавьте на главный экран телефона.</p>
              <div className="qr-save-steps">
                <div><b>iPhone</b><span>Safari → Поделиться → На экран «Домой»</span></div>
                <div><b>Android</b><span>Chrome → Меню → Добавить на главный экран</span></div>
              </div>
              <small>На кассе достаточно показать QR-код или назвать номер телефона.</small>
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



function readJoinBranchFromLocation() {
  if (typeof window === 'undefined') return 'BC1'
  const params = new URLSearchParams(window.location.search)
  return params.get('branch') || params.get('b') || 'BC1'
}

function normalizePublicPhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const digits = normalizeDigits(raw)
  if (!digits) return raw
  if (digits.startsWith('994')) return `+${digits}`
  if (digits.length === 9) return `+994${digits}`
  return raw.startsWith('+') ? raw : `+${digits}`
}

function LoyaltyPublicJoin() {
  const branch = readJoinBranchFromLocation()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submitJoin(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    const phone = normalizePublicPhone(form.phone)
    const name = String(form.name || '').trim() || 'Гость'
    if (!phone) return setError('Укажите номер телефона.')
    setLoading(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('rms_loyalty_public_join', {
        p_name: name,
        p_phone: phone,
        p_branch_id: branch,
      })
      if (rpcError) throw rpcError
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('Карта не создана. Попробуйте ещё раз.')
      setClient(row)
      setMessage('Карта готова.')
    } catch (err) {
      setError(err?.message || 'Не удалось создать карту.')
    } finally {
      setLoading(false)
    }
  }

  if (client) {
    return (
      <div className="loyalty-public-join-page">
        <div className="loyalty-public-join-shell">
          <div className="public-join-brand">
            <div className="public-join-logo"><span>Barista<span>&amp;Chef</span></span><small>COFFEE HOUSE</small></div>
            <b>Карта готова</b>
            <p>Покажите QR на кассе для начисления напитков и выдачи подарков.</p>
          </div>
          {message && <div className="public-join-alert">{message}</div>}
          <div className="public-join-result"><DrinkStampCard client={client} /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="loyalty-public-join-page">
      <div className="loyalty-public-join-shell">
        <div className="public-join-brand">
          <div className="public-join-logo"><span>Barista<span>&amp;Chef</span></span><small>COFFEE HOUSE</small></div>
          <b>Loyalty Card</b>
          <p>Введите имя и телефон. Карта откроется сразу после регистрации.</p>
        </div>
        <form className="public-join-form" onSubmit={submitJoin}>
          {error && <div className="public-join-alert error">{error}</div>}
          <label>Имя<input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Например: Ayxan" /></label>
          <label>Телефон<input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="+994..." inputMode="tel" /></label>
          <button type="submit" disabled={loading}>{loading ? 'Создаём карту…' : 'Получить карту'}</button>
          <small className="public-join-note">Филиал: {branch}. Если карта уже есть, откроется существующая карта.</small>
        </form>
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
  const isPublicJoin = typeof window !== 'undefined' && window.location.pathname.startsWith('/loyalty/join')
  if (isPublicJoin) {
    return <LoyaltyPublicJoin />
  }

  const walletTokenFromUrl = readWalletTokenFromLocation()

  if (walletTokenFromUrl) {
    return <LoyaltyWalletLanding token={walletTokenFromUrl} />
  }

  return <RMSLoyaltyAdmin />
}

function RMSLoyaltyAdmin() {
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rules, setRules] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('info')
  const [operationQuery, setOperationQuery] = useState('')
  const [operationType, setOperationType] = useState('all')
  const scannerProfile = getCurrentRmsInternalScannerProfile()
  const scannerOnly = Boolean(scannerProfile)
  const [activeTab, setActiveTab] = useState(scannerOnly ? 'pos' : 'overview')

  useEffect(() => { loadLoyalty() }, [])
  useEffect(() => { if (scannerOnly && activeTab !== 'pos') setActiveTab('pos') }, [scannerOnly, activeTab])
  useEffect(() => {
    if (!selectedClientId && clients[0]?.id) setSelectedClientId(clients[0].id)
  }, [clients, selectedClientId])

  async function loadLoyalty() {
    setLoading(true)
    setMessage('')
    const [clientsRes, txRes, rulesRes] = await Promise.all([
      supabase.from('rms_loyalty_clients').select('*').order('created_at', { ascending: false }),
      supabase.from('rms_loyalty_transactions').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('rms_loyalty_rules').select('*').order('created_at', { ascending: true }).limit(20),
    ])
    const firstError = clientsRes.error || txRes.error || rulesRes.error
    if (firstError) {
      setMessage(firstError.message)
      setMessageTone('error')
    }
    setClients(clientsRes.data || [])
    setTransactions(txRes.data || [])
    setRules(rulesRes.data || [])
    setLoading(false)
  }

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => [client.name, client.email, client.phone, client.notes, buildCardNumber(client)]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  }, [clients, query])

  const selectedClient = clients.find((item) => item.id === selectedClientId) || null
  const activeRule = rules.find((item) => item.is_active !== false) || rules[0] || null

  const selectedTransactions = useMemo(() => {
    if (!selectedClientId) return []
    return transactions.filter((item) => item.client_id === selectedClientId).slice(0, 12)
  }, [transactions, selectedClientId])

  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter((item) => item.is_active !== false).length
    const totalStamps = clients.reduce((sum, item) => sum + getStampCount(item), 0)
    const freeDrinks = clients.reduce((sum, item) => sum + getFreeDrinkBalance(item), 0)
    const totalBalance = clients.reduce((sum, item) => sum + Number(item.bonus_balance || 0), 0)
    const totalSpent = clients.reduce((sum, item) => sum + Number(item.total_spent || 0), 0)
    const activeFrom = new Date()
    activeFrom.setDate(activeFrom.getDate() - 30)
    const active30 = new Set(transactions
      .filter((item) => item.client_id && new Date(item.created_at) >= activeFrom)
      .map((item) => item.client_id)).size
    const earnedStamps = transactions
      .filter((item) => ['drink_stamp', 'pos_drink_stamp'].includes(String(item.type || '')))
      .reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0)
    const redeemedGifts = Math.abs(transactions
      .filter((item) => ['drink_redeem', 'pos_drink_redeem'].includes(String(item.type || '')))
      .reduce((sum, item) => sum + Math.min(0, Number(item.amount || 0)), 0))
    const earnedBonuses = transactions
      .filter((item) => Number(item.amount || 0) > 0)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const redeemedBonuses = Math.abs(transactions
      .filter((item) => Number(item.amount || 0) < 0)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0))
    return { totalClients, activeClients, active30, totalStamps, freeDrinks, totalBalance, totalSpent, earnedStamps, redeemedGifts, earnedBonuses, redeemedBonuses }
  }, [clients, transactions])

  const filteredTransactions = useMemo(() => {
    const q = operationQuery.trim().toLowerCase()
    return transactions.filter((item) => {
      const type = String(item.type || '')
      const matchesType = operationType === 'all'
        || (operationType === 'earn' && Number(item.amount || 0) >= 0)
        || (operationType === 'redeem' && Number(item.amount || 0) < 0)
      const matchesQuery = !q || [item.client_name, item.client_phone, item.branch_name, item.branch_id, item.order_id, item.receipt_number, item.comment]
        .some((value) => String(value || '').toLowerCase().includes(q))
      return matchesType && matchesQuery
    })
  }, [transactions, operationQuery, operationType])

  function openGuestLoyalty() {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.origin)
    url.searchParams.set('qr', 'menu')
    url.searchParams.set('branch', 'BC1')
    url.searchParams.set('table', '1')
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  if (scannerOnly) {
    return (
      <div className="loyalty-page loyalty-admin-v2 scanner-only-page">
        <section className="loyalty-admin-hero scanner-hero">
          <div>
            <span className="loyalty-admin-eyebrow">RMS LOYALTY · POS</span>
            <h1>Сканер карт</h1>
            <p>Сканируйте QR-код гостя, начисляйте бонусы и контролируйте операции текущей смены.</p>
          </div>
          <div className="loyalty-admin-status-card">
            <span>Пользователь</span>
            <b>{scannerProfile?.full_name || 'Scanner'}</b>
            <small>{scannerProfile?.branch_id || 'BC1'} · повторное начисление не раньше 10 минут</small>
          </div>
        </section>
        <LoyaltyPOSDrinkScan onDone={loadLoyalty} scannerProfile={scannerProfile} scannerOnly />
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'clients', label: 'Клиенты' },
    { id: 'operations', label: 'Операции' },
    { id: 'pos', label: 'POS-сканер' },
    { id: 'analytics', label: 'Аналитика' },
    { id: 'settings', label: 'Настройки' },
  ]

  return (
    <div className="loyalty-page loyalty-admin-v2">
      <section className="loyalty-admin-hero">
        <div className="loyalty-admin-hero-copy">
          <span className="loyalty-admin-eyebrow">RMS LOYALTY</span>
          <h1>Программа лояльности</h1>
          <p>Клиенты, бонусные карты, операции и аналитика — в едином пространстве RMS.</p>
          <div className="loyalty-admin-hero-actions">
            <button type="button" className="loyalty-admin-primary" onClick={openGuestLoyalty}>Открыть карту гостя</button>
            <button type="button" className="loyalty-admin-secondary" onClick={loadLoyalty} disabled={loading}>{loading ? 'Обновление…' : 'Обновить данные'}</button>
          </div>
        </div>
        <div className="loyalty-admin-status-card">
          <div className="loyalty-admin-status-line">
            <span className={`loyalty-admin-live-dot ${activeRule?.is_active === false ? 'off' : ''}`} />
            <span>{activeRule?.is_active === false ? 'Программа приостановлена' : 'Программа активна'}</span>
          </div>
          <b>{activeRule?.name || 'Основная программа'}</b>
          <small>{activeRule?.rule_type === 'stamp'
            ? `${Number(activeRule?.reward_threshold || 10)} покупок → подарок`
            : `${Number(activeRule?.cashback_percent || 5)}% начисление · до ${Number(activeRule?.max_redeem_percent || 30)}% списание`}</small>
        </div>
      </section>

      {message && <div className={`loyalty-message ${messageTone}`}>{message}</div>}

      <div className="loyalty-admin-tabs" role="tablist" aria-label="Разделы RMS Loyalty">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <LoyaltyOverview
          stats={stats}
          transactions={transactions}
          activeRule={activeRule}
          onNavigate={setActiveTab}
        />
      ) : activeTab === 'clients' ? (
        <LoyaltyClientsWorkspace
          clients={filteredClients}
          query={query}
          setQuery={setQuery}
          selectedClient={selectedClient}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          selectedTransactions={selectedTransactions}
          loading={loading}
          onRefresh={loadLoyalty}
          onOpenGuest={openGuestLoyalty}
        />
      ) : activeTab === 'operations' ? (
        <LoyaltyOperationsWorkspace
          transactions={filteredTransactions}
          query={operationQuery}
          setQuery={setOperationQuery}
          type={operationType}
          setType={setOperationType}
        />
      ) : activeTab === 'pos' ? (
        <section className="loyalty-pos-tab">
          <LoyaltyPOSDrinkScan onDone={loadLoyalty} />
        </section>
      ) : activeTab === 'analytics' ? (
        <LoyaltyAnalyticsPanel clients={clients} transactions={transactions} />
      ) : activeTab === 'settings' ? (
        <LoyaltyProgramSettings
          rule={activeRule}
          onSaved={async (text) => {
            await loadLoyalty()
            setMessage(text)
            setMessageTone('success')
          }}
          onError={(text) => {
            setMessage(text)
            setMessageTone('error')
          }}
        />
      ) : (
        <LoyaltyOverview stats={stats} transactions={transactions} activeRule={activeRule} onNavigate={setActiveTab} />
      )}
    </div>
  )
}

function LoyaltyOverview({ stats, transactions, activeRule, onNavigate }) {
  const recent = transactions.slice(0, 6)
  const isStamp = activeRule?.rule_type === 'stamp'
  return (
    <div className="loyalty-overview">
      <section className="loyalty-admin-kpis">
        <button type="button" onClick={() => onNavigate('clients')}>
          <span>Клиенты</span><b>{stats.totalClients}</b><small>{stats.active30} активных за 30 дней</small>
        </button>
        <button type="button" onClick={() => onNavigate('clients')}>
          <span>Активные карты</span><b>{stats.activeClients}</b><small>{stats.totalClients ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}% клиентской базы</small>
        </button>
        <button type="button" onClick={() => onNavigate('operations')}>
          <span>Начислено</span><b>{isStamp ? stats.earnedStamps : fmt(stats.earnedBonuses)}</b><small>{isStamp ? 'отметок по операциям' : 'бонусов за весь период'}</small>
        </button>
        <button type="button" onClick={() => onNavigate('operations')}>
          <span>Списано</span><b>{isStamp ? stats.redeemedGifts : fmt(stats.redeemedBonuses)}</b><small>{isStamp ? 'подарков выдано' : 'бонусов использовано'}</small>
        </button>
      </section>

      <section className="loyalty-admin-two-column">
        <div className="loyalty-admin-panel">
          <div className="loyalty-admin-panel-head">
            <div><span>АКТИВНОСТЬ</span><h2>Последние операции</h2></div>
            <button type="button" onClick={() => onNavigate('operations')}>Все операции</button>
          </div>
          <div className="loyalty-admin-activity-list">
            {recent.length ? recent.map((item, index) => (
              <LoyaltyOperationRow key={item.id || `${item.created_at}-${index}`} item={item} compact />
            )) : <LoyaltyEmptyState title="Операций пока нет" text="После первого начисления здесь появится история программы." />}
          </div>
        </div>

        <div className="loyalty-admin-panel loyalty-program-summary">
          <div className="loyalty-admin-panel-head">
            <div><span>ПРОГРАММА</span><h2>{activeRule?.name || 'Основная программа'}</h2></div>
            <button type="button" onClick={() => onNavigate('settings')}>Настроить</button>
          </div>
          <div className="loyalty-program-rule-grid">
            <div><span>Механика</span><b>{isStamp ? 'Карта отметок' : 'Cashback'}</b></div>
            <div><span>Начисление</span><b>{isStamp ? '1 отметка' : `${Number(activeRule?.cashback_percent || 5)}%`}</b></div>
            <div><span>Макс. списание</span><b>{isStamp ? '1 подарок' : `${Number(activeRule?.max_redeem_percent || 30)}%`}</b></div>
            <div><span>Бонус ко дню рождения</span><b>{fmt(activeRule?.birthday_bonus || 0)}</b></div>
          </div>
          <div className="loyalty-email-flow-note">
            <span>EMAIL OTP</span>
            <b>Регистрация гостя через QR Menu</b>
            <p>Гость подтверждает email одноразовым кодом. Карта привязывается к его аккаунту автоматически.</p>
            <button type="button" onClick={() => onNavigate('clients')}>Управление клиентами</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function LoyaltyClientsWorkspace({ clients, query, setQuery, selectedClient, selectedClientId, setSelectedClientId, selectedTransactions, loading, onRefresh, onOpenGuest }) {
  return (
    <section className="loyalty-admin-workspace">
      <div className="loyalty-onboarding-banner">
        <div className="loyalty-onboarding-icon">@</div>
        <div><b>Клиенты регистрируются самостоятельно</b><span>В QR Menu гость вводит email, получает шестизначный код и автоматически создаёт карту RMS Loyalty.</span></div>
        <button type="button" onClick={onOpenGuest}>Открыть форму гостя</button>
      </div>

      <div className="loyalty-client-workspace-grid">
        <div className="loyalty-admin-panel loyalty-client-browser">
          <div className="loyalty-admin-panel-head">
            <div><span>БАЗА КЛИЕНТОВ</span><h2>{clients.length} клиентов</h2></div>
            <button type="button" onClick={onRefresh} disabled={loading}>{loading ? '…' : 'Обновить'}</button>
          </div>
          <div className="loyalty-client-search-wrap">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, email, телефон или номер карты" aria-label="Поиск клиента" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск">×</button>}
          </div>
          <div className="loyalty-client-list-v2">
            {clients.length ? clients.map((client) => {
              const identity = client.email || formatPhoneDisplay(client.phone) || 'Контакт не указан'
              return (
                <button key={client.id} type="button" className={selectedClientId === client.id ? 'active' : ''} onClick={() => setSelectedClientId(client.id)}>
                  <span className="loyalty-client-avatar">{String(client.name || client.email || 'G').slice(0, 1).toUpperCase()}</span>
                  <span className="loyalty-client-main"><b>{client.name || 'Гость'}</b><small>{identity}</small></span>
                  <span className="loyalty-client-balance"><b>{fmt(client.bonus_balance)}</b><small>{client.is_active === false ? 'Отключена' : 'Активна'}</small></span>
                </button>
              )
            }) : <LoyaltyEmptyState title="Клиенты не найдены" text={query ? 'Измените запрос или очистите поиск.' : 'Первая карта появится после регистрации гостя в QR Menu.'} />}
          </div>
        </div>

        <div className="loyalty-admin-panel loyalty-client-profile">
          {selectedClient ? (
            <>
              <div className="loyalty-profile-head">
                <span className="loyalty-profile-avatar">{String(selectedClient.name || 'G').slice(0, 1).toUpperCase()}</span>
                <div><span>КАРТА КЛИЕНТА</span><h2>{selectedClient.name || 'Гость'}</h2><p>{selectedClient.email || formatPhoneDisplay(selectedClient.phone) || 'Контакт не указан'}</p></div>
                <span className={`loyalty-profile-status ${selectedClient.is_active === false ? 'off' : ''}`}>{selectedClient.is_active === false ? 'Отключена' : 'Активна'}</span>
              </div>
              <div className="loyalty-profile-metrics">
                <div><span>Баланс</span><b>{fmt(selectedClient.bonus_balance)}</b></div>
                <div><span>Покупки</span><b>{fmt(selectedClient.total_spent)}</b></div>
                <div><span>Визиты</span><b>{Number(selectedClient.visits_count || 0)}</b></div>
                <div><span>Уровень</span><b>{selectedClient.vip_level || selectedClient.level || 'Classic'}</b></div>
              </div>
              <div className="loyalty-profile-card-number"><span>Номер карты</span><b>{buildCardNumber(selectedClient)}</b></div>
              <div className="loyalty-profile-history">
                <div className="loyalty-admin-panel-head"><div><span>ИСТОРИЯ</span><h2>Последние операции</h2></div></div>
                <div className="loyalty-admin-activity-list">
                  {selectedTransactions.length ? selectedTransactions.slice(0, 6).map((item, index) => <LoyaltyOperationRow key={item.id || index} item={item} compact />) : <LoyaltyEmptyState title="История пуста" text="У клиента ещё нет начислений и списаний." />}
                </div>
              </div>
            </>
          ) : <LoyaltyEmptyState title="Выберите клиента" text="Справа появятся баланс, уровень и история карты." />}
        </div>
      </div>
    </section>
  )
}

function LoyaltyOperationsWorkspace({ transactions, query, setQuery, type, setType }) {
  return (
    <section className="loyalty-admin-panel loyalty-operations-panel">
      <div className="loyalty-admin-panel-head loyalty-operations-head">
        <div><span>ЖУРНАЛ</span><h2>Операции Loyalty</h2><p>Начисления, списания, корректировки и привязка к филиалу.</p></div>
        <span className="loyalty-operation-count">{transactions.length} операций</span>
      </div>
      <div className="loyalty-operation-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Клиент, филиал, чек или комментарий" aria-label="Поиск операции" />
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Тип операции">
          <option value="all">Все операции</option>
          <option value="earn">Начисления</option>
          <option value="redeem">Списания</option>
        </select>
      </div>
      <div className="loyalty-operation-table-head"><span>Клиент</span><span>Операция</span><span>Филиал / чек</span><span>Дата</span></div>
      <div className="loyalty-operation-list">
        {transactions.length ? transactions.map((item, index) => <LoyaltyOperationRow key={item.id || `${item.created_at}-${index}`} item={item} />) : <LoyaltyEmptyState title="Операции не найдены" text="Измените фильтры или дождитесь первой операции." />}
      </div>
    </section>
  )
}

function LoyaltyOperationRow({ item, compact = false }) {
  const meta = txOperationMeta(item)
  const date = item.created_at ? new Date(item.created_at) : null
  const validDate = date && !Number.isNaN(date.getTime())
  return (
    <div className={`loyalty-operation-row ${compact ? 'compact' : ''}`}>
      <div className={`loyalty-operation-icon ${meta.kind}`}>{meta.icon}</div>
      <div className="loyalty-operation-client"><b>{item.client_name || 'Клиент'}</b><small>{item.client_phone || item.comment || 'RMS Loyalty'}</small></div>
      <div className={`loyalty-operation-value ${meta.kind}`}><b>{meta.label}</b><small>{item.order_total ? `Чек ${fmt(item.order_total)}` : (item.type || 'операция')}</small></div>
      {!compact && <div className="loyalty-operation-source"><b>{item.branch_name || item.branch_id || '—'}</b><small>{item.receipt_number || item.order_id || 'Без номера чека'}</small></div>}
      <div className="loyalty-operation-date"><b>{validDate ? date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '—'}</b><small>{validDate ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div>
    </div>
  )
}

function LoyaltyProgramSettings({ rule, onSaved, onError }) {
  const [form, setForm] = useState({ name: '', rule_type: 'cashback', cashback_percent: 5, max_redeem_percent: 30, birthday_bonus: 10, is_active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      name: rule?.name || 'Основная программа',
      rule_type: rule?.rule_type || 'cashback',
      cashback_percent: Number(rule?.cashback_percent ?? 5),
      max_redeem_percent: Number(rule?.max_redeem_percent ?? 30),
      birthday_bonus: Number(rule?.birthday_bonus ?? 10),
      is_active: rule?.is_active !== false,
    })
  }, [rule])

  async function saveSettings(event) {
    event.preventDefault()
    if (!rule?.id) return onError('Настройки программы ещё не созданы для этой организации.')
    setSaving(true)
    const payload = {
      name: String(form.name || '').trim() || 'Основная программа',
      rule_type: form.rule_type,
      cashback_percent: Math.max(0, Math.min(100, Number(form.cashback_percent || 0))),
      max_redeem_percent: Math.max(0, Math.min(100, Number(form.max_redeem_percent || 0))),
      birthday_bonus: Math.max(0, Number(form.birthday_bonus || 0)),
      is_active: Boolean(form.is_active),
    }
    const { error } = await supabase.from('rms_loyalty_rules').update(payload).eq('id', rule.id)
    setSaving(false)
    if (error) return onError(error.message)
    onSaved('Настройки RMS Loyalty сохранены.')
  }

  return (
    <section className="loyalty-settings-grid">
      <form className="loyalty-admin-panel loyalty-settings-form" onSubmit={saveSettings}>
        <div className="loyalty-admin-panel-head"><div><span>ПРОГРАММА</span><h2>Правила начисления</h2><p>Параметры применяются к текущей организации.</p></div></div>
        {!rule?.id && <div className="loyalty-settings-warning">Для сохранения требуется существующее правило организации. Схема базы в этом Preview не изменяется.</div>}
        <label>Название программы<input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label>
        <label>Механика<select value={form.rule_type} onChange={(event) => setForm((value) => ({ ...value, rule_type: event.target.value }))}><option value="cashback">Cashback-бонусы</option><option value="stamp">Карта отметок</option></select></label>
        <div className="loyalty-settings-row">
          <label>Процент начисления<input type="number" min="0" max="100" step="0.5" value={form.cashback_percent} onChange={(event) => setForm((value) => ({ ...value, cashback_percent: event.target.value }))} /><span>% от оплаченной суммы</span></label>
          <label>Максимальное списание<input type="number" min="0" max="100" step="1" value={form.max_redeem_percent} onChange={(event) => setForm((value) => ({ ...value, max_redeem_percent: event.target.value }))} /><span>% суммы чека</span></label>
        </div>
        <label>Бонус ко дню рождения<input type="number" min="0" step="1" value={form.birthday_bonus} onChange={(event) => setForm((value) => ({ ...value, birthday_bonus: event.target.value }))} /><span>Размер праздничного начисления клиенту</span></label>
        <label className="loyalty-settings-toggle"><span><b>Программа активна</b><small>Разрешить новые регистрации и операции</small></span><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((value) => ({ ...value, is_active: event.target.checked }))} /></label>
        <button className="loyalty-admin-primary" type="submit" disabled={saving || !rule?.id}>{saving ? 'Сохранение…' : 'Сохранить настройки'}</button>
      </form>

      <div className="loyalty-admin-panel loyalty-settings-info">
        <div className="loyalty-admin-panel-head"><div><span>ИНТЕГРАЦИЯ</span><h2>Как работает RMS Loyalty</h2></div></div>
        <div className="loyalty-settings-steps">
          <div><span>1</span><b>Гость открывает QR Menu</b><p>Вкладка Loyalty доступна в публичном меню кафе.</p></div>
          <div><span>2</span><b>Подтверждает email</b><p>Одноразовый шестизначный код отправляется через защищённый SMTP.</p></div>
          <div><span>3</span><b>Получает персональную карту</b><p>Баланс и QR-код привязаны к подтверждённому аккаунту.</p></div>
          <div><span>4</span><b>POS проводит операцию</b><p>Начисление и списание фиксируются с филиалом, сотрудником и чеком.</p></div>
        </div>
        <div className="loyalty-settings-brand-note"><b>Название и оформление кафе</b><p>Берутся из профиля организации и настроек QR Menu. Сам продукт во всех организациях называется RMS Loyalty.</p></div>
      </div>
    </section>
  )
}

function LoyaltyEmptyState({ title, text }) {
  return <div className="loyalty-empty-state"><span>◇</span><b>{title}</b><p>{text}</p></div>
}
