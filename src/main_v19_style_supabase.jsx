import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const I18N = {
  ru: {
    system_title:'Система управления сетью', system_short_title:'Система сети', system_subtitle:'Выручка · Финансы · Персонал · Поставщики',
    brand_subtitle:'Выручка · Финансы · Персонал', language_label:'Язык интерфейса', login_label:'Email', password_label:'Пароль',
    login_button:'Войти', login_hint:'Вход через Supabase Auth', login_error:'Неверный логин или пароль', show_password:'Показать пароль',
    logout:'Выйти', revenue_tab:'Выручка', finance_tab:'Финансы ресторанов', recipes_tab:'Тех. карты', salaries_tab:'Зарплаты',
    attendance_tab:'Посещаемость', advances_tab:'Авансы', suppliers_tab:'Поставщики', settings_tab:'Настройки',
    revenue_subtitle:'Ввод выручки и расходов за выбранную дату по филиалу', finance_subtitle:'Аналитика по филиалу, месяцу, выручке и расходам',
    period_branch:'Период и филиал', branch_select:'Филиал', date:'Дата', daily_revenue_title:'Выручка за выбранную дату',
    cash:'Наличными', bank:'Банк', wolt:'Wolt', revenue_summary:'Сводка выручки', total_revenue:'Общая выручка',
    forecast:'Прогноз месяца', forecast_revenue:'Предполагаемая выручка', forecast_profit:'Предполагаемая прибыль', avg_daily_revenue:'Средняя выручка / день',
    daily_expenses_title:'Расходы за выбранную дату', daily_expenses_hint:'Статьи расходов вводятся вертикально в столбик.',
    add_expense:'+ Статья расхода', daily_expenses_total:'Итого расходов за дату', expense_item:'Статья расхода', amount:'Сумма', comment:'Комментарий',
    year:'Год', month:'Месяц', tax_rate:'Налог %', planned_revenue:'План выручки', planned_profit:'План прибыли',
    expense_breakdown:'Расходы по статьям', current_result:'Текущий факт', gross_profit:'Валовая прибыль', total_expenses:'Расходы',
    tax_amount:'Налог', net_profit:'Чистая прибыль', profitable:'Филиал прибыльный', loss:'Филиал в убытке', comparison:'Сравнение',
    prev_month_revenue:'Выручка прошлого месяца', revenue_change_pct:'Изменение выручки', profit_change_pct:'Изменение прибыли',
    margins:'Маржинальность', expense_pct:'Расходы %', net_margin:'Маржа чистой прибыли', plan_status:'План',
    revenue_plan_progress:'Выполнение плана выручки', profit_plan_progress:'Выполнение плана прибыли', module_coming:'Раздел будет добавлен следующим этапом.',
    settings_subtitle:'Пользователи, права доступа и режимы работы', users_management:'Пользователи', add_user:'+ Пользователь',
    role:'Роль', sections_access:'Доступ к разделам', access_mode:'Режим', administrator:'Администратор', employee:'Сотрудник',
    read_only:'Только чтение', edit_mode:'Изменение', permission_denied:'Нет доступа к этому разделу', new_expense:'Новая статья', save:'Сохранить', saved:'Сохранено', loading:'Загрузка...', profile:'Профиль текущего пользователя', full_name:'Имя', create_admin:'Создать admin-профиль',
    months:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  },
  az: {
    system_title:'Şəbəkə idarəetmə sistemi', system_short_title:'Şəbəkə sistemi', system_subtitle:'Dövriyyə · Maliyyə · Personal · Təchizatçılar',
    brand_subtitle:'Dövriyyə · Maliyyə · Personal', language_label:'İnterfeys dili', login_label:'Email', password_label:'Parol',
    login_button:'Daxil ol', login_hint:'Supabase Auth ilə giriş', login_error:'Login və ya parol yanlışdır', show_password:'Parolu göstər',
    logout:'Çıxış', revenue_tab:'Dövriyyə', finance_tab:'Restoran maliyyəsi', recipes_tab:'Tex. kartlar', salaries_tab:'Maaşlar',
    attendance_tab:'Davamiyyət', advances_tab:'Avanslar', suppliers_tab:'Təchizatçılar', settings_tab:'Ayarlar',
    revenue_subtitle:'Seçilmiş tarix və filial üzrə dövriyyə və xərclər', finance_subtitle:'Filial, ay, dövriyyə və xərclər üzrə analitika',
    period_branch:'Dövr və filial', branch_select:'Filial', date:'Tarix', daily_revenue_title:'Seçilmiş tarixin dövriyyəsi',
    cash:'Nağd', bank:'Bank', wolt:'Wolt', revenue_summary:'Dövriyyə xülasəsi', total_revenue:'Ümumi dövriyyə',
    forecast:'Ay sonu proqnozu', forecast_revenue:'Gözlənilən dövriyyə', forecast_profit:'Gözlənilən mənfəət', avg_daily_revenue:'Orta gündəlik dövriyyə',
    daily_expenses_title:'Seçilmiş tarixin xərcləri', daily_expenses_hint:'Xərc maddələri şaquli siyahı ilə daxil edilir.',
    add_expense:'+ Xərc maddəsi', daily_expenses_total:'Tarixin xərcləri cəmi', expense_item:'Xərc maddəsi', amount:'Məbləğ', comment:'Şərh',
    year:'İl', month:'Ay', tax_rate:'Vergi %', planned_revenue:'Dövriyyə planı', planned_profit:'Mənfəət planı',
    expense_breakdown:'Xərclər maddələr üzrə', current_result:'Cari fakt', gross_profit:'Brüt mənfəət', total_expenses:'Xərclər',
    tax_amount:'Vergi', net_profit:'Xalis mənfəət', profitable:'Filial mənfəətlidir', loss:'Filial zərərlə işləyir', comparison:'Müqayisə',
    prev_month_revenue:'Keçən ayın dövriyyəsi', revenue_change_pct:'Dövriyyə dəyişikliyi', profit_change_pct:'Mənfəət dəyişikliyi',
    margins:'Marjalar', expense_pct:'Xərclər %', net_margin:'Xalis mənfəət marjası', plan_status:'Plan',
    revenue_plan_progress:'Dövriyyə planının icrası', profit_plan_progress:'Mənfəət planının icrası', module_coming:'Bölmə növbəti mərhələdə əlavə olunacaq.',
    settings_subtitle:'İstifadəçilər, giriş hüquqları və rejimlər', users_management:'İstifadəçilər', add_user:'+ İstifadəçi',
    role:'Rol', sections_access:'Bölmələrə giriş', access_mode:'Rejim', administrator:'Administrator', employee:'Əməkdaş',
    read_only:'Yalnız oxuma', edit_mode:'Dəyişiklik', permission_denied:'Bu bölməyə giriş yoxdur', new_expense:'Yeni xərc maddəsi', save:'Yadda saxla', saved:'Saxlanıldı', loading:'Yüklənir...', profile:'Cari istifadəçi profili', full_name:'Ad', create_admin:'Admin profil yarat',
    months:['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
  }
}

const SECTIONS = [
  { id: 'revenue', key: 'revenue_tab' },
  { id: 'finance', key: 'finance_tab' },
  { id: 'recipes', key: 'recipes_tab' },
  { id: 'salaries', key: 'salaries_tab' },
  { id: 'attendance', key: 'attendance_tab' },
  { id: 'advances', key: 'advances_tab' },
  { id: 'suppliers', key: 'suppliers_tab' },
  { id: 'settings', key: 'settings_tab' }
]

const fmt = (n) => Number(n || 0).toFixed(2)
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`
const parseNum = (v) => Number(String(v ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
const todayISO = () => new Date().toISOString().slice(0, 10)
const monthKeyFromDate = (date) => date.slice(0, 7)
const monthStart = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`
const daysInMonth = (year, month) => new Date(Number(year), Number(month), 0).getDate()
const prevMonth = (year, month) => {
  let y = Number(year)
  let m = Number(month) - 1
  if (m < 1) { m = 12; y -= 1 }
  return { year: y, month: m }
}
const defaultYears = () => {
  const cy = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => cy - 3 + i)
}

function useLang() {
  const [lang, setLangState] = useState(localStorage.getItem('nms_lang') || 'ru')
  const setLang = (value) => {
    localStorage.setItem('nms_lang', value)
    setLangState(value)
  }
  return [lang, setLang, (key) => I18N[lang]?.[key] || I18N.ru[key] || key]
}

function App() {
  const [lang, setLang, t] = useLang()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [section, setSection] = useState('revenue')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) { setProfile(null); return }
      const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle()
      setProfile(data)
    }
    loadProfile()
  }, [session])

  if (loading) return <div className="login-screen"><div className="login-card">{t('loading')}</div></div>
  if (!session) return <Login lang={lang} setLang={setLang} t={t} />

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">NMS</div>
          <div>
            <h1>{t('system_short_title')}</h1>
            <p>{t('brand_subtitle')}</p>
          </div>
        </div>

        <nav className="nav-tabs">
          {SECTIONS.map(s => (
            <button key={s.id} className={`nav ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>{t(s.key)}</button>
          ))}
        </nav>

        <div className="userbar">
          <span>{profile?.full_name || session.user.email}</span>
          <button className="ghost small" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </aside>

      <main className="main">
        {section === 'revenue' && <Revenue t={t} />}
        {section === 'finance' && <Finance t={t} lang={lang} />}
        {section === 'recipes' && <Placeholder title={t('recipes_tab')} t={t} />}
        {section === 'salaries' && <Placeholder title={t('salaries_tab')} t={t} />}
        {section === 'attendance' && <Placeholder title={t('attendance_tab')} t={t} />}
        {section === 'advances' && <Placeholder title={t('advances_tab')} t={t} />}
        {section === 'suppliers' && <Suppliers t={t} />}
        {section === 'settings' && <Settings session={session} t={t} />}
      </main>
    </div>
  )
}

function Login({ lang, setLang, t }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message || t('login_error'))
  }

  return (
    <section className="login-screen">
      <div className="login-card">
        <div className="login-logo">NMS</div>
        <h1>{t('system_title')}</h1>
        <p>{t('system_subtitle')}</p>

        <label><span>{t('language_label')}</span>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            <option value="ru">Русский</option>
            <option value="az">Azərbaycan</option>
          </select>
        </label>

        <label><span>{t('login_label')}</span><input value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
        <label><span>{t('password_label')}</span><input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" onKeyDown={e => { if (e.key === 'Enter') signIn() }} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /><span>{t('show_password')}</span></label>
        <button className="primary full" onClick={signIn}>{t('login_button')}</button>
        {error && <p className="hint bad">{error}</p>}
        <p className="hint">{t('login_hint')}</p>
      </div>
    </section>
  )
}

function useBranches() {
  const [branches, setBranches] = useState([])
  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).order('name').then(({ data }) => setBranches(data || []))
  }, [])
  return branches
}

function Revenue({ t }) {
  const branches = useBranches()
  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [form, setForm] = useState({ cash_amount: '', bank_amount: '', wolt_amount: '', comment: '' })
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [monthStats, setMonthStats] = useState({ cash: 0, bank: 0, wolt: 0, revenue: 0, avg: 0, forecastRevenue: 0 })

  useEffect(() => { if (!branchId && branches[0]) setBranchId(branches[0].id) }, [branches, branchId])
  useEffect(() => { load() }, [branchId, date])

  async function load() {
    if (!branchId) return
    const { data: rev } = await supabase.from('daily_revenue').select('*').eq('branch_id', branchId).eq('revenue_date', date).maybeSingle()
    setForm({ cash_amount: rev?.cash_amount ?? '', bank_amount: rev?.bank_amount ?? '', wolt_amount: rev?.wolt_amount ?? '', comment: rev?.comment ?? '' })

    const { data: exp } = await supabase.from('daily_expenses').select('*, expense_categories(name)').eq('branch_id', branchId).eq('expense_date', date).order('created_at')
    setExpenses(exp || [])

    const { data: cats } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name')
    setCategories(cats || [])

    const ym = monthKeyFromDate(date)
    const start = `${ym}-01`
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 1).toISOString().slice(0, 10)
    const { data: monthRows } = await supabase.from('daily_revenue').select('*').eq('branch_id', branchId).gte('revenue_date', start).lt('revenue_date', end)
    const cash = (monthRows || []).reduce((s, r) => s + parseNum(r.cash_amount), 0)
    const bank = (monthRows || []).reduce((s, r) => s + parseNum(r.bank_amount), 0)
    const wolt = (monthRows || []).reduce((s, r) => s + parseNum(r.wolt_amount), 0)
    const revenue = cash + bank + wolt
    const d = new Date(date)
    const now = new Date()
    const passed = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() ? now.getDate() : daysInMonth(d.getFullYear(), d.getMonth() + 1)
    const avg = passed ? revenue / passed : 0
    setMonthStats({ cash, bank, wolt, revenue, avg, forecastRevenue: avg * daysInMonth(d.getFullYear(), d.getMonth() + 1) })
  }

  async function saveRevenue(patch = null) {
    if (!branchId) return
    const next = patch ? { ...form, ...patch } : form
    setForm(next)
    await supabase.from('daily_revenue').upsert({
      branch_id: branchId,
      revenue_date: date,
      cash_amount: parseNum(next.cash_amount),
      bank_amount: parseNum(next.bank_amount),
      wolt_amount: parseNum(next.wolt_amount),
      comment: next.comment || null
    }, { onConflict: 'branch_id,revenue_date' })
    load()
  }

  async function addExpense() {
    if (!branchId) return
    const category = categories[0]
    await supabase.from('daily_expenses').insert({ branch_id: branchId, expense_date: date, category_id: category?.id || null, custom_category: category ? null : t('new_expense'), amount: 0 })
    load()
  }

  async function updateExpense(id, patch) {
    await supabase.from('daily_expenses').update(patch).eq('id', id)
    load()
  }

  async function deleteExpense(id) {
    await supabase.from('daily_expenses').delete().eq('id', id)
    load()
  }

  const dailyExpenseTotal = expenses.reduce((s, e) => s + parseNum(e.amount), 0)

  return (
    <section id="revenuePage">
      <section className="topbar"><div><h2>{t('revenue_tab')}</h2><p>{t('revenue_subtitle')}</p></div></section>
      <section className="grid">
        <div className="card span-2"><div className="card-head"><h3>{t('period_branch')}</h3></div><div className="form-grid">
          <label><span>{t('branch_select')}</span><select value={branchId} onChange={e => setBranchId(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>{t('date')}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        </div></div>

        <div className="card span-2"><div className="card-head"><h3>{t('daily_revenue_title')}</h3></div><div className="form-grid">
          <MoneyInput label={t('cash')} value={form.cash_amount} onChange={v => saveRevenue({ cash_amount: v })} />
          <MoneyInput label={t('bank')} value={form.bank_amount} onChange={v => saveRevenue({ bank_amount: v })} />
          <MoneyInput label={t('wolt')} value={form.wolt_amount} onChange={v => saveRevenue({ wolt_amount: v })} />
        </div></div>

        <div className="card"><h3>{t('revenue_summary')}</h3>
          <Metric label={t('total_revenue')} value={fmt(monthStats.revenue)} />
          <Metric label={t('cash')} value={fmt(monthStats.cash)} />
          <Metric label={t('bank')} value={fmt(monthStats.bank)} />
          <Metric label={t('wolt')} value={fmt(monthStats.wolt)} />
        </div>

        <div className="card"><h3>{t('forecast')}</h3>
          <Metric label={t('forecast_revenue')} value={fmt(monthStats.forecastRevenue)} />
          <Metric label={t('avg_daily_revenue')} value={fmt(monthStats.avg)} />
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>{t('daily_expenses_title')}</h3><p className="hint">{t('daily_expenses_hint')}</p></div><button className="small" onClick={addExpense}>{t('add_expense')}</button></div>
          <div className="form-grid compact"><label><span>{t('daily_expenses_total')}</span><input value={fmt(dailyExpenseTotal)} readOnly /></label></div>
          <div className="table-wrap"><table><thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('comment')}</th><th></th></tr></thead><tbody>
            {expenses.map(e => <tr key={e.id}>
              <td><ExpenseNameInput expense={e} categories={categories} onChange={patch => updateExpense(e.id, patch)} /></td>
              <td><input inputMode="decimal" value={e.amount ?? ''} onChange={ev => updateExpense(e.id, { amount: parseNum(ev.target.value) })} /></td>
              <td><input value={e.comment || ''} onChange={ev => updateExpense(e.id, { comment: ev.target.value })} /></td>
              <td><button className="remove" onClick={() => deleteExpense(e.id)}>×</button></td>
            </tr>)}
            {!expenses.length && <tr><td colSpan="4" className="hint">—</td></tr>}
          </tbody></table></div>
        </div>
      </section>
    </section>
  )
}

function ExpenseNameInput({ expense, categories, onChange }) {
  const [custom, setCustom] = useState(expense.custom_category || expense.expense_categories?.name || '')
  useEffect(() => setCustom(expense.custom_category || expense.expense_categories?.name || ''), [expense.id, expense.custom_category, expense.expense_categories?.name])

  if (categories.length) {
    return (
      <select value={expense.category_id || '__custom__'} onChange={ev => onChange({ category_id: ev.target.value === '__custom__' ? null : ev.target.value, custom_category: ev.target.value === '__custom__' ? (expense.custom_category || 'Своя статья') : null })}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__custom__">Своя статья</option>
      </select>
    )
  }
  return <input value={custom} onChange={ev => { setCustom(ev.target.value); onChange({ custom_category: ev.target.value }) }} />
}

function Finance({ t, lang }) {
  const branches = useBranches()
  const now = new Date()
  const [branchId, setBranchId] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [plan, setPlan] = useState({ tax_rate: 8, planned_revenue: 0, planned_profit: 0 })
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => { if (!branchId && branches[0]) setBranchId(branches[0].id) }, [branches, branchId])
  useEffect(() => { load() }, [branchId, year, month])

  async function calcFor(branch, y, m, taxRate = 8) {
    const monthDate = monthStart(y, m)
    const { data: rev } = await supabase.from('monthly_branch_revenue').select('*').eq('branch_id', branch).eq('month', monthDate).maybeSingle()
    const { data: exp } = await supabase.from('monthly_branch_expenses').select('*').eq('branch_id', branch).eq('month', monthDate).maybeSingle()
    const revenue = parseNum(rev?.total_revenue)
    const expenses = parseNum(exp?.total_expenses)
    const cash = parseNum(rev?.cash_amount)
    const bank = parseNum(rev?.bank_amount)
    const wolt = parseNum(rev?.wolt_amount)
    const tax = revenue * (parseNum(taxRate) / 100)
    const net = revenue - expenses - tax
    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avg = passed ? revenue / passed : 0
    const forecastRevenue = avg * daysInMonth(y, m)
    const expenseRate = revenue > 0 ? expenses / revenue : 0
    const forecastProfit = forecastRevenue - (forecastRevenue * expenseRate) - (forecastRevenue * parseNum(taxRate) / 100)
    return { revenue, expenses, cash, bank, wolt, tax, gross: revenue, net, avg, forecastRevenue, forecastProfit }
  }

  async function load() {
    if (!branchId) return
    const monthDate = monthStart(year, month)
    const { data: p } = await supabase.from('finance_plans').select('*').eq('branch_id', branchId).eq('month', monthDate).maybeSingle()
    const nextPlan = { tax_rate: p?.tax_rate ?? 8, planned_revenue: p?.planned_revenue ?? 0, planned_profit: p?.planned_profit ?? 0 }
    setPlan(nextPlan)
    const current = await calcFor(branchId, year, month, nextPlan.tax_rate)
    const pm = prevMonth(year, month)
    const previous = await calcFor(branchId, pm.year, pm.month, nextPlan.tax_rate)
    setStats({ ...current, previous })

    const start = monthDate
    const end = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)
    const { data: rows } = await supabase.from('daily_expenses').select('amount, custom_category, expense_categories(name)').eq('branch_id', branchId).gte('expense_date', start).lt('expense_date', end)
    const map = new Map()
    for (const r of rows || []) {
      const name = r.expense_categories?.name || r.custom_category || t('new_expense')
      map.set(name, (map.get(name) || 0) + parseNum(r.amount))
    }
    setBreakdown([...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount))
  }

  async function savePlan(patch) {
    const next = { ...plan, ...patch }
    setPlan(next)
    await supabase.from('finance_plans').upsert({ branch_id: branchId, month: monthStart(year, month), tax_rate: parseNum(next.tax_rate), planned_revenue: parseNum(next.planned_revenue), planned_profit: parseNum(next.planned_profit) }, { onConflict: 'branch_id,month' })
    load()
  }

  if (!stats) return <div className="module-placeholder">{t('loading')}</div>
  const revChange = stats.previous?.revenue ? ((stats.revenue - stats.previous.revenue) / stats.previous.revenue * 100) : 0
  const profitChange = stats.previous?.net ? ((stats.net - stats.previous.net) / stats.previous.net * 100) : 0

  return (
    <section id="financePage">
      <section className="topbar"><div><h2>{t('finance_tab')}</h2><p>{t('finance_subtitle')}</p></div></section>
      <section className="grid">
        <div className="card span-2"><div className="card-head"><h3>{t('period_branch')}</h3></div><div className="form-grid">
          <label><span>{t('branch_select')}</span><select value={branchId} onChange={e => setBranchId(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N[lang].months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <MoneyInput label={t('tax_rate')} value={plan.tax_rate} onChange={v => savePlan({ tax_rate: v })} />
          <MoneyInput label={t('planned_revenue')} value={plan.planned_revenue} onChange={v => savePlan({ planned_revenue: v })} />
          <MoneyInput label={t('planned_profit')} value={plan.planned_profit} onChange={v => savePlan({ planned_profit: v })} />
        </div></div>

        <div className="card span-2"><div className="card-head"><h3>{t('expense_breakdown')}</h3></div><div className="table-wrap"><table><thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('expense_pct')}</th></tr></thead><tbody>
          {breakdown.map(r => <tr key={r.name}><td>{r.name}</td><td><b>{fmt(r.amount)}</b></td><td>{pct(stats.revenue ? r.amount / stats.revenue * 100 : 0)}</td></tr>)}
          {!breakdown.length && <tr><td colSpan="3" className="hint">—</td></tr>}
        </tbody></table></div></div>

        <div className="card"><h3>{t('current_result')}</h3><Metric label={t('gross_profit')} value={fmt(stats.gross)} /><Metric label={t('total_expenses')} value={fmt(stats.expenses)} /><Metric label={t('tax_amount')} value={fmt(stats.tax)} /></div>
        <div className="card"><h3>{t('net_profit')}</h3><div className="big-number">{fmt(stats.net)}</div><p className={`hint ${stats.net >= 0 ? 'good' : 'bad'}`}>{stats.net >= 0 ? t('profitable') : t('loss')}</p></div>
        <div className="card"><h3>{t('forecast')}</h3><Metric label={t('forecast_revenue')} value={fmt(stats.forecastRevenue)} /><Metric label={t('forecast_profit')} value={fmt(stats.forecastProfit)} /><Metric label={t('avg_daily_revenue')} value={fmt(stats.avg)} /></div>
        <div className="card"><h3>{t('comparison')}</h3><Metric label={t('prev_month_revenue')} value={fmt(stats.previous?.revenue)} /><Metric label={t('revenue_change_pct')} value={pct(revChange)} /><Metric label={t('profit_change_pct')} value={pct(profitChange)} /></div>
        <div className="card"><h3>{t('margins')}</h3><Metric label={t('expense_pct')} value={pct(stats.revenue ? stats.expenses / stats.revenue * 100 : 0)} /><Metric label={t('net_margin')} value={pct(stats.revenue ? stats.net / stats.revenue * 100 : 0)} /></div>
        <div className="card"><h3>{t('plan_status')}</h3><Metric label={t('revenue_plan_progress')} value={pct(parseNum(plan.planned_revenue) ? stats.forecastRevenue / parseNum(plan.planned_revenue) * 100 : 0)} /><Metric label={t('profit_plan_progress')} value={pct(parseNum(plan.planned_profit) ? stats.forecastProfit / parseNum(plan.planned_profit) * 100 : 0)} /></div>
      </section>
    </section>
  )
}

function Suppliers({ t }) {
  const [suppliers, setSuppliers] = useState([])
  const [name, setName] = useState('')
  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
  }
  async function addSupplier() {
    if (!name.trim()) return
    await supabase.from('suppliers').insert({ name: name.trim() })
    setName('')
    load()
  }
  return (
    <section><section className="topbar"><div><h2>{t('suppliers_tab')}</h2><p>{t('module_coming')}</p></div></section>
      <section className="grid"><div className="card span-2"><div className="form-grid compact"><label><span>{t('suppliers_tab')}</span><input value={name} onChange={e => setName(e.target.value)} /></label></div><button className="small" onClick={addSupplier}>+ {t('suppliers_tab')}</button></div>
      <div className="card span-2"><div className="table-wrap"><table><tbody>{suppliers.map(s => <tr key={s.id}><td>{s.name}</td></tr>)}</tbody></table></div></div></section>
    </section>
  )
}

function Settings({ session, t }) {
  const [users, setUsers] = useState([])
  const [fullName, setFullName] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at')
    setUsers(data || [])
  }
  async function createProfileForCurrentUser() {
    await supabase.from('user_profiles').upsert({ id: session.user.id, full_name: fullName || session.user.email, role: 'admin' })
    setMsg(t('saved'))
    load()
  }
  return (
    <section><section className="topbar"><div><h2>{t('settings_tab')}</h2><p>{t('settings_subtitle')}</p></div></section>
      <section className="grid"><div className="card span-2"><div className="card-head"><h3>{t('profile')}</h3></div><div className="form-grid compact"><label><span>{t('full_name')}</span><input value={fullName} onChange={e => setFullName(e.target.value)} /></label></div><button className="small" onClick={createProfileForCurrentUser}>{t('create_admin')}</button>{msg && <p className="hint good">{msg}</p>}</div>
      <div className="card span-2"><div className="card-head"><h3>{t('users_management')}</h3></div><div className="table-wrap"><table><thead><tr><th>{t('full_name')}</th><th>Email/ID</th><th>{t('role')}</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.full_name}</td><td>{u.id}</td><td>{u.role}</td></tr>)}</tbody></table></div></div></section>
    </section>
  )
}

function Placeholder({ title, t }) {
  return <section><section className="topbar"><div><h2>{title}</h2></div></section><div className="module-placeholder"><h2>{title}</h2><p>{t('module_coming')}</p></div></section>
}

function MoneyInput({ label, value, onChange }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => setLocal(value ?? ''), [value])
  return <label><span>{label}</span><input inputMode="decimal" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} /></label>
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

createRoot(document.getElementById('root')).render(<App />)
