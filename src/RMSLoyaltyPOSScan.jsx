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
  const fileInputRef = useRef(null)
  const scannerRef = useRef(null)
  const scannerRegionId = 'rms-loyalty-html5qr-region'

  const initialUrlToken = new URLSearchParams(window.location.search).get('loyalty_scan_token') || ''
  const [rawScan, setRawScan] = useState(initialUrlToken)
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
    if (initialUrlToken) {
      setMessage('QR клиента получен из ссылки. Ищу клиента...')
      setTimeout(() => findClientByToken(null, initialUrlToken), 250)
    }
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

  async function loadHtml5QrCode() {
    if (window.Html5Qrcode) return window.Html5Qrcode

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-html5qrcode="true"]')
      if (existing) {
        existing.addEventListener('load', resolve)
        existing.addEventListener('error', reject)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
      script.async = true
      script.dataset.html5qrcode = 'true'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })

    return window.Html5Qrcode
  }

  async function startCamera() {
    setCameraError('')
    setMessage('')

    try {
      const Html5Qrcode = await loadHtml5QrCode()

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerRegionId, {
          verbose: false,
        })
      }

      setCameraOpen(true)

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (!decodedText) return
          await stopCamera()
          setRawScan(decodedText)
          await findClientByToken(null, decodedText)
        },
        () => {}
      )
    } catch (err) {
      setCameraOpen(false)
      setCameraError(`Не удалось открыть live-сканер: ${err?.message || err}. Попробуйте кнопку “Сканировать из фото/камеры”.`)
    }
  }

  async function stopCamera() {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
      scannerRef.current?.clear?.()
    } catch {
      // ignore scanner stop errors
    }
    setCameraOpen(false)
  }

  async function scanQrFromImageFile(file) {
    if (!file) return
    setCameraError('')
    setMessage('')

    try {
      const Html5Qrcode = await loadHtml5QrCode()
      const tempId = 'rms-loyalty-file-scan-region'

      let tempEl = document.getElementById(tempId)
      if (!tempEl) {
        tempEl = document.createElement('div')
        tempEl.id = tempId
        tempEl.style.display = 'none'
        document.body.appendChild(tempEl)
      }

      const scanner = new Html5Qrcode(tempId, { verbose: false })
      const decodedText = await scanner.scanFile(file, true)
      await scanner.clear?.()

      if (!decodedText) {
        setCameraError('QR-код на фото не распознан. Попробуйте сделать фото ближе и без бликов.')
        return
      }

      setRawScan(decodedText)
      await findClientByToken(null, decodedText)
    } catch (err) {
      setCameraError(`QR не распознан с фото: ${err?.message || err}. Попробуйте live scan или сделайте фото ближе.`)
    }
  }

  function openPhotoScanner() {
    fileInputRef.current?.click()
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
          <p>Официант сканирует QR гостя обычной камерой телефона. Если открылась эта страница с token — клиент найдётся автоматически.</p>
        </div>
        <b>{CASHBACK_PERCENT}% cashback</b>
      </section>

      {message ? <div className="loyalty-scan-message">{message}</div> : null}
      {cameraError ? <div className="loyalty-scan-message warning">{cameraError}</div> : null}

      <section className="loyalty-scan-grid">
        <div className="loyalty-scan-card">
          <h2>1. QR клиента</h2>
          <p>Основной способ: откройте обычную камеру телефона и отсканируйте QR гостя. RMS откроет этот экран и подставит token автоматически.</p>

          <div className="loyalty-camera-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="loyalty-hidden-file"
              onChange={(e) => scanQrFromImageFile(e.target.files?.[0])}
            />
            {!cameraOpen ? (
              <button className="loyalty-scan-secondary" onClick={startCamera}>Запасной live scan
            ) : (
              <button className="loyalty-scan-secondary" onClick={stopCamera}>Закрыть live scan</button>
            )}
            <button className="loyalty-scan-secondary" onClick={openPhotoScanner}>Запасной scan из фото</button>
          </div>

          <div className={`loyalty-camera-box ${cameraOpen ? 'active' : ''}`}>
            <div id={scannerRegionId} className="loyalty-html5qr-region" />
            {!cameraOpen ? <div className="loyalty-camera-placeholder">Нажмите Live scan или Сканировать из фото/камеры</div> : null}
          </div>

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
            <div className="loyalty-scan-empty">Клиент появится здесь после сканирования QR обычной камерой телефона или после ручной вставки token.</div>
          )}
        </div>
      </section>
    </div>
  )
}
