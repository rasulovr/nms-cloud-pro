import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  const landingUrl = buildWalletLandingUrl(client)
  const copyCardLink = async () => {
    if (!landingUrl) return
    try { await navigator.clipboard.writeText(landingUrl) } catch (_e) {}
  }
  const progress = getStampProgress(client)
  const freeBalance = progress.freeBalance

  return (
    <div className="drink-card-wallet-wrap">
      <div className="ios-wallet-topbar">
        <span>Отменить</span>
        <b>Карта лояльности</b>
        <span>QR</span>
      </div>

      <div className="drink-wallet-card progress-card">
        <div className="drink-wallet-head bc-card-head-centered">
          <div className="bc-round-logo" aria-label="Barista&Chef">
            <span className="bc-script-logo">Barista<span>&amp;</span>Chef</span>
            <small>COFFEE &amp; KITCHEN</small>
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

        <div className="drink-card-client-row">
          <div><small>ИМЯ</small><strong>{client?.name || 'Гость'}</strong></div>
          <div><small>БАЛАНС</small><strong>{intFmt(freeBalance)}</strong></div>
        </div>

        <div className="drink-card-progress enhanced">
          <span>{progress.percent}% · {progress.filled}/{STAMPS_FOR_FREE_DRINK} отметок</span>
          <i><em style={{ width: `${progress.percent}%` }} /></i>
          <small>{progressPhrase(client)}</small>
        </div>

        <div className="drink-qr-box">
          {landingUrl ? (
            <img src={qrImageUrl(landingUrl, 220)} alt="QR карты клиента" />
          ) : (
            <div className="drink-qr-placeholder">QR</div>
          )}
          <b>{cardNumber}</b>
          <small>Покажите этот QR на кассе</small>
        </div>
      </div>

      <div className="wallet-actions qr-only-actions">
        <button type="button" onClick={() => landingUrl && window.open(landingUrl, '_blank')}>Открыть карту</button>
        <button type="button" onClick={copyCardLink}>Скопировать ссылку</button>
      </div>
      <p>Пока используем QR-карту без Apple Wallet. Гость может открыть ссылку и добавить страницу на главный экран телефона.</p>
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

  const selectFields = 'id,name,phone,card_number,wallet_token,wallet_enabled,stamp_count,free_drink_balance,visits_count,created_at,updated_at,is_active'

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
            <strong>{successFlash.redeemed ? `Баланс: ${successFlash.before} → ${successFlash.after}` : `${successFlash.before} → ${successFlash.after} из ${STAMPS_FOR_FREE_DRINK}`}</strong>
            {successFlash.giftCount > 0 && <em>Бесплатный напиток доступен</em>}
            {successFlash.redeemed && <em>Бесплатный напиток списан</em>}
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
                <strong>{getStampCount(client)}/{STAMPS_FOR_FREE_DRINK}</strong>
                <em>{getStampProgress(client).percent}%</em>
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
  const scannerProfile = getCurrentRmsInternalScannerProfile()
  const scannerOnly = Boolean(scannerProfile)
  const [activeTab, setActiveTab] = useState(scannerOnly ? 'pos' : 'cards')

  useEffect(() => { loadLoyalty() }, [])
  useEffect(() => { if (scannerOnly && activeTab !== 'pos') setActiveTab('pos') }, [scannerOnly, activeTab])

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
    setMessage(`QR карты сохранён в базе. Token: ${savedRow.wallet_token}`)
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


  if (scannerOnly) {
    return (
      <div className="loyalty-page drink-mode scanner-only-page">
        <section className="loyalty-hero drink-hero scanner-hero">
          <div>
            <span className="loyalty-eyebrow">RMS Pro Loyalty · Scanner</span>
            <h1>Loyalty Scanner</h1>
            <p>Ограниченный режим: сканировать QR гостя, начислить 1 напиток и видеть операции за сегодня.</p>
          </div>
          <div className="loyalty-hero-card">
            <span>Пользователь</span>
            <b>{scannerProfile?.full_name || 'Scanner'}</b>
            <small>{scannerProfile?.branch_id || 'BC1'} · повторное начисление не раньше 10 минут</small>
          </div>
        </section>
        <LoyaltyPOSDrinkScan onDone={loadLoyalty} scannerProfile={scannerProfile} scannerOnly />
      </div>
    )
  }

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
          {selectedClient ? (
            <>
              <DrinkStampCard client={selectedClient} />
              <div className="inline-client-history">
                <div className="inline-client-history-head">
                  <h3>Последние операции</h3>
                  <span>{selectedTransactions.length ? `${Math.min(selectedTransactions.length, 8)} операций` : 'нет операций'}</span>
                </div>
                <ClientOperationsHistory transactions={selectedTransactions} />
              </div>
            </>
          ) : <div className="loyalty-empty">Выберите клиента из списка.</div>}
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
        </section>
      )}
        </div>
      )}
    </div>
  )
}
