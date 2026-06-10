import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './RMSLoyalty.css'

const parseNum = (v) => Number(String(v ?? '0').replace(',', '.')) || 0
const fmt = (n) => `${Number(n || 0).toFixed(2)} AZN`

const LEVELS = [
  { key: 'new', label: 'New', min: 0 },
  { key: 'silver', label: 'Silver', min: 300 },
  { key: 'gold', label: 'Gold', min: 1000 },
  { key: 'vip', label: 'VIP', min: 3000 },
]

const CASHBACK_PERCENT = 5
const MAX_REDEEM_PERCENT = 30
const BIRTHDAY_BONUS = 10

function detectLevel(totalSpent = 0) {
  return [...LEVELS].sort((a, b) => b.min - a.min)
    .find((level) => Number(totalSpent || 0) >= level.min)?.key || 'new'
}

function levelLabel(level) {
  return LEVELS.find((item) => item.key === level)?.label || 'New'
}

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
  if (!client) return 'BC-000000'
  const saved = client.card_number || client.loyalty_card_no || client.card_no
  if (saved) return String(saved)
  const seed = stableHash(client.id || client.phone || client.name) % 1000000
  return `BC-${String(seed).padStart(6, '0')}`
}

function buildQrToken(client) {
  if (!client) return ''
  return client.qr_token || client.loyalty_token || `${buildCardNumber(client)}:${client.id || normalizeDigits(client.phone)}`
}

function barcodeBars(value) {
  const clean = String(value || 'BC000000').replace(/[^A-Za-z0-9]/g, '')
  const source = `${clean}${stableHash(clean)}`
  return source.split('').slice(0, 42).map((char, idx) => {
    const code = char.charCodeAt(0) + idx
    const width = (code % 4) + 2
    const gap = (code % 3) + 1
    return { width, gap, tall: code % 5 !== 0 }
  })
}

function qrCells(value) {
  const seed = stableHash(value || 'loyalty')
  const cells = []
  for (let y = 0; y < 13; y += 1) {
    for (let x = 0; x < 13; x += 1) {
      const finder = (x < 4 && y < 4) || (x > 8 && y < 4) || (x < 4 && y > 8)
      const innerFinder = (x > 0 && x < 3 && y > 0 && y < 3) || (x > 9 && x < 12 && y > 0 && y < 3) || (x > 0 && x < 3 && y > 9 && y < 12)
      const pattern = ((x * 17 + y * 31 + seed) % 7) < 3
      if (finder || innerFinder || pattern) cells.push(`${x},${y}`)
    }
  }
  return cells
}

function DigitalLoyaltyCard({ client }) {
  const cardNumber = buildCardNumber(client)
  const token = buildQrToken(client)
  const bars = barcodeBars(cardNumber)
  const cells = qrCells(token)

  return (
    <div className="loyalty-digital-wrap">
      <div className="loyalty-digital-card">
        <div className="loyalty-card-topline">
          <div className="loyalty-brand-mark"><span />B&C</div>
          <div className="loyalty-saving-label"><b>{levelLabel(client.level)}</b><span>loyalty card</span></div>
        </div>

        <div className="loyalty-cups-row" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, idx) => <span key={idx} className={idx < Math.min(10, Number(client.visits_count || 0)) ? 'filled' : ''} />)}
        </div>

        <div className="loyalty-digital-main">
          <div>
            <small>AD</small>
            <strong>{client.name || 'Гость'}</strong>
          </div>
          <div>
            <small>BALANS</small>
            <strong>{Number(client.bonus_balance || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="loyalty-card-meta">
          <span>Card No: {cardNumber}</span>
          <span>Visits: {client.visits_count || 0}</span>
        </div>

        <div className="loyalty-code-zone">
          <div className="loyalty-qr-box">
            {cells.map((cell) => {
              const [x, y] = cell.split(',').map(Number)
              return <i key={cell} style={{ left: `${x * 7.69}%`, top: `${y * 7.69}%` }} />
            })}
          </div>
          <div className="loyalty-barcode-box">
            <div className="loyalty-bars">
              {bars.map((bar, idx) => <i key={idx} style={{ width: `${bar.width}px`, marginRight: `${bar.gap}px`, height: bar.tall ? '62px' : '48px' }} />)}
            </div>
            <b>{cardNumber}</b>
          </div>
        </div>
      </div>
      <p className="loyalty-card-note">QR/token готов для связки с POS Scanner. Для Apple Wallet следующим этапом нужен backend .pkpass.</p>
    </div>
  )
}

export default function RMSLoyalty() {
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [clientForm, setClientForm] = useState({ name: '', phone: '', birthday: '', notes: '' })
  const [operationForm, setOperationForm] = useState({ type: 'earn', amount: '', order_total: '', comment: '' })

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

  async function createClient(e) {
    e.preventDefault()
    setMessage('')
    const phone = clientForm.phone.trim()
    if (!phone) return setMessage('Укажите номер телефона клиента.')

    const { error } = await supabase.from('rms_loyalty_clients').insert({
      name: clientForm.name.trim() || 'Гость',
      phone,
      birthday: clientForm.birthday || null,
      notes: clientForm.notes.trim() || null,
      level: 'new',
      bonus_balance: 0,
      total_spent: 0,
      visits_count: 0,
      is_active: true,
    })

    if (error) return setMessage(error.message)
    setClientForm({ name: '', phone: '', birthday: '', notes: '' })
    await loadLoyalty()
    setMessage('Клиент добавлен.')
  }

  async function applyOperation(e) {
    e.preventDefault()
    setMessage('')

    const client = clients.find((item) => item.id === selectedClientId)
    if (!client) return setMessage('Выберите клиента.')

    const orderTotal = parseNum(operationForm.order_total)
    const manualAmount = parseNum(operationForm.amount)

    if (operationForm.type === 'earn' && orderTotal <= 0) {
      return setMessage('Для автоматического начисления укажите сумму чека.')
    }

    let amount = manualAmount

    if (operationForm.type === 'earn') {
      amount = Number(((orderTotal * CASHBACK_PERCENT) / 100).toFixed(2))
    }

    if (operationForm.type === 'redeem') {
      if (orderTotal <= 0) return setMessage('Для списания укажите сумму чека.')
      const maxByCheck = Number(((orderTotal * MAX_REDEEM_PERCENT) / 100).toFixed(2))
      const maxAvailable = Math.min(maxByCheck, Number(client.bonus_balance || 0))
      if (amount <= 0) return setMessage(`Укажите сумму списания. Максимум: ${fmt(maxAvailable)}.`)
      if (amount > maxAvailable) return setMessage(`Превышен лимит списания. Максимум: ${fmt(maxAvailable)}.`)
    }

    if (operationForm.type === 'adjustment' && amount <= 0) {
      return setMessage('Укажите сумму корректировки.')
    }

    const signedAmount = operationForm.type === 'redeem' ? -amount : amount
    const nextBalance = Math.max(0, Number(client.bonus_balance || 0) + signedAmount)
    const nextSpent = operationForm.type === 'earn'
      ? Number(client.total_spent || 0) + orderTotal
      : Number(client.total_spent || 0)
    const nextVisits = operationForm.type === 'earn' && orderTotal > 0
      ? Number(client.visits_count || 0) + 1
      : Number(client.visits_count || 0)

    const { error: txError } = await supabase.from('rms_loyalty_transactions').insert({
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      type: operationForm.type,
      amount: signedAmount,
      order_total: orderTotal || null,
      comment: operationForm.comment.trim() || (
        operationForm.type === 'earn'
          ? `Автоначисление ${CASHBACK_PERCENT}% от чека`
          : operationForm.type === 'redeem'
            ? `Списание бонусов, лимит ${MAX_REDEEM_PERCENT}% от чека`
            : 'Ручная корректировка'
      ),
    })

    if (txError) return setMessage(txError.message)

    const { error: clientError } = await supabase.from('rms_loyalty_clients').update({
      bonus_balance: nextBalance,
      total_spent: nextSpent,
      visits_count: nextVisits,
      level: detectLevel(nextSpent),
      updated_at: new Date().toISOString(),
    }).eq('id', client.id)

    if (clientError) return setMessage(clientError.message)

    setOperationForm({ type: 'earn', amount: '', order_total: '', comment: '' })
    await loadLoyalty()
    setMessage('Операция сохранена.')
  }

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => [client.name, client.phone, client.level, client.notes]
      .some((value) => String(value || '').toLowerCase().includes(q)))
  }, [clients, query])

  const selectedClient = clients.find((item) => item.id === selectedClientId) || null

  const orderTotalPreview = parseNum(operationForm.order_total)
  const autoEarnPreview = Number(((orderTotalPreview * CASHBACK_PERCENT) / 100).toFixed(2))
  const maxRedeemPreview = selectedClient
    ? Math.min(Number(selectedClient.bonus_balance || 0), Number(((orderTotalPreview * MAX_REDEEM_PERCENT) / 100).toFixed(2)))
    : 0

  const selectedTransactions = useMemo(() => {
    if (!selectedClientId) return transactions.slice(0, 12)
    return transactions.filter((item) => item.client_id === selectedClientId).slice(0, 20)
  }, [transactions, selectedClientId])

  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter((item) => item.is_active !== false).length
    const totalBalance = clients.reduce((sum, item) => sum + Number(item.bonus_balance || 0), 0)
    const totalSpent = clients.reduce((sum, item) => sum + Number(item.total_spent || 0), 0)
    const totalVisits = clients.reduce((sum, item) => sum + Number(item.visits_count || 0), 0)
    const earned = transactions.filter((item) => Number(item.amount || 0) > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const redeemed = Math.abs(transactions.filter((item) => Number(item.amount || 0) < 0).reduce((sum, item) => sum + Number(item.amount || 0), 0))
    return { totalClients, activeClients, totalBalance, totalSpent, totalVisits, earned, redeemed, avgCheck: totalVisits > 0 ? totalSpent / totalVisits : 0 }
  }, [clients, transactions])

  const topClients = useMemo(() => [...clients].sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0)).slice(0, 8), [clients])

  const levelCounts = useMemo(() => LEVELS.map((level) => ({
    ...level,
    count: clients.filter((client) => (client.level || 'new') === level.key).length,
  })), [clients])

  return (
    <div className="loyalty-page">
      <section className="loyalty-hero">
        <div>
          <span className="loyalty-eyebrow">RMS Pro Loyalty</span>
          <h1>Программа лояльности</h1>
          <p>Клиентская база, бонусы, уровни, история операций и контроль эффективности акций в одной панели RMS Pro.</p>
        </div>
        <div className="loyalty-hero-card">
          <span>Базовое правило</span>
          <b>{CASHBACK_PERCENT}% cashback</b>
          <small>Списание до {MAX_REDEEM_PERCENT}% от суммы чека · Birthday bonus {fmt(BIRTHDAY_BONUS)}</small>
        </div>
      </section>

      {message && <div className="loyalty-message">{message}</div>}

      <section className="loyalty-kpis">
        <div className="loyalty-kpi"><span>Всего клиентов</span><b>{stats.totalClients}</b><small>в базе Loyalty</small></div>
        <div className="loyalty-kpi"><span>Активные</span><b>{stats.activeClients}</b><small>доступны к начислению</small></div>
        <div className="loyalty-kpi"><span>Начислено</span><b>{fmt(stats.earned)}</b><small>за всё время</small></div>
        <div className="loyalty-kpi"><span>Списано</span><b>{fmt(stats.redeemed)}</b><small>использовано клиентами</small></div>
        <div className="loyalty-kpi"><span>Баланс бонусов</span><b>{fmt(stats.totalBalance)}</b><small>отложенное обязательство</small></div>
        <div className="loyalty-kpi"><span>Средний чек</span><b>{fmt(stats.avgCheck)}</b><small>по клиентским визитам</small></div>
      </section>

      <section className="loyalty-grid">
        <div className="loyalty-card loyalty-client-card">
          <div className="loyalty-card-head">
            <div><h2>Клиенты</h2><p>Поиск, выбор клиента и быстрый доступ к бонусам.</p></div>
            <button onClick={loadLoyalty} disabled={loading}>{loading ? 'Загрузка…' : 'Обновить'}</button>
          </div>
          <input className="loyalty-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, телефону или уровню..." />
          <div className="loyalty-client-list">
            {filteredClients.map((client) => (
              <button key={client.id} className={`loyalty-client-row ${selectedClientId === client.id ? 'active' : ''}`} onClick={() => setSelectedClientId(client.id)}>
                <div><b>{client.name || 'Гость'}</b><span>{client.phone}</span></div>
                <div><em>{levelLabel(client.level)}</em><strong>{fmt(client.bonus_balance)}</strong></div>
              </button>
            ))}
            {!filteredClients.length && <div className="loyalty-empty">Клиенты не найдены.</div>}
          </div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Новый клиент</h2><p>Минимальная регистрация по телефону.</p></div></div>
          <form className="loyalty-form" onSubmit={createClient}>
            <label>Имя<input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Например: Алексей" /></label>
            <label>Телефон<input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="+994..." /></label>
            <label>День рождения<input type="date" value={clientForm.birthday} onChange={(e) => setClientForm({ ...clientForm, birthday: e.target.value })} /></label>
            <label>Заметка<textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} placeholder="Предпочтения, любимый филиал, комментарий..." /></label>
            <button className="loyalty-primary">Добавить клиента</button>
          </form>
        </div>

        <div className="loyalty-card loyalty-profile-card">
          <div className="loyalty-card-head"><div><h2>Профиль клиента</h2><p>Баланс, уровень и ручная операция.</p></div></div>
          {selectedClient ? (
            <>
              <div className={`loyalty-profile ${selectedClient.level || 'new'}`}>
                <span>Уровень</span>
                <h3>{levelLabel(selectedClient.level)}</h3>
                <p>{selectedClient.name} · {selectedClient.phone}</p>
                <div className="loyalty-progress"><div style={{ width: `${Math.min(100, (Number(selectedClient.total_spent || 0) / 3000) * 100)}%` }} /></div>
                <div className="loyalty-profile-stats">
                  <div><small>Бонусы</small><b>{fmt(selectedClient.bonus_balance)}</b></div>
                  <div><small>Покупки</small><b>{fmt(selectedClient.total_spent)}</b></div>
                  <div><small>Визиты</small><b>{selectedClient.visits_count || 0}</b></div>
                </div>
              </div>

              <DigitalLoyaltyCard client={selectedClient} />

              <form className="loyalty-form" onSubmit={applyOperation}>
                <label>Тип операции<select value={operationForm.type} onChange={(e) => setOperationForm({ ...operationForm, type: e.target.value, amount: '' })}><option value="earn">Автоначисление от чека</option><option value="redeem">Списание бонусов</option><option value="adjustment">Ручная корректировка</option></select></label>
                <label>Сумма чека<input value={operationForm.order_total} onChange={(e) => setOperationForm({ ...operationForm, order_total: e.target.value })} placeholder="Например: 45.00" /></label>
                {operationForm.type !== 'earn' && <label>Бонусы<input value={operationForm.amount} onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })} placeholder={operationForm.type === 'redeem' ? `Максимум к списанию: ${fmt(maxRedeemPreview)}` : 'Например: 10.00'} /></label>}
                <div className="loyalty-rule-preview">
                  {operationForm.type === 'earn' && <><b>Будет начислено</b><span>{fmt(autoEarnPreview)} · {CASHBACK_PERCENT}% от суммы чека</span></>}
                  {operationForm.type === 'redeem' && <><b>Можно списать</b><span>{fmt(maxRedeemPreview)} · максимум {MAX_REDEEM_PERCENT}% от чека</span></>}
                  {operationForm.type === 'adjustment' && <><b>Корректировка</b><span>Ручная операция для администратора</span></>}
                </div>
                <label>Комментарий<textarea value={operationForm.comment} onChange={(e) => setOperationForm({ ...operationForm, comment: e.target.value })} placeholder="Например: заказ POS #1258" /></label>
                <button className="loyalty-primary">Сохранить операцию</button>
              </form>
            </>
          ) : <div className="loyalty-empty">Выберите клиента из списка.</div>}
        </div>
      </section>

      <section className="loyalty-rules-row">
        <div className="loyalty-rule-card"><span>Cashback</span><b>{CASHBACK_PERCENT}%</b><small>начисляется от оплаченного чека</small></div>
        <div className="loyalty-rule-card"><span>Списание</span><b>{MAX_REDEEM_PERCENT}%</b><small>максимум от суммы чека</small></div>
        <div className="loyalty-rule-card"><span>Birthday</span><b>{fmt(BIRTHDAY_BONUS)}</b><small>бонус на день рождения</small></div>
      </section>

      <section className="loyalty-grid bottom">
        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Уровни клиентов</h2><p>Распределение базы по уровням.</p></div></div>
          <div className="loyalty-levels">
            {levelCounts.map((level) => <div key={level.key} className={`loyalty-level ${level.key}`}><div><b>{level.label}</b><span>от {fmt(level.min)}</span></div><strong>{level.count}</strong></div>)}
          </div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Топ клиентов</h2><p>По сумме покупок.</p></div></div>
          <div className="loyalty-table">
            <div className="loyalty-table-head"><span>Клиент</span><span>Уровень</span><span>Покупки</span><span>Бонусы</span></div>
            {topClients.map((client) => <div className="loyalty-table-row" key={client.id}><span>{client.name}<small>{client.phone}</small></span><span>{levelLabel(client.level)}</span><span>{fmt(client.total_spent)}</span><span>{fmt(client.bonus_balance)}</span></div>)}
          </div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-head"><div><h2>Операции</h2><p>{selectedClient ? 'По выбранному клиенту' : 'Последние операции'}</p></div></div>
          <div className="loyalty-ops">
            {selectedTransactions.map((tx) => <div className="loyalty-op" key={tx.id}><div><b>{tx.client_name || 'Клиент'}</b><span>{tx.comment || tx.client_phone || 'Операция Loyalty'}</span></div><strong className={Number(tx.amount || 0) >= 0 ? 'plus' : 'minus'}>{Number(tx.amount || 0) >= 0 ? '+' : ''}{fmt(tx.amount)}</strong></div>)}
            {!selectedTransactions.length && <div className="loyalty-empty">Операций пока нет.</div>}
          </div>
        </div>
      </section>
    </div>
  )
}
