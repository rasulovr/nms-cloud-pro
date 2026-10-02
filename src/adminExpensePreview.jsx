import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExpenseRow, createExpenseHandlers } from 'virtual:rms-admin-expense-preview'
import './adminExpensePreview.css'

function makeFixture(kind) {
  const now = new Date()
  const old = '2020-01-01T12:00:00.000Z'
  return {
    id: 'synthetic-expense', branch_id: 'synthetic-branch',
    expense_date: kind === 'recent' ? now.toISOString().slice(0,10) : '2020-01-01',
    created_at: kind === 'recent' ? now.toISOString() : old,
    amount: 12, comment: 'Вымышленная запись для проверки', category_id: null,
    custom_category: kind === 'bazar' ? 'Базар' : 'Тестовый расход',
    deleted_at: kind === 'cancelled' ? old : null
  }
}

function Preview() {
  const [role, setRole] = useState('admin')
  const [kind, setKind] = useState('old')
  const [revision, setRevision] = useState(0)
  const [expenses, setExpenses] = useState([makeFixture('old')])
  const [events, setEvents] = useState([])
  const [message, setMessage] = useState('')
  const [failNext, setFailNext] = useState(false)
  const [requests, setRequests] = useState(0)
  const isAdmin = role === 'admin'

  function reset(nextKind = kind) {
    setKind(nextKind)
    setExpenses([makeFixture(nextKind)])
    setEvents([])
    setRequests(0)
    setMessage('')
    setFailNext(false)
    setRevision(value => value + 1)
  }

  // In-memory simulation only. This object deliberately has no HTTP client.
  const supabase = { rpc: async (name, args) => {
    setRequests(value => value + 1)
    await new Promise(resolve => setTimeout(resolve, 600))
    if (failNext) {
      setFailNext(false)
      return { error: { message: 'Тестовая ошибка. Изменение не сохранено.' } }
    }
    const before = { ...expenses[0] }
    const after = name === 'rms_expense_cancel_secure'
      ? { ...before, deleted_at: new Date().toISOString() }
      : { ...before, ...args.p_patch }
    setEvents(previous => [...previous, {
      id: previous.length + 1, actor: isAdmin ? 'Тестовый администратор' : 'Тестовый сотрудник',
      operation: name === 'rms_expense_cancel_secure' ? 'Отмена' : 'Изменение',
      before, after, delta: name === 'rms_expense_cancel_secure' ? -before.amount : after.amount - before.amount
    }])
    return { data: after, error: null }
  } }

  const handlers = createExpenseHandlers({
    expenses, isAdmin, setExpenses, setMessage, branchId:'synthetic-branch', date:expenses[0].expense_date,
    currentUserMeta: async () => ({user_id:'synthetic-actor'}),
    hydrateExpenseForLocalState: (row, patch) => ({...row,...patch}),
    expenseNameFromPatch: (row, patch) => ({...row,...patch}).custom_category,
    distributeBazarExpense: async () => { throw new Error('Распределение не выполняется в демонстрации') },
    loadMonthStats: async () => {}, loadLogs: async () => {}, load: async () => {}, supabase
  })

  return <main className="rms-pro-shell rms-pro-content preview-page">
    <header><span className="preview-badge">ИЗОЛИРОВАННЫЙ PREVIEW</span><h1>Коррекция старых расходов</h1><p>Только вымышленные записи. Ничего не сохраняется в рабочем RMS.</p></header>
    <section className="preview-card">
      <div className="preview-controls">
        <label>Роль для проверки<select value={role} onChange={event => {setRole(event.target.value);setRevision(value=>value+1)}}><option value="admin">Администратор</option><option value="staff">Сотрудник</option></select></label>
        <label>Сценарий<select value={kind} onChange={event => reset(event.target.value)}><option value="old">Расход старше 7 дней</option><option value="recent">Новый расход</option><option value="cancelled">Отменённый расход</option><option value="bazar">Автоматически распределяемый расход</option></select></label>
        <button onClick={() => reset()}>Сбросить пример</button>
      </div>
      <p className="preview-note">Администратор может изменить сумму и комментарий старого обычного расхода. Для сотрудника остаётся ограничение 7 дней.</p>
      <div className="table-wrap"><table><thead><tr><th>Дата</th><th>Статья</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{expenses.map(expense => <ExpenseRow key={`${revision}-${expense.id}`} expense={expense} categories={[]} isAdmin={isAdmin} onSave={patch => handlers.updateExpense(expense.id,patch)} onCancel={() => handlers.cancelExpense(expense.id)}/>)}</tbody></table></div>
      <p role="status" className="preview-status">{message || 'Готово к проверке'}</p>
      <label className="preview-checkbox"><input type="checkbox" checked={failNext} onChange={event=>setFailNext(event.target.checked)}/>Имитировать ошибку следующего сохранения</label>
    </section>
    <section className="preview-card"><h2>Демонстрационный журнал</h2><p>Хранится только в этой вкладке. Запросов к имитатору: <strong data-testid="request-count">{requests}</strong>. Событий: <strong data-testid="event-count">{events.length}</strong>.</p>
      {events.length === 0 ? <p className="preview-empty">Пока изменений нет</p> : <ol className="preview-events">{events.map(event=><li key={event.id}><strong>{event.operation} · {event.actor}</strong><p>Сумма: {Number(event.before.amount).toFixed(2)} → {Number(event.after.amount).toFixed(2)} · Изменение: {Number(event.delta).toFixed(2)}</p><p>Комментарий: {event.before.comment || '—'} → {event.after.comment || '—'}</p></li>)}</ol>}
    </section>
    <aside className="preview-limit"><strong>Проверяется интерфейс, а не реальная база.</strong> Отмена старых расходов пока закрыта: сначала нужна проверка серверной защиты от повторного списания. Реальная запись журнала и серверное ограничение прав здесь не проверялись. Этот черновик нельзя переносить в рабочую версию.</aside>
  </main>
}

createRoot(document.getElementById('root')).render(<Preview/>)
