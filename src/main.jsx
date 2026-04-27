import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const SECTIONS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'revenue', label: 'Выручка' },
  { id: 'finance', label: 'Финансы ресторанов' },
  { id: 'expenses', label: 'Расходы' },
  { id: 'suppliers', label: 'Поставщики' },
  { id: 'salaries', label: 'Зарплаты' },
  { id: 'recipes', label: 'Тех. карты' },
  { id: 'settings', label: 'Настройки' }
]

const fmt = (n) => Number(n || 0).toFixed(2)
const today = () => new Date().toISOString().slice(0, 10)
const monthKey = (date) => date.slice(0, 7)
const startOfMonth = (date) => `${monthKey(date)}-01`
const parseNum = (v) => Number(String(v || '0').replace(',', '.')) || 0

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        return
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      setProfile(data)
    }

    loadProfile()
  }, [session])

  if (loading) return <div className="login"><div className="login-card">Загрузка...</div></div>
  if (!session) return <Login />

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">NMS</div>
          <div>
            <h1>NMS Cloud Pro</h1>
            <p>Управление сетью</p>
          </div>
        </div>

        <div className="nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={section === s.id ? 'active' : ''}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="userbar">
          <span>{profile?.full_name || session.user.email}</span>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Выйти</button>
        </div>
      </aside>

      <main className="main">
        {section === 'dashboard' && <Dashboard />}
        {section === 'revenue' && <Revenue />}
        {section === 'finance' && <Finance />}
        {section === 'expenses' && <Expenses />}
        {section === 'suppliers' && <Suppliers />}
        {section === 'salaries' && <Salaries />}
        {section === 'recipes' && <Recipes />}
        {section === 'settings' && <Settings session={session} />}
      </main>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">NMS</div>
        <h1>Система управления сетью</h1>
        <p className="hint">NMS Cloud Pro</p>

        <label>Email
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
        </label>

        <label>Пароль
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
          Показать пароль
        </label>

        {error && <p className="bad">{error}</p>}

        <button className="primary full" onClick={signIn}>Войти</button>
      </div>
    </div>
  )
}

function useBranches() {
  const [branches, setBranches] = useState([])

  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).order('name').then(({ data }) => {
      setBranches(data || [])
    })
  }, [])

  return branches
}

function Dashboard() {
  const branches = useBranches()
  const [month, setMonth] = useState(startOfMonth(today()))
  const [taxRate, setTaxRate] = useState(8)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    salaries: 0,
    tax: 0,
    net: 0,
    margin: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [branches, month, taxRate])

  async function load() {
    if (!branches.length) return

    setLoading(true)
    setError('')

    const [revResult, expResult, salResult] = await Promise.all([
      supabase.from('monthly_branch_revenue').select('*').eq('month', month),
      supabase.from('monthly_branch_expenses').select('*').eq('month', month),
      supabase.from('monthly_branch_salary').select('*').eq('month', month)
    ])

    if (revResult.error || expResult.error || salResult.error) {
      setError(revResult.error?.message || expResult.error?.message || salResult.error?.message || 'Ошибка загрузки данных')
      setLoading(false)
      return
    }

    const revenueByBranch = new Map((revResult.data || []).map(r => [r.branch_id, r]))
    const expensesByBranch = new Map((expResult.data || []).map(r => [r.branch_id, r]))
    const salaryByBranch = new Map((salResult.data || []).map(r => [r.branch_id, r]))

    const nextRows = branches.map(branch => {
      const rev = revenueByBranch.get(branch.id)
      const exp = expensesByBranch.get(branch.id)
      const sal = salaryByBranch.get(branch.id)

      const cash = parseNum(rev?.cash_amount)
      const bank = parseNum(rev?.bank_amount)
      const wolt = parseNum(rev?.wolt_amount)
      const revenue = parseNum(rev?.total_revenue)
      const expenses = parseNum(exp?.total_expenses)
      const salaries = parseNum(sal?.total_salary)
      const tax = revenue * (parseNum(taxRate) / 100)
      const net = revenue - expenses - salaries - tax
      const margin = revenue > 0 ? (net / revenue) * 100 : 0

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        cash,
        bank,
        wolt,
        revenue,
        expenses,
        salaries,
        tax,
        net,
        margin
      }
    })

    const totals = nextRows.reduce((acc, row) => {
      acc.revenue += row.revenue
      acc.expenses += row.expenses
      acc.salaries += row.salaries
      acc.tax += row.tax
      acc.net += row.net
      return acc
    }, { revenue: 0, expenses: 0, salaries: 0, tax: 0, net: 0 })

    totals.margin = totals.revenue > 0 ? (totals.net / totals.revenue) * 100 : 0

    setRows(nextRows)
    setStats(totals)
    setLoading(false)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Дашборд</h2>
          <p>Общая картина по сети за выбранный месяц</p>
        </div>
      </div>

      <div className="grid">
        <div className="card span-2">
          <h3>Период и налог</h3>
          <div className="form-grid">
            <label>Месяц
              <input type="month" value={month.slice(0,7)} onChange={e => setMonth(`${e.target.value}-01`)} />
            </label>
            <label>Налог, %
              <input value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </label>
          </div>
          {loading && <p className="hint">Загрузка данных...</p>}
          {error && <p className="bad">{error}</p>}
        </div>

        <MetricCard title="Выручка сети" value={stats.revenue} />
        <MetricCard title="Расходы" value={stats.expenses} />
        <MetricCard title="Зарплаты" value={stats.salaries} />
        <MetricCard title="Налог" value={stats.tax} />
        <MetricCard title="Чистая прибыль" value={stats.net} status={stats.net >= 0 ? 'good' : 'bad'} />
        <div className="card">
          <h3>Маржинальность</h3>
          <div className={`big-number ${stats.margin >= 0 ? 'good' : 'bad'}`}>{stats.margin.toFixed(1)}%</div>
        </div>

        <div className="card span-2">
          <div className="topbar">
            <div>
              <h3>Филиалы</h3>
              <p className="hint">Прибыль = выручка − расходы − зарплаты − налог</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Филиал</th>
                  <th>Наличные</th>
                  <th>Банк</th>
                  <th>Wolt</th>
                  <th>Выручка</th>
                  <th>Расходы</th>
                  <th>Зарплаты</th>
                  <th>Налог</th>
                  <th>Прибыль</th>
                  <th>Маржа</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.branch_id}>
                    <td><strong>{row.branch_name}</strong></td>
                    <td>{fmt(row.cash)}</td>
                    <td>{fmt(row.bank)}</td>
                    <td>{fmt(row.wolt)}</td>
                    <td>{fmt(row.revenue)}</td>
                    <td>{fmt(row.expenses)}</td>
                    <td>{fmt(row.salaries)}</td>
                    <td>{fmt(row.tax)}</td>
                    <td className={row.net >= 0 ? 'good' : 'bad'}><strong>{fmt(row.net)}</strong></td>
                    <td className={row.margin >= 0 ? 'good' : 'bad'}>{row.margin.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Итого</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><strong>{fmt(stats.revenue)}</strong></td>
                  <td><strong>{fmt(stats.expenses)}</strong></td>
                  <td><strong>{fmt(stats.salaries)}</strong></td>
                  <td><strong>{fmt(stats.tax)}</strong></td>
                  <td className={stats.net >= 0 ? 'good' : 'bad'}><strong>{fmt(stats.net)}</strong></td>
                  <td className={stats.margin >= 0 ? 'good' : 'bad'}><strong>{stats.margin.toFixed(1)}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function MetricCard({ title, value, status }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className={`big-number ${status || ''}`}>{fmt(value)}</div>
    </div>
  )
}

function Revenue() {
  const branches = useBranches()
  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState(today())
  const [form, setForm] = useState({ cash_amount: '', bank_amount: '', wolt_amount: '', comment: '' })
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id)
  }, [branches, branchId])

  useEffect(() => {
    load()
  }, [branchId, date])

  async function load() {
    if (!branchId) return

    const { data: rev } = await supabase
      .from('daily_revenue')
      .select('*')
      .eq('branch_id', branchId)
      .eq('revenue_date', date)
      .maybeSingle()

    setForm({
      cash_amount: rev?.cash_amount ?? '',
      bank_amount: rev?.bank_amount ?? '',
      wolt_amount: rev?.wolt_amount ?? '',
      comment: rev?.comment ?? ''
    })

    const { data: exp } = await supabase
      .from('daily_expenses')
      .select('*, expense_categories(name)')
      .eq('branch_id', branchId)
      .eq('expense_date', date)
      .order('created_at')

    setExpenses(exp || [])

    const { data: cats } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setCategories(cats || [])
  }

  async function saveRevenue() {
    setMessage('')
    const payload = {
      branch_id: branchId,
      revenue_date: date,
      cash_amount: parseNum(form.cash_amount),
      bank_amount: parseNum(form.bank_amount),
      wolt_amount: parseNum(form.wolt_amount),
      comment: form.comment || null
    }

    const { error } = await supabase
      .from('daily_revenue')
      .upsert(payload, { onConflict: 'branch_id,revenue_date' })

    if (error) setMessage(error.message)
    else setMessage('Выручка сохранена')
  }

  async function addExpense() {
    const category = categories[0]
    const { error } = await supabase.from('daily_expenses').insert({
      branch_id: branchId,
      expense_date: date,
      category_id: category?.id || null,
      custom_category: category ? null : 'Новая статья',
      amount: 0
    })
    if (!error) load()
  }

  async function updateExpense(id, patch) {
    await supabase.from('daily_expenses').update(patch).eq('id', id)
    load()
  }

  async function deleteExpense(id) {
    await supabase.from('daily_expenses').delete().eq('id', id)
    load()
  }

  const totalRevenue = parseNum(form.cash_amount) + parseNum(form.bank_amount) + parseNum(form.wolt_amount)
  const totalExpenses = expenses.reduce((s, e) => s + parseNum(e.amount), 0)

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Выручка</h2>
          <p>Дневная выручка и расходы по филиалу</p>
        </div>
      </div>

      <div className="grid">
        <div className="card span-2">
          <h3>Период и филиал</h3>
          <div className="form-grid">
            <label>Филиал
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>Дата
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="card span-2">
          <h3>Выручка за день</h3>
          <div className="form-grid">
            <label>Наличными
              <input value={form.cash_amount} onChange={e => setForm({...form, cash_amount: e.target.value})} />
            </label>
            <label>Банк
              <input value={form.bank_amount} onChange={e => setForm({...form, bank_amount: e.target.value})} />
            </label>
            <label>Wolt
              <input value={form.wolt_amount} onChange={e => setForm({...form, wolt_amount: e.target.value})} />
            </label>
          </div>
          <br />
          <button className="primary" onClick={saveRevenue}>Сохранить выручку</button>
          {message && <p className="hint">{message}</p>}
        </div>

        <MetricCard title="Итого выручка" value={totalRevenue} />
        <MetricCard title="Итого расходы" value={totalExpenses} />
        <MetricCard title="Остаток дня" value={totalRevenue - totalExpenses} status={(totalRevenue-totalExpenses)>=0 ? 'good' : 'bad'} />

        <div className="card span-2">
          <div className="topbar">
            <div>
              <h3>Расходы за выбранную дату</h3>
              <p className="hint">Статьи расходов вертикально, с выбором категории</p>
            </div>
            <button className="primary" onClick={addExpense}>+ Статья расхода</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Статья</th>
                  <th>Сумма</th>
                  <th>Комментарий</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>
                      <select
                        value={e.category_id || '__custom__'}
                        onChange={ev => updateExpense(e.id, {
                          category_id: ev.target.value === '__custom__' ? null : ev.target.value,
                          custom_category: ev.target.value === '__custom__' ? (e.custom_category || 'Своя статья') : null
                        })}
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="__custom__">Своя статья</option>
                      </select>
                    </td>
                    <td><input value={e.amount} onChange={ev => updateExpense(e.id, { amount: parseNum(ev.target.value) })} /></td>
                    <td><input value={e.comment || ''} onChange={ev => updateExpense(e.id, { comment: ev.target.value })} /></td>
                    <td><button className="danger" onClick={() => deleteExpense(e.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function Finance() {
  const branches = useBranches()
  const [branchId, setBranchId] = useState('')
  const [month, setMonth] = useState(startOfMonth(today()))
  const [stats, setStats] = useState(null)
  const [plan, setPlan] = useState({ tax_rate: 8, planned_revenue: 0, planned_profit: 0 })

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id)
  }, [branches, branchId])

  useEffect(() => { load() }, [branchId, month])

  async function load() {
    if (!branchId) return

    const { data: rev } = await supabase.from('monthly_branch_revenue').select('*').eq('branch_id', branchId).eq('month', month).maybeSingle()
    const { data: exp } = await supabase.from('monthly_branch_expenses').select('*').eq('branch_id', branchId).eq('month', month).maybeSingle()
    const { data: p } = await supabase.from('finance_plans').select('*').eq('branch_id', branchId).eq('month', month).maybeSingle()

    const revenue = parseNum(rev?.total_revenue)
    const expenses = parseNum(exp?.total_expenses)
    const taxRate = parseNum(p?.tax_rate || 8)
    const tax = revenue * (taxRate / 100)
    const net = revenue - expenses - tax

    setPlan({
      tax_rate: p?.tax_rate || 8,
      planned_revenue: p?.planned_revenue || 0,
      planned_profit: p?.planned_profit || 0
    })

    setStats({ revenue, expenses, taxRate, tax, net })
  }

  async function savePlan() {
    await supabase.from('finance_plans').upsert({
      branch_id: branchId,
      month,
      tax_rate: parseNum(plan.tax_rate),
      planned_revenue: parseNum(plan.planned_revenue),
      planned_profit: parseNum(plan.planned_profit)
    }, { onConflict: 'branch_id,month' })
    load()
  }

  if (!stats) return <div className="notice">Загрузка финансов...</div>

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Финансы ресторанов</h2>
          <p>Финансовая аналитика по филиалу и месяцу</p>
        </div>
      </div>

      <div className="grid">
        <div className="card span-2">
          <h3>Период и филиал</h3>
          <div className="form-grid">
            <label>Филиал
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>Месяц
              <input type="month" value={month.slice(0,7)} onChange={e => setMonth(`${e.target.value}-01`)} />
            </label>
            <label>Налог %
              <input value={plan.tax_rate} onChange={e => setPlan({...plan, tax_rate: e.target.value})} />
            </label>
            <label>План выручки
              <input value={plan.planned_revenue} onChange={e => setPlan({...plan, planned_revenue: e.target.value})} />
            </label>
            <label>План прибыли
              <input value={plan.planned_profit} onChange={e => setPlan({...plan, planned_profit: e.target.value})} />
            </label>
          </div>
          <br />
          <button className="primary" onClick={savePlan}>Сохранить план</button>
        </div>

        <MetricCard title="Выручка" value={stats.revenue} />
        <MetricCard title="Расходы" value={stats.expenses} />
        <MetricCard title="Налог" value={stats.tax} />
        <MetricCard title="Чистая прибыль" value={stats.net} status={stats.net >= 0 ? 'good' : 'bad'} />
      </div>
    </>
  )
}

function Expenses() {
  return <Placeholder title="Расходы" />
}

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [name, setName] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
  }

  async function addSupplier() {
    if (!name.trim()) return
    await supabase.from('suppliers').insert({ name })
    setName('')
    load()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Поставщики</h2>
          <p>Список поставщиков. Долги и транзакции будут следующим шагом.</p>
        </div>
      </div>
      <div className="card">
        <div className="form-grid">
          <label>Название поставщика
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
        </div>
        <br />
        <button className="primary" onClick={addSupplier}>Добавить поставщика</button>
      </div>
      <br />
      <div className="card">
        <h3>Поставщики</h3>
        <table>
          <tbody>
            {suppliers.map(s => <tr key={s.id}><td>{s.name}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Salaries() { return <Placeholder title="Зарплаты" /> }
function Recipes() { return <Placeholder title="Тех. карты" /> }

function Placeholder({ title }) {
  return (
    <div className="notice">
      <h2>{title}</h2>
      <p>Модуль зарезервирован в базе данных и будет подключён следующим этапом.</p>
    </div>
  )
}

function Settings({ session }) {
  const [users, setUsers] = useState([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at')
    setUsers(data || [])
  }

  async function createProfileForCurrentUser() {
    await supabase.from('user_profiles').upsert({
      id: session.user.id,
      full_name: fullName || session.user.email,
      role: 'admin'
    })
    load()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Настройки</h2>
          <p>Пользователи и права доступа</p>
        </div>
      </div>

      <div className="card span-2">
        <h3>Создать профиль для текущего пользователя</h3>
        <p className="hint">Первый раз нажми эту кнопку после входа, чтобы создать admin-профиль.</p>
        <div className="form-grid">
          <label>Имя
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ruslan" />
          </label>
        </div>
        <br />
        <button className="primary" onClick={createProfileForCurrentUser}>Создать admin-профиль</button>
      </div>

      <br />

      <div className="card span-2">
        <h3>Пользователи</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Имя</th><th>Роль</th><th>Активен</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.role}</td>
                  <td>{u.is_active ? 'Да' : 'Нет'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
