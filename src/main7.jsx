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
        {section === 'recipes' && <Recipes t={t} />}
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
  const ALL_BRANCHES = '__all__'
  const branches = useBranches()
  const now = new Date()
  const [branchId, setBranchId] = useState(ALL_BRANCHES)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [plan, setPlan] = useState({ tax_rate: 8, planned_revenue: 0, planned_profit: 0 })
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => { load() }, [branchId, year, month, branches.length])

  async function calcFor(branch, y, m, taxRate = 8) {
    const monthDate = monthStart(y, m)

    let revQuery = supabase.from('monthly_branch_revenue').select('*').eq('month', monthDate)
    let expQuery = supabase.from('monthly_branch_expenses').select('*').eq('month', monthDate)
    let salQuery = supabase.from('monthly_branch_salary').select('*').eq('month', monthDate)

    if (branch !== ALL_BRANCHES) {
      revQuery = revQuery.eq('branch_id', branch)
      expQuery = expQuery.eq('branch_id', branch)
      salQuery = salQuery.eq('branch_id', branch)
    }

    const [{ data: revRows }, { data: expRows }, { data: salRows }] = await Promise.all([revQuery, expQuery, salQuery])

    const revenue = (revRows || []).reduce((s, r) => s + parseNum(r.total_revenue), 0)
    const expenses = (expRows || []).reduce((s, r) => s + parseNum(r.total_expenses), 0)
    const salary = (salRows || []).reduce((s, r) => s + parseNum(r.total_salary), 0)
    const cash = (revRows || []).reduce((s, r) => s + parseNum(r.cash_amount), 0)
    const bank = (revRows || []).reduce((s, r) => s + parseNum(r.bank_amount), 0)
    const wolt = (revRows || []).reduce((s, r) => s + parseNum(r.wolt_amount), 0)

    const tax = revenue * (parseNum(taxRate) / 100)
    const net = revenue - expenses - salary - tax

    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avg = passed ? revenue / passed : 0
    const forecastRevenue = avg * daysInMonth(y, m)
    const costRate = revenue > 0 ? (expenses + salary) / revenue : 0
    const forecastProfit = forecastRevenue - (forecastRevenue * costRate) - (forecastRevenue * parseNum(taxRate) / 100)

    return { revenue, expenses, salary, cash, bank, wolt, tax, gross: revenue, net, avg, forecastRevenue, forecastProfit }
  }

  async function load() {
    if (branchId !== ALL_BRANCHES && !branchId) return

    const monthDate = monthStart(year, month)
    let nextPlan = plan

    if (branchId !== ALL_BRANCHES) {
      const { data: p } = await supabase.from('finance_plans').select('*').eq('branch_id', branchId).eq('month', monthDate).maybeSingle()
      nextPlan = { tax_rate: p?.tax_rate ?? 8, planned_revenue: p?.planned_revenue ?? 0, planned_profit: p?.planned_profit ?? 0 }
      setPlan(nextPlan)
    } else {
      nextPlan = { ...plan, tax_rate: plan.tax_rate || 8 }
      setPlan(nextPlan)
    }

    const current = await calcFor(branchId, year, month, nextPlan.tax_rate)
    const pm = prevMonth(year, month)
    const previous = await calcFor(branchId, pm.year, pm.month, nextPlan.tax_rate)
    setStats({ ...current, previous })

    const start = monthDate
    const end = new Date(Number(year), Number(month), 1).toISOString().slice(0, 10)
    let expQuery = supabase.from('daily_expenses').select('amount, custom_category, expense_categories(name)').gte('expense_date', start).lt('expense_date', end)
    if (branchId !== ALL_BRANCHES) expQuery = expQuery.eq('branch_id', branchId)
    const { data: rows } = await expQuery

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

    if (branchId !== ALL_BRANCHES) {
      await supabase.from('finance_plans').upsert({
        branch_id: branchId,
        month: monthStart(year, month),
        tax_rate: parseNum(next.tax_rate),
        planned_revenue: parseNum(next.planned_revenue),
        planned_profit: parseNum(next.planned_profit)
      }, { onConflict: 'branch_id,month' })
    }

    setTimeout(load, 0)
  }

  if (!stats) return <div className="module-placeholder">{t('loading')}</div>
  const revChange = stats.previous?.revenue ? ((stats.revenue - stats.previous.revenue) / stats.previous.revenue * 100) : 0
  const profitChange = stats.previous?.net ? ((stats.net - stats.previous.net) / Math.abs(stats.previous.net) * 100) : 0

  return (
    <section id="financePage">
      <section className="topbar">
        <div>
          <h2>{t('finance_tab')}</h2>
          <p>{branchId === ALL_BRANCHES ? 'Общие финансы по всем ресторанам за выбранный месяц' : t('finance_subtitle')}</p>
        </div>
      </section>

      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><h3>{t('period_branch')}</h3></div>
          <div className="form-grid">
            <label><span>{t('branch_select')}</span>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value={ALL_BRANCHES}>Общие финансы по всем ресторанам</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N[lang].months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <MoneyInput label={t('tax_rate')} value={plan.tax_rate} onChange={v => savePlan({ tax_rate: v })} />
            <MoneyInput label={t('planned_revenue')} value={plan.planned_revenue} onChange={v => savePlan({ planned_revenue: v })} />
            <MoneyInput label={t('planned_profit')} value={plan.planned_profit} onChange={v => savePlan({ planned_profit: v })} />
          </div>
          {branchId === ALL_BRANCHES && <p className="hint">Для общего режима план и налог используются только для расчёта на экране. Сохранение плана работает по отдельному филиалу.</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><h3>{t('expense_breakdown')}</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('expense_item')}</th><th>{t('amount')}</th><th>{t('expense_pct')}</th></tr></thead>
              <tbody>
                {breakdown.map(r => <tr key={r.name}><td>{r.name}</td><td><b>{fmt(r.amount)}</b></td><td>{pct(stats.revenue ? r.amount / stats.revenue * 100 : 0)}</td></tr>)}
                {!breakdown.length && <tr><td colSpan="3" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>{t('current_result')}</h3>
          <Metric label={t('gross_profit')} value={fmt(stats.gross)} />
          <Metric label={t('total_expenses')} value={fmt(stats.expenses)} />
          <Metric label="Зарплаты" value={fmt(stats.salary)} />
          <Metric label={t('tax_amount')} value={fmt(stats.tax)} />
        </div>

        <div className="card"><h3>{t('net_profit')}</h3><div className="big-number">{fmt(stats.net)}</div><p className={`hint ${stats.net >= 0 ? 'good' : 'bad'}`}>{stats.net >= 0 ? t('profitable') : t('loss')}</p></div>
        <div className="card"><h3>{t('forecast')}</h3><Metric label={t('forecast_revenue')} value={fmt(stats.forecastRevenue)} /><Metric label={t('forecast_profit')} value={fmt(stats.forecastProfit)} /><Metric label={t('avg_daily_revenue')} value={fmt(stats.avg)} /></div>
        <div className="card"><h3>{t('comparison')}</h3><Metric label={t('prev_month_revenue')} value={fmt(stats.previous?.revenue)} /><Metric label={t('revenue_change_pct')} value={pct(revChange)} /><Metric label={t('profit_change_pct')} value={pct(profitChange)} /></div>
        <div className="card"><h3>{t('margins')}</h3><Metric label={t('expense_pct')} value={pct(stats.revenue ? (stats.expenses + stats.salary) / stats.revenue * 100 : 0)} /><Metric label={t('net_margin')} value={pct(stats.revenue ? stats.net / stats.revenue * 100 : 0)} /></div>
        <div className="card"><h3>{t('plan_status')}</h3><Metric label={t('revenue_plan_progress')} value={pct(parseNum(plan.planned_revenue) ? stats.forecastRevenue / parseNum(plan.planned_revenue) * 100 : 0)} /><Metric label={t('profit_plan_progress')} value={pct(parseNum(plan.planned_profit) ? stats.forecastProfit / parseNum(plan.planned_profit) * 100 : 0)} /></div>
      </section>
    </section>
  )
}



function Recipes({ t }) {
  const MENU_CATEGORIES = ['Кофе', 'Напитки', 'Завтраки', 'Выпечка', 'Десерты', 'Салаты', 'Закуски', 'Основные блюда', 'Паста', 'Бургеры / Сэндвичи', 'Комбо', 'Прочее']
  const PURCHASE_UNITS = [
    { value: 'kg', label: 'килограмм (kg)' },
    { value: 'g', label: 'грамм (g)' },
    { value: 'l', label: 'литр (l)' },
    { value: 'ml', label: 'миллилитр (ml)' },
    { value: 'pcs', label: 'штука (pcs)' },
    { value: 'pack', label: 'пачка / упаковка' },
    { value: 'portion', label: 'порция' }
  ]

  const [ingredients, setIngredients] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [recipeItems, setRecipeItems] = useState([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [ingredientForm, setIngredientForm] = useState({ name: '', purchase_unit_quantity: '1', unit: 'kg', purchase_price: '' })
  const [menuForm, setMenuForm] = useState({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
  const [message, setMessage] = useState('')

  useEffect(() => { loadBase() }, [])
  useEffect(() => { if (selectedMenuId) loadRecipeItems(selectedMenuId); else setRecipeItems([]) }, [selectedMenuId])

  async function loadBase() {
    const [{ data: ing }, { data: items }] = await Promise.all([
      supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('name')
    ])
    setIngredients(ing || [])
    setMenuItems(items || [])
    if (!selectedMenuId && items?.[0]) setSelectedMenuId(items[0].id)
  }

  async function loadRecipeItems(menuId = selectedMenuId) {
    if (!menuId) return
    const { data, error } = await supabase
      .from('recipe_items')
      .select('*, ingredients(id,name,unit,purchase_price,purchase_unit_quantity)')
      .eq('menu_item_id', menuId)
      .order('id')
    if (error) setMessage(error.message)
    setRecipeItems(data || [])
  }

  function purchaseUnitLabel(unit) {
    return PURCHASE_UNITS.find(u => u.value === unit)?.label || unit || '—'
  }

  function usageUnit(unit) {
    if (unit === 'kg') return 'g'
    if (unit === 'l') return 'ml'
    return unit || '—'
  }

  function usageUnitLabel(unit) {
    const u = usageUnit(unit)
    if (u === 'g') return 'грамм (g)'
    if (u === 'ml') return 'миллилитр (ml)'
    if (u === 'kg') return 'килограмм (kg)'
    if (u === 'l') return 'литр (l)'
    if (u === 'pcs') return 'штука (pcs)'
    if (u === 'pack') return 'пачка / упаковка'
    if (u === 'portion') return 'порция'
    return u
  }

  function usageToPurchaseQuantity(usageQty, purchaseUnit) {
    const q = parseNum(usageQty)
    if (purchaseUnit === 'kg') return q / 1000
    if (purchaseUnit === 'l') return q / 1000
    return q
  }

  function ingredientPurchaseUnitCost(ingredient) {
    const price = parseNum(ingredient?.purchase_price)
    const purchaseQty = parseNum(ingredient?.purchase_unit_quantity) || 1
    return price / purchaseQty
  }

  function ingredientUsageUnitCost(ingredient) {
    const costPerPurchaseUnit = ingredientPurchaseUnitCost(ingredient)
    if (ingredient?.unit === 'kg' || ingredient?.unit === 'l') return costPerPurchaseUnit / 1000
    return costPerPurchaseUnit
  }

  function recipeLineCost(row) {
    const usageQtyInPurchaseUnit = usageToPurchaseQuantity(row.quantity, row.ingredients?.unit)
    const waste = parseNum(row.waste_percent)
    return ingredientPurchaseUnitCost(row.ingredients) * usageQtyInPurchaseUnit * (1 + waste / 100)
  }

  const selectedMenu = menuItems.find(i => i.id === selectedMenuId)
  const recipeCost = recipeItems.reduce((sum, row) => sum + recipeLineCost(row), 0)
  const salePrice = parseNum(selectedMenu?.sale_price)
  const foodCostPercent = salePrice > 0 ? (recipeCost / salePrice) * 100 : 0
  const grossProfit = salePrice - recipeCost

  async function addIngredient() {
    setMessage('')
    if (!ingredientForm.name.trim()) return setMessage('Введите название ингредиента')
    const { error } = await supabase.from('ingredients').insert({
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit || 'kg',
      purchase_price: parseNum(ingredientForm.purchase_price),
      purchase_unit_quantity: parseNum(ingredientForm.purchase_unit_quantity) || 1
    })
    if (error) return setMessage(error.message)
    setIngredientForm({ name: '', purchase_unit_quantity: '1', unit: 'kg', purchase_price: '' })
    await loadBase()
    setMessage(t('saved'))
  }

  async function updateIngredient(id, patch) {
    setMessage('')
    const { error } = await supabase.from('ingredients').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function deactivateIngredient(id) {
    setMessage('')
    const { error } = await supabase.from('ingredients').update({ is_active: false }).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function addMenuItem() {
    setMessage('')
    if (!menuForm.name.trim()) return setMessage('Введите название блюда')
    const { data, error } = await supabase.from('menu_items').insert({
      name: menuForm.name.trim(),
      category: menuForm.category || null,
      sale_price: parseNum(menuForm.sale_price),
      target_food_cost_percent: parseNum(menuForm.target_food_cost_percent) || 30
    }).select('*').single()
    if (error) return setMessage(error.message)
    setMenuForm({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
    await loadBase()
    if (data?.id) setSelectedMenuId(data.id)
    setMessage(t('saved'))
  }

  async function updateMenuItem(id, patch) {
    setMessage('')
    const { error } = await supabase.from('menu_items').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function deactivateMenuItem(id) {
    setMessage('')
    const { error } = await supabase.from('menu_items').update({ is_active: false }).eq('id', id)
    if (error) return setMessage(error.message)
    await loadBase()
    if (selectedMenuId === id) setSelectedMenuId('')
  }

  async function addRecipeItem() {
    setMessage('')
    if (!selectedMenuId) return setMessage('Сначала выберите блюдо')
    if (!ingredients[0]) return setMessage('Сначала добавьте ингредиент')
    const alreadyUsed = new Set(recipeItems.map(r => r.ingredient_id))
    const ingredient = ingredients.find(i => !alreadyUsed.has(i.id)) || ingredients[0]
    const { error } = await supabase.from('recipe_items').insert({
      menu_item_id: selectedMenuId,
      ingredient_id: ingredient.id,
      quantity: 0,
      waste_percent: 0
    })
    if (error) return setMessage(error.message)
    await loadRecipeItems()
  }

  async function updateRecipeItem(id, patch) {
    setMessage('')
    const { error } = await supabase.from('recipe_items').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadRecipeItems()
  }

  async function deleteRecipeItem(id) {
    setMessage('')
    const { error } = await supabase.from('recipe_items').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await loadRecipeItems()
  }

  function fillCappuccinoExample() {
    setMessage('Пример: кофе = закуп 1 kg за 37 AZN, использование 18 g. Молоко = закуп 1 l за 2.20 AZN, использование 200 ml.')
  }

  return (
    <section>
      <section className="topbar">
        <div>
          <h2>{t('recipes_tab')}</h2>
          <p>Техкарты блюд, ингредиенты, закупочные упаковки, количество использования и food cost.</p>
        </div>
        <button className="ghost small" onClick={fillCappuccinoExample}>Пример каппучино</button>
      </section>

      <section className="grid">
        <div className="card"><h3>Себестоимость</h3><div className="big-number">{fmt(recipeCost)}</div><p className="hint">Себестоимость выбранного блюда</p></div>
        <div className="card"><h3>Цена продажи</h3><div className="big-number">{fmt(salePrice)}</div><p className="hint">Цена в меню</p></div>
        <div className="card"><h3>Food cost</h3><div className={`big-number ${foodCostPercent <= parseNum(selectedMenu?.target_food_cost_percent || 30) ? 'good' : 'bad'}`}>{pct(foodCostPercent)}</div><p className="hint">Цель: {fmt(selectedMenu?.target_food_cost_percent || 30)}%</p></div>
        <div className="card"><h3>Валовая прибыль</h3><div className={`big-number ${grossProfit >= 0 ? 'good' : 'bad'}`}>{fmt(grossProfit)}</div><p className="hint">Цена − себестоимость</p></div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>Состав техкарты</h3>
              <p className="hint">Выбранное блюдо: <strong>{selectedMenu?.name || 'не выбрано'}</strong>. Здесь вводится количество использования в блюде.</p>
            </div>
            <button className="small" onClick={addRecipeItem}>+ Ингредиент в техкарту</button>
          </div>

          <div className="form-grid compact">
            <label><span>Выбрать блюдо</span>
              <select value={selectedMenuId} onChange={e => setSelectedMenuId(e.target.value)}>
                <option value="">Выберите блюдо</option>
                {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ингредиент</th>
                  <th>Кол-во закупа</th>
                  <th>Ед. измерения</th>
                  <th>Цена</th>
                  <th>Кол-во использования</th>
                  <th>Ед.</th>
                  <th>Потери %</th>
                  <th>Себестоимость</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recipeItems.map(row => {
                  const ing = row.ingredients
                  return (
                    <tr key={row.id}>
                      <td>
                        <select value={row.ingredient_id} onChange={e => updateRecipeItem(row.id, { ingredient_id: e.target.value })}>
                          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td>{fmt(ing?.purchase_unit_quantity || 0)}</td>
                      <td>{purchaseUnitLabel(ing?.unit)}</td>
                      <td>{fmt(ing?.purchase_price || 0)}</td>
                      <td><input inputMode="decimal" defaultValue={row.quantity} onBlur={e => updateRecipeItem(row.id, { quantity: parseNum(e.target.value) })} placeholder="18 / 200" /></td>
                      <td>{usageUnitLabel(ing?.unit)}</td>
                      <td><input inputMode="decimal" defaultValue={row.waste_percent} onBlur={e => updateRecipeItem(row.id, { waste_percent: parseNum(e.target.value) })} /></td>
                      <td><strong>{fmt(recipeLineCost(row))}</strong></td>
                      <td><button className="remove" onClick={() => deleteRecipeItem(row.id)}>×</button></td>
                    </tr>
                  )
                })}
                {!recipeItems.length && <tr><td colSpan="9" className="hint">Пока нет ингредиентов в техкарте выбранного блюда.</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="hint">Формула: количество закупа + ед. измерения + цена → количество использования → себестоимость. Например: 1 kg кофе за 37 AZN, использование 18 g = 37 / 1 × 0.018 = 0.666 AZN.</p>
          {message && <p className={`hint ${message === t('saved') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>Блюда / позиции меню</h3>
              <p className="hint">Категория выбирается из списка. Блюдо создаётся один раз, затем выбирается в техкарте.</p>
            </div>
          </div>
          <div className="form-grid compact">
            <label><span>Название блюда</span><input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} placeholder="Cappuccino / Chicken Bowl" /></label>
            <label><span>Категория</span><select value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}>{MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span>Цена продажи</span><input inputMode="decimal" value={menuForm.sale_price} onChange={e => setMenuForm({...menuForm, sale_price: e.target.value})} /></label>
            <label><span>Целевой food cost %</span><input inputMode="decimal" value={menuForm.target_food_cost_percent} onChange={e => setMenuForm({...menuForm, target_food_cost_percent: e.target.value})} /></label>
          </div>
          <button className="small" onClick={addMenuItem}>+ Добавить блюдо</button><br /><br />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Блюдо</th><th>Категория</th><th>Цена</th><th>Цель food cost</th><th></th></tr></thead>
              <tbody>
                {menuItems.map(item => (
                  <tr key={item.id}>
                    <td><button className={selectedMenuId === item.id ? 'primary small' : 'ghost small'} onClick={() => setSelectedMenuId(item.id)}>{item.name}</button></td>
                    <td><select value={item.category || 'Прочее'} onChange={e => updateMenuItem(item.id, { category: e.target.value })}>{MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}{item.category && !MENU_CATEGORIES.includes(item.category) && <option value={item.category}>{item.category}</option>}</select></td>
                    <td><input inputMode="decimal" defaultValue={item.sale_price} onBlur={e => updateMenuItem(item.id, { sale_price: parseNum(e.target.value) })} /></td>
                    <td><input inputMode="decimal" defaultValue={item.target_food_cost_percent} onBlur={e => updateMenuItem(item.id, { target_food_cost_percent: parseNum(e.target.value) })} /></td>
                    <td><button className="remove" onClick={() => deactivateMenuItem(item.id)}>×</button></td>
                  </tr>
                ))}
                {!menuItems.length && <tr><td colSpan="5" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-2">
          <div className="card-head">
            <div>
              <h3>Ингредиенты / закупочные упаковки</h3>
              <p className="hint">Ингредиент записывается один раз. Потом он выбирается из списка в составе техкарты.</p>
            </div>
          </div>

          <div className="form-grid compact">
            <label><span>Ингредиент</span><input value={ingredientForm.name} onChange={e => setIngredientForm({...ingredientForm, name: e.target.value})} placeholder="Кофе / Молоко / Сыр" /></label>
            <label><span>Количество закупа</span><input inputMode="decimal" value={ingredientForm.purchase_unit_quantity} onChange={e => setIngredientForm({...ingredientForm, purchase_unit_quantity: e.target.value})} placeholder="1" /></label>
            <label><span>Ед. измерения</span><select value={ingredientForm.unit} onChange={e => setIngredientForm({...ingredientForm, unit: e.target.value})}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
            <label><span>Цена закупки, AZN</span><input inputMode="decimal" value={ingredientForm.purchase_price} onChange={e => setIngredientForm({...ingredientForm, purchase_price: e.target.value})} placeholder="37" /></label>
          </div>

          <p className="hint">Пример: кофе — количество закупа 1, ед. kg, цена 37. В техкарте использование вводится в g. Молоко — количество закупа 1, ед. l, цена 2.20. В техкарте использование вводится в ml.</p>
          <button className="small" onClick={addIngredient}>+ Добавить ингредиент</button><br /><br />

          <div className="table-wrap">
            <table>
              <thead><tr><th>Ингредиент</th><th>Количество закупа</th><th>Ед. измерения</th><th>Цена</th><th>Цена за 1 ед. использования</th><th></th></tr></thead>
              <tbody>
                {ingredients.map(item => (
                  <tr key={item.id}>
                    <td><input defaultValue={item.name} onBlur={e => updateIngredient(item.id, { name: e.target.value.trim() })} /></td>
                    <td><input inputMode="decimal" defaultValue={item.purchase_unit_quantity} onBlur={e => updateIngredient(item.id, { purchase_unit_quantity: parseNum(e.target.value) || 1 })} /></td>
                    <td><select value={item.unit || 'kg'} onChange={e => updateIngredient(item.id, { unit: e.target.value })}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                    <td><input inputMode="decimal" defaultValue={item.purchase_price} onBlur={e => updateIngredient(item.id, { purchase_price: parseNum(e.target.value) })} /></td>
                    <td>{fmt(ingredientUsageUnitCost(item))} / {usageUnit(item.unit)}</td>
                    <td><button className="remove" onClick={() => deactivateIngredient(item.id)}>×</button></td>
                  </tr>
                ))}
                {!ingredients.length && <tr><td colSpan="6" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
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
