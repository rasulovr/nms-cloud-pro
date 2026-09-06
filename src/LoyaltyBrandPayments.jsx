import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'

const money = n => `${Number(n || 0).toFixed(2)} ₼`
export default function LoyaltyBrandPayments({ organizationId, programVersion }) {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState('')
  const [redeem, setRedeem] = useState('0')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const order = orders.find(row => row.id === selected)
  const settings = order?.program?.settings
  const balance = Number(order?.available_bonus || 0)
  const subtotal = Number(order?.subtotal || 0)
  const limit = settings?.enabled && balance >= Number(settings.min_redeem_balance)
    ? Math.min(balance, Math.floor(subtotal * Number(settings.max_redeem_percent) + 1e-8) / 100) : 0
  const amount = Number(redeem)
  const valid = redeem !== '' && Number.isFinite(amount) && amount >= 0 && amount <= limit && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8
  const cash = subtotal - amount
  const earn = settings && cash >= Number(settings.min_purchase)
    ? Math.floor(cash * Number(order.program.effective_cashback_percent) + 1e-8) / 100 : 0
  async function refresh() {
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('qr_loyalty_pending_payments', { p_organization_id: organizationId })
      if (error) throw error
      setOrders(Array.isArray(data) ? data : [])
      setSelected(''); setConfirmed(false); setRedeem('0')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  useEffect(() => { refresh() }, [organizationId, programVersion])
  async function pay(event) {
    event.preventDefault()
    if (!order || busy || !confirmed || !valid) return
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('qr_loyalty_confirm_payment', {
        p_order_id: order.id, p_cash_paid: Number(cash.toFixed(2)), p_bonus_paid: amount,
        p_expected_version: order.program.version,
      })
      if (error) throw error
      setReceipt(data)
      await refresh()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <section className="loyalty-admin-panel loyalty-settings-form" style={{ marginTop: 24 }}>
    <h2>Оплата и бонусы</h2>
    <p>Подтверждайте оплату только после получения денег. Здесь доступны последние 50 открытых QR-чеков, к которым привязана карта гостя.</p>
    <button type="button" className="loyalty-admin-secondary" disabled={busy} onClick={refresh}>Обновить чеки</button>
    {error && <p role="alert">{error}</p>}
    {receipt && <p role="status">Чек оплачен. Начислено {money(receipt.earned)}, списано {money(receipt.bonus_paid)}. Баланс: {money(receipt.available_bonus)}.</p>}
    {!busy && !orders.length && <p>Открытых QR-чеков с картой гостя нет. Чеки из внешней кассы автоматически сюда не поступают.</p>}
    <form onSubmit={pay}>
      <label>Чек<select disabled={busy} value={selected} onChange={e => { setSelected(e.target.value); setConfirmed(false); setRedeem('0'); setReceipt(null) }}><option value="">Выберите чек</option>{orders.map(row => <option key={row.id} value={row.id}>№ {row.order_number} · {row.branch_name} · {money(row.subtotal)}</option>)}</select></label>
      {order && <fieldset disabled={busy} style={{ border: 0, padding: 0, display: 'grid', gap: 12, minWidth: 0 }}>
        <p>{order.customer_name} · карта <span style={{ overflowWrap: 'anywhere' }}>{order.member_code}</span></p>
        <p>Баланс: {money(balance)}. Можно списать: {money(limit)}.</p>
        <label>Списать бонусы<input required type="number" min="0" max={limit} step="0.01" value={redeem} onChange={e => { setRedeem(e.target.value); setConfirmed(false) }}/></label>
        <p>К оплате деньгами: <b>{valid ? money(cash) : '—'}</b>. Начислится: <b>{valid ? money(earn) : '—'}</b>.</p>
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> Я получил(а) {valid ? money(cash) : 'указанную сумму'} деньгами или банковской картой</label>
        <button type="submit" className="loyalty-admin-primary" disabled={!confirmed || !valid}>Подтвердить оплату чека</button>
      </fieldset>}
    </form>
  </section>
}
