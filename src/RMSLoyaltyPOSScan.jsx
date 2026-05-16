import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import './RMSLoyaltyPOSScan.css'

const fmt = (n) => `${Number(n || 0).toFixed(2)} AZN`
const parseNum = (v) => Number(String(v ?? '0').replace(',', '.')) || 0
const CASHBACK_PERCENT = 5

function extractToken(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)
    if (parsed?.token) return String(parsed.token).trim()
  } catch {
    // Scanner may return plain token or URL.
  }

  if (raw.includes('token=')) {
    try {
      const url = new URL(raw)
      return url.searchParams.get('token') || raw
    } catch {
      return raw.split('token=')[1]?.split('&')[0] || raw
    }
  }

  return raw
}

export default function RMSLoyaltyPOSScan() {
  const videoRef = useRef(null)
  const scanTimerRef = useRef(null)
  const streamRef = useRef(null)

  const [rawScan, setRawScan] = useState('')
  const [tokenRow, setTokenRow] = useState(null)
  const [client, setClient] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const [form, setForm] = useState({
    branch_id: 'BC1',
    pos_check_id: '',
    order_total: '',
    payment_method: 'card',
    scanned_by: '',
    note: '',
  })

  const token = useMemo(() => extractToken(rawScan), [rawScan])
  const orderTotal = parseNum(form.order_total)
  const cashback = Number((orderTotal * CASHBACK_PERCENT / 100).toFixed(2))

  useEffect(() => {
    return () => stopCamera()
  }, [])

  async function findClientByToken(e, forcedValue) {
    e?.preventDefault?.()
    setMessage('')
    setTokenRow(null)
    setClient(null)

    const tokenValue = extractToken(forcedValue ?? rawScan)

    if (!tokenValue) {
      setMessage('Сканируйте QR-код гостя или вставьте token.')
      return
    }

    setLoading(true)

    const { data: tokenData, error: tokenError } = await supabase
      .from('rms_loyalty_qr_tokens')
      .select('*')
      .eq('token', tokenValue)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (tokenError) {
      setLoading(false)
      setMessage(tokenError.message)
      return
    }

    if (!tokenData) {
      setLoading(false)
      setMessage('QR-код не найден, истёк или уже не активен.')
      return
    }

    const { data: clientData, error: clientError } = await supabase
      .from('rms_loyalty_clients')
      .select('*')
      .eq('id', tokenData.client_id)
      .maybeSingle()

    setLoading(false)

    if (clientError) {
      setMessage(clientError.message)
      return
    }

    if (!clientData) {
      setMessage('Клиент не найден.')
      return
    }

    setRawScan(forcedValue ?? rawScan)
    setTokenRow(tokenData)
    setClient(clientData)
    setMessage('Клиент найден. После оплаты нажмите “Начислить cashback”.')
  }

  async function startCamera() {
    setCameraError('')
    setMessage('')

    if (!('BarcodeDetector' in window)) {
      setCameraError('Камера открывается, но этот браузер не поддерживает BarcodeDetector. Для iPhone лучше использовать Chrome/Edge или внешний QR-сканер. Можно также вставить token вручную.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      streamRef.current = stream
      setCameraOpen(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.play?.()
          beginDetectLoop()
        }
      }, 100)
    } catch (err) {
      setCameraError(`Не удалось открыть камеру: ${err?.message || err}`)
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setCameraOpen(false)
  }

  function beginDetectLoop() {
    if (!('BarcodeDetector' in window) || !videoRef.current) return

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

    scanTimerRef.current = setInterval(async () => {
      try {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        const codes = await detector.detect(videoRef.current)
        if (!codes?.length) return

        const value = codes[0]?.rawValue || ''
        if (!value) return

        stopCamera()
        setRawScan(value)
        await findClientByToken(null, value)
      } catch (err) {
        // keep scanning silently
      }
    }, 650)
  }

  async function attachAndPay() {
    setMessage('')

    if (!client || !tokenRow) {
      setMessage('Сначала сканируйте QR-код гостя.')
      return
    }

    if (orderTotal <= 0) {
      setMessage('Укажите сумму оплаченного чека.')
      return
    }

    const nextBalance = Number(client.bonus_balance || 0) + cashback
    const nextSpent = Number(client.total_spent || 0) + orderTotal
    const nextVisits = Number(client.visits_count || 0) + 1

    setLoading(true)

    const { error: scanError } = await supabase.from('rms_loyalty_pos_scans').insert({
      token,
      client_id: client.id,
      branch_id: form.branch_id || null,
      pos_check_id: form.pos_check_id || null,
      order_total: orderTotal,
      payment_method: form.payment_method,
      scan_status: 'paid',
      cashback_amount: cashback,
      scanned_by: form.scanned_by || null,
      note: form.note || null,
      paid_at: new Date().toISOString(),
    })

    if (scanError) {
      setLoading(false)
      setMessage(scanError.message)
      return
    }

    const { error: txError } = await supabase.from('rms_loyalty_transactions').insert({
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      type: 'earn',
      amount: cashback,
      order_total: orderTotal,
      order_id: form.pos_check_id || null,
      branch_id: form.branch_id || null,
      branch_name: form.branch_id || null,
      comment: `Cashback через POS scan · ${form.payment_method}`,
    })

    if (txError) {
      setLoading(false)
      setMessage(txError.message)
      return
    }

    await supabase.from('rms_loyalty_order_links').insert({
      client_id: client.id,
      order_source: 'pos',
      order_id: form.pos_check_id || null,
      branch_id: form.branch_id || null,
      payment_method: form.payment_method,
      order_total: orderTotal,
      cashback_amount: cashback,
      status: 'paid',
    })

    const { data: updatedClient, error: updateError } = await supabase
      .from('rms_loyalty_clients')
      .update({
        bonus_balance: nextBalance,
        total_spent: nextSpent,
        visits_count: nextVisits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)
      .select('*')
      .single()

    setLoading(false)

    if (updateError) {
      setMessage(updateError.message)
      return
    }

    setClient(updatedClient)
    setMessage(`Cashback начислен: ${fmt(cashback)}. Новый баланс: ${fmt(updatedClient.bonus_balance)}.`)
    setForm({ ...form, pos_check_id: '', order_total: '', note: '' })
  }

  function resetScan() {
    stopCamera()
    setRawScan('')
    setTokenRow(null)
    setClient(null)
    setMessage('')
    setCameraError('')
  }

  return (
    <div className="loyalty-scan-page">
      <section className="loyalty-scan-hero">
        <div>
          <span>RMS Loyalty POS</span>
          <h1>Сканирование QR гостя</h1>
          <p>Официант открывает этот раздел на телефоне, включает камеру и сканирует QR-код гостя из QR Menu.</p>
        </div>
        <b>{CASHBACK_PERCENT}% cashback</b>
      </section>

      {message ? <div className="loyalty-scan-message">{message}</div> : null}
      {cameraError ? <div className="loyalty-scan-message warning">{cameraError}</div> : null}

      <section className="loyalty-scan-grid">
        <div className="loyalty-scan-card">
          <h2>1. Сканировать QR клиента</h2>
          <p>Откройте этот экран на телефоне официанта/планшете и нажмите “Сканировать камерой”.</p>

          <div className="loyalty-camera-actions">
            {!cameraOpen ? (
              <button className="loyalty-scan-primary" onClick={startCamera}>Сканировать камерой</button>
            ) : (
              <button className="loyalty-scan-secondary" onClick={stopCamera}>Закрыть камеру</button>
            )}
          </div>

          {cameraOpen ? (
            <div className="loyalty-camera-box">
              <video ref={videoRef} muted playsInline />
              <div className="loyalty-camera-frame" />
              <span>Наведите камеру на QR гостя</span>
            </div>
          ) : null}

          <form onSubmit={findClientByToken} className="loyalty-scan-form manual-token">
            <label>
              Ручной режим / Token
              <textarea
                value={rawScan}
                onChange={(e) => setRawScan(e.target.value)}
                placeholder='Если камера недоступна, вставьте QR payload или token'
              />
            </label>
            <button disabled={loading}>{loading ? 'Проверка…' : 'Найти клиента'}</button>
          </form>

          {token ? <div className="loyalty-token-preview"><span>Распознанный token</span><b>{token.slice(0, 12)}...</b></div> : null}
        </div>

        <div className="loyalty-scan-card">
          <h2>2. Чек и оплата</h2>
          <div className="loyalty-scan-form">
            <label>Филиал<input value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} /></label>
            <label>POS чек / заказ<input value={form.pos_check_id} onChange={(e) => setForm({ ...form, pos_check_id: e.target.value })} placeholder="Например: POS-1258" /></label>
            <label>Сумма оплаченного чека<input value={form.order_total} onChange={(e) => setForm({ ...form, order_total: e.target.value })} placeholder="Например: 45.00" /></label>
            <label>Метод оплаты<select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="card">Карта</option><option value="cash">Наличные</option><option value="mixed">Смешанная</option></select></label>
            <label>Кассир / официант<input value={form.scanned_by} onChange={(e) => setForm({ ...form, scanned_by: e.target.value })} placeholder="Имя сотрудника" /></label>
            <label>Комментарий<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          </div>
        </div>

        <div className="loyalty-scan-card">
          <h2>3. Клиент</h2>
          {client ? (
            <div className="loyalty-scan-client">
              <span>Клиент найден</span>
              <h3>{client.name || 'Гость'}</h3>
              <p>{client.phone}</p>

              <div className="loyalty-scan-stats">
                <div><small>Уровень</small><b>{client.level || 'new'}</b></div>
                <div><small>Баланс</small><b>{fmt(client.bonus_balance)}</b></div>
                <div><small>Покупки</small><b>{fmt(client.total_spent)}</b></div>
              </div>

              <div className="loyalty-scan-cashback">
                <span>Будет начислено</span>
                <b>{fmt(cashback)}</b>
                <small>{CASHBACK_PERCENT}% от {fmt(orderTotal)}</small>
              </div>

              <button className="loyalty-scan-primary" onClick={attachAndPay} disabled={loading}>
                {loading ? 'Сохранение…' : 'Начислить cashback после оплаты'}
              </button>
              <button className="loyalty-scan-secondary" onClick={resetScan}>Новый scan</button>
            </div>
          ) : (
            <div className="loyalty-scan-empty">Клиент появится здесь после сканирования QR камерой телефона.</div>
          )}
        </div>
      </section>
    </div>
  )
}
