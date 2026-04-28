import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const I18N = {
  ru: {
    system_title:'Система управления сетью', system_short_title:'Система сети', system_subtitle:'Выручка · Финансы · Персонал · Поставщики', dashboard_tab:'Дашборд',
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
    system_title:'Şəbəkə idarəetmə sistemi', system_short_title:'Şəbəkə sistemi', system_subtitle:'Dövriyyə · Maliyyə · Personal · Təchizatçılar', dashboard_tab:'Dashboard',
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
  { id: 'dashboard', key: 'dashboard_tab' },
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
const ADVANCE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000
const canEditAdvance = (row) => row?.created_at ? (Date.now() - new Date(row.created_at).getTime()) <= ADVANCE_EDIT_WINDOW_MS : true
const formatDT = (value) => value ? new Date(value).toLocaleString() : '—'
const calcDailyRate = (emp) => {
  const type = emp?.salary_type || 'monthly'
  return type === 'daily' ? parseNum(emp?.daily_rate) : parseNum(emp?.monthly_salary) / 26
}
const calcGrossSalary = (emp, workedDays) => {
  const type = emp?.salary_type || 'monthly'
  if (type === 'monthly') return parseNum(emp?.monthly_salary)
  return calcDailyRate(emp) * parseNum(workedDays)
}
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
  const [section, setSection] = useState('dashboard')
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
        <DashboardStyles />
        {section === 'dashboard' && <Dashboard t={t} />}
        {section === 'revenue' && <Revenue t={t} />}
        {section === 'finance' && <Finance t={t} lang={lang} />}
        {section === 'recipes' && <Recipes t={t} />}
        {section === 'salaries' && <Salaries t={t} />}
        {section === 'attendance' && <Attendance t={t} />}
        {section === 'advances' && <Advances t={t} />}
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



function DashboardStyles() {
  return <style>{`
    .dashboard-hero { align-items: center; }
    .dashboard-period { min-width: 320px; grid-template-columns: 1fr 1fr; }
    .dashboard-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .dash-kpi { background: linear-gradient(180deg, #fffaf2, #f8f1e3); border: 1px solid var(--line); border-radius: 22px; padding: 18px; box-shadow: 0 12px 30px rgba(23,37,29,.07); display: flex; flex-direction: column; gap: 8px; min-height: 132px; }
    .dash-kpi span { color: var(--muted); font-size: 13px; font-weight: 700; }
    .dash-kpi strong { font-size: 30px; line-height: 1; color: var(--ink); }
    .dash-kpi em { font-style: normal; color: var(--muted); font-size: 12px; }
    .danger-kpi { border-color: rgba(155,45,45,.25); }
    .dash-bars { display: grid; gap: 11px; }
    .dash-bar-row { display: grid; grid-template-columns: 120px 1fr 90px; gap: 10px; align-items: center; }
    .dash-bar-label { font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dash-bar-track { height: 13px; border-radius: 999px; background: #efe8da; overflow: hidden; }
    .dash-bar { height: 100%; border-radius: 999px; background: var(--gold); }
    .dash-bar.negative { background: var(--danger); }
    .dash-bar-value { text-align: right; font-weight: 800; font-size: 12px; }
    .dashboard-table th, .dashboard-table td { white-space: nowrap; }
    .dashboard-insight p { line-height: 1.6; }
    .risk-row { background: rgba(155,45,45,.06); }
    .cancelled-row { opacity: .58; text-decoration: line-through; background: rgba(155,45,45,.07); }
    .cancelled-row input { text-decoration: line-through; }
    @media (max-width: 1200px) { .dashboard-kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media (max-width: 700px) { .dashboard-kpi-grid { grid-template-columns: 1fr; } .dash-bar-row { grid-template-columns: 82px 1fr 78px; } .dashboard-period { min-width: 0; } }
  `}</style>
}

function MiniBarChart({ rows, valueKey = 'revenue', labelKey = 'name', title, subtitle }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(parseNum(r[valueKey]))))
  return <div className="card span-2 dashboard-chart-card">
    <div className="card-head"><div><h3>{title}</h3><p className="hint">{subtitle}</p></div></div>
    <div className="dash-bars">
      {rows.map(r => {
        const val = parseNum(r[valueKey])
        const width = Math.max(3, Math.min(100, Math.abs(val) / max * 100))
        return <div className="dash-bar-row" key={r.id || r[labelKey]}>
          <div className="dash-bar-label">{r[labelKey]}</div>
          <div className="dash-bar-track"><div className={`dash-bar ${val < 0 ? 'negative' : ''}`} style={{width: `${width}%`}} /></div>
          <div className={`dash-bar-value ${val < 0 ? 'bad' : ''}`}>{fmt(val)}</div>
        </div>
      })}
      {!rows.length && <p className="hint">Нет данных для графика.</p>}
    </div>
  </div>
}

function Dashboard({ t }) {
  const TAX_RATE = 8
  const branches = useBranches()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)

  useEffect(() => { load() }, [year, month, branches.length])

  async function calcMonth(y, m) {
    const monthDate = monthStart(y, m)
    const [{ data: revRows }, { data: expRows }, { data: salRows }, { data: supplierRows }] = await Promise.all([
      supabase.from('monthly_branch_revenue').select('*').eq('month', monthDate),
      supabase.from('monthly_branch_expenses').select('*').eq('month', monthDate),
      supabase.from('monthly_branch_salary').select('*').eq('month', monthDate),
      supabase.from('supplier_balances_v2').select('*')
    ])
    const revByBranch = new Map((revRows || []).map(r => [r.branch_id, r]))
    const expByBranch = new Map((expRows || []).map(r => [r.branch_id, r]))
    const salByBranch = new Map((salRows || []).map(r => [r.branch_id, r]))
    const branchRows = branches.map(b => {
      const rev = revByBranch.get(b.id) || {}
      const revenue = parseNum(rev.total_revenue)
      const expenses = parseNum(expByBranch.get(b.id)?.total_expenses)
      const salary = parseNum(salByBranch.get(b.id)?.total_salary)
      const tax = revenue * TAX_RATE / 100
      const net = revenue - expenses - salary - tax
      return { id: b.id, name: b.name, revenue, expenses, salary, tax, totalExpenses: expenses + salary + tax, net, margin: revenue ? net / revenue * 100 : 0 }
    })
    const revenue = branchRows.reduce((s, r) => s + r.revenue, 0)
    const expenses = branchRows.reduce((s, r) => s + r.totalExpenses, 0)
    const net = branchRows.reduce((s, r) => s + r.net, 0)
    const supplierDebt = (supplierRows || []).reduce((s, r) => s + Math.max(0, parseNum(r.balance)), 0)
    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avgRevenue = passed ? revenue / passed : 0
    const forecastRevenue = avgRevenue * daysInMonth(y, m)
    const expenseRate = revenue ? expenses / revenue : 0
    const forecastProfit = forecastRevenue - forecastRevenue * expenseRate
    return { revenue, expenses, net, supplierDebt, branchRows, forecastRevenue, forecastProfit }
  }

  async function load() {
    const current = await calcMonth(year, month)
    const pm = prevMonth(year, month)
    const previous = await calcMonth(pm.year, pm.month)
    setData({ ...current, previous })
  }

  if (!data) return <div className="module-placeholder">{t('loading')}</div>
  const revenueChange = data.previous?.revenue ? (data.revenue - data.previous.revenue) / data.previous.revenue * 100 : 0
  const profitChange = data.previous?.net ? (data.net - data.previous.net) / Math.abs(data.previous.net) * 100 : 0
  const debtRows = [{ name: 'Долги поставщикам', value: data.supplierDebt }]
  return <section id="dashboardPage">
    <section className="topbar dashboard-hero"><div><h2>Финансовое состояние сети</h2><p>Выручка, расходы, прибыль, прогноз, динамика и долги поставщикам по всей сети.</p></div><div className="form-grid compact dashboard-period"><label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label><label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label></div></section>
    <section className="dashboard-kpi-grid"><div className="dash-kpi"><span>Выручка сети</span><strong>{fmt(data.revenue)}</strong><em className={revenueChange >= 0 ? 'good' : 'bad'}>{revenueChange >= 0 ? '▲' : '▼'} {pct(Math.abs(revenueChange))} к прошлому месяцу</em></div><div className="dash-kpi"><span>Расходы сети</span><strong>{fmt(data.expenses)}</strong><em>включая зарплаты и налог 8%</em></div><div className="dash-kpi"><span>Чистая прибыль</span><strong className={data.net >= 0 ? 'good' : 'bad'}>{fmt(data.net)}</strong><em className={profitChange >= 0 ? 'good' : 'bad'}>{profitChange >= 0 ? '▲' : '▼'} {pct(Math.abs(profitChange))} к прошлому месяцу</em></div><div className="dash-kpi"><span>Прогноз прибыли</span><strong className={data.forecastProfit >= 0 ? 'good' : 'bad'}>{fmt(data.forecastProfit)}</strong><em>прогноз до конца месяца</em></div><div className="dash-kpi danger-kpi"><span>Долги поставщикам</span><strong>{fmt(data.supplierDebt)}</strong><em>общий открытый баланс</em></div></section>
    <section className="grid dashboard-grid"><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.revenue - a.revenue)} valueKey="revenue" title="Выручка по филиалам" subtitle="Сравнение филиалов за выбранный месяц" /><MiniBarChart rows={data.branchRows.filter(r => r.revenue || r.net).sort((a,b) => b.net - a.net)} valueKey="net" title="Прибыль по филиалам" subtitle="После расходов, зарплат и налога" /><div className="card span-2"><div className="card-head"><h3>Сводка по филиалам</h3></div><div className="table-wrap"><table className="dashboard-table"><thead><tr><th>Филиал</th><th>Выручка</th><th>Расходы</th><th>Зарплаты</th><th>Налог</th><th>Прибыль</th><th>Маржа</th></tr></thead><tbody>{data.branchRows.map(r => <tr key={r.id} className={r.net < 0 ? 'risk-row' : ''}><td><b>{r.name}</b></td><td>{fmt(r.revenue)}</td><td>{fmt(r.expenses)}</td><td>{fmt(r.salary)}</td><td>{fmt(r.tax)}</td><td className={r.net >= 0 ? 'good' : 'bad'}><b>{fmt(r.net)}</b></td><td>{pct(r.margin)}</td></tr>)}</tbody></table></div></div><MiniBarChart rows={debtRows} valueKey="value" title="Долги поставщикам" subtitle="Открытые обязательства перед поставщиками" /><div className="card span-2 dashboard-insight"><h3>Краткий вывод</h3><p>Сеть сейчас показывает <b className={data.net >= 0 ? 'good' : 'bad'}>{data.net >= 0 ? 'прибыль' : 'убыток'} {fmt(data.net)} AZN</b>. Прогноз до конца месяца: <b>{fmt(data.forecastRevenue)} AZN выручки</b> и <b className={data.forecastProfit >= 0 ? 'good' : 'bad'}>{fmt(data.forecastProfit)} AZN прибыли</b>.</p><p className="hint">Динамика сравнивается с прошлым календарным месяцем. Если нужен “аналогичный период” строго день-в-день, следующим шагом добавим сравнение текущего периода с тем же количеством дней прошлого месяца.</p></div></section>
  </section>
}

function Finance({ t, lang }) {
  const ALL_BRANCHES = '__all__'
  const TAX_RATE = 8
  const branches = useBranches()
  const now = new Date()
  const [branchId, setBranchId] = useState(ALL_BRANCHES)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => { load() }, [branchId, year, month, branches.length])

  async function calcFor(branch, y, m) {
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

    const tax = revenue * (TAX_RATE / 100)
    const net = revenue - expenses - salary - tax

    const d = new Date(Number(y), Number(m) - 1, 1)
    const current = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
    const passed = current ? now.getDate() : daysInMonth(y, m)
    const avg = passed ? revenue / passed : 0
    const forecastRevenue = avg * daysInMonth(y, m)
    const costRate = revenue > 0 ? (expenses + salary) / revenue : 0
    const forecastProfit = forecastRevenue - (forecastRevenue * costRate) - (forecastRevenue * TAX_RATE / 100)

    return { revenue, expenses, salary, cash, bank, wolt, tax, gross: revenue, net, avg, forecastRevenue, forecastProfit }
  }

  async function load() {
    if (branchId !== ALL_BRANCHES && !branchId) return

    const monthDate = monthStart(year, month)

    const current = await calcFor(branchId, year, month)
    const pm = prevMonth(year, month)
    const previous = await calcFor(branchId, pm.year, pm.month)
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
    const expenseRows = [...map.entries()].map(([name, amount]) => ({ name, amount }))
    if (current.tax > 0) expenseRows.push({ name: `Налог %`, amount: current.tax })
    setBreakdown(expenseRows.sort((a, b) => b.amount - a.amount))
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
          </div>
          <p className="hint">Налог {TAX_RATE}% считается автоматически от выручки. В общем режиме налог считается по каждому ресторану и суммируется.</p>
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
          <Metric label={t('total_expenses')} value={fmt(stats.expenses + stats.salary + stats.tax)} />
          <Metric label="Операционные расходы" value={fmt(stats.expenses)} />
          <Metric label="Зарплаты" value={fmt(stats.salary)} />
          <Metric label={`Налог ${TAX_RATE}%`} value={fmt(stats.tax)} />
        </div>

        <div className="card"><h3>{t('net_profit')}</h3><div className="big-number">{fmt(stats.net)}</div><p className={`hint ${stats.net >= 0 ? 'good' : 'bad'}`}>{stats.net >= 0 ? t('profitable') : t('loss')}</p></div>
        <div className="card"><h3>{t('forecast')}</h3><Metric label={t('forecast_revenue')} value={fmt(stats.forecastRevenue)} /><Metric label={t('forecast_profit')} value={fmt(stats.forecastProfit)} /><Metric label={t('avg_daily_revenue')} value={fmt(stats.avg)} /></div>
        <div className="card"><h3>{t('comparison')}</h3><Metric label={t('prev_month_revenue')} value={fmt(stats.previous?.revenue)} /><Metric label={t('revenue_change_pct')} value={pct(revChange)} /><Metric label={t('profit_change_pct')} value={pct(profitChange)} /></div>
        <div className="card"><h3>{t('margins')}</h3><Metric label={t('expense_pct')} value={pct(stats.revenue ? (stats.expenses + stats.salary + stats.tax) / stats.revenue * 100 : 0)} /><Metric label={t('net_margin')} value={pct(stats.revenue ? stats.net / stats.revenue * 100 : 0)} /></div>
      </section>
    </section>
  )
}



const PRODUCT_CATEGORIES = ['Кофе', 'Молоко / dairy', 'Сиропы', 'Бар', 'Кухня', 'Мясо', 'Рыба', 'Овощи', 'Фрукты', 'Бакалея', 'Выпечка', 'Упаковка', 'Хозтовары', 'Прочее']
const MENU_CATEGORIES = ['Кофе', 'Напитки', 'Завтраки', 'Выпечка', 'Десерты', 'Салаты', 'Закуски', 'Основные блюда', 'Паста', 'Бургеры / Сэндвичи', 'Комбо', 'Прочее']
const BASE_UNITS = [
  { value: 'g', label: 'грамм (g)' },
  { value: 'ml', label: 'миллилитр (ml)' },
  { value: 'pcs', label: 'штука (pcs)' }
]
const PURCHASE_UNITS = [
  { value: 'kg', label: 'килограмм (kg)' },
  { value: 'g', label: 'грамм (g)' },
  { value: 'l', label: 'литр (l)' },
  { value: 'ml', label: 'миллилитр (ml)' },
  { value: 'pcs', label: 'штука (pcs)' },
  { value: 'pack', label: 'пачка / упаковка' }
]

function unitLabel(unit) {
  return [...BASE_UNITS, ...PURCHASE_UNITS].find(u => u.value === unit)?.label || unit || '—'
}

function convertToBase(quantity, fromUnit, baseUnit) {
  const q = parseNum(quantity)
  if (baseUnit === 'g') {
    if (fromUnit === 'kg') return q * 1000
    if (fromUnit === 'g') return q
  }
  if (baseUnit === 'ml') {
    if (fromUnit === 'l') return q * 1000
    if (fromUnit === 'ml') return q
  }
  if (baseUnit === 'pcs') return q
  return q
}

function Recipes({ t }) {
  const [products, setProducts] = useState([])
  const [costs, setCosts] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [recipeItems, setRecipeItems] = useState([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(PRODUCT_CATEGORIES[0])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productForm, setProductForm] = useState({ name: '', category: PRODUCT_CATEGORIES[0], base_unit: 'g' })
  const [menuForm, setMenuForm] = useState({ name: '', category: 'Кофе', sale_price: '', target_food_cost_percent: '30' })
  const [message, setMessage] = useState('')

  useEffect(() => { loadBase() }, [])
  useEffect(() => { if (selectedMenuId) loadRecipeItems(selectedMenuId); else setRecipeItems([]) }, [selectedMenuId])
  useEffect(() => {
    const first = products.find(p => (p.category || 'Прочее') === selectedCategory)
    setSelectedProductId(first?.id || '')
  }, [selectedCategory, products])

  async function loadBase() {
    const [{ data: prod }, { data: item }, { data: latest }] = await Promise.all([
      supabase.from('supplier_products').select('*').eq('is_active', true).order('category').order('name'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('name'),
      supabase.from('latest_product_costs').select('*')
    ])
    setProducts(prod || [])
    setMenuItems(item || [])
    setCosts(latest || [])
    if (!selectedMenuId && item?.[0]) setSelectedMenuId(item[0].id)
  }

  async function loadRecipeItems(menuId = selectedMenuId) {
    if (!menuId) return
    const { data, error } = await supabase
      .from('recipe_items')
      .select('*, supplier_products(id,name,category,base_unit)')
      .eq('menu_item_id', menuId)
      .order('id')
    if (error) setMessage(error.message)
    setRecipeItems(data || [])
  }

  function productCost(productId) {
    return costs.find(c => c.product_id === productId)
  }

  function lineCost(row) {
    const cost = productCost(row.product_id)
    const unitPrice = parseNum(cost?.price_per_base_unit)
    const waste = parseNum(row.waste_percent)
    return parseNum(row.quantity) * unitPrice * (1 + waste / 100)
  }

  const filteredProducts = products.filter(p => (p.category || 'Прочее') === selectedCategory)
  const selectedMenu = menuItems.find(i => i.id === selectedMenuId)
  const recipeCost = recipeItems.reduce((sum, row) => sum + lineCost(row), 0)
  const salePrice = parseNum(selectedMenu?.sale_price)
  const foodCostPercent = salePrice > 0 ? (recipeCost / salePrice) * 100 : 0
  const grossProfit = salePrice - recipeCost

  async function addProduct() {
    setMessage('')
    if (!productForm.name.trim()) return setMessage('Введите название товара')
    const { data, error } = await supabase.from('supplier_products').insert({
      name: productForm.name.trim(),
      category: productForm.category,
      base_unit: productForm.base_unit
    }).select('*').single()
    if (error) return setMessage(error.message)
    setProductForm({ name: '', category: productForm.category, base_unit: productForm.base_unit })
    await loadBase()
    setSelectedCategory(data?.category || productForm.category)
    setSelectedProductId(data?.id || '')
    setMessage(t('saved'))
  }

  async function updateProduct(id, patch) {
    setMessage('')
    const { error } = await supabase.from('supplier_products').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await loadBase()
  }

  async function deactivateProduct(id) {
    setMessage('')
    const { error } = await supabase.from('supplier_products').update({ is_active: false }).eq('id', id)
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
    if (!selectedProductId) return setMessage('Выберите категорию и товар')
    const { error } = await supabase.from('recipe_items').insert({
      menu_item_id: selectedMenuId,
      product_id: selectedProductId,
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

  return (
    <section>
      <section className="topbar">
        <div>
          <h2>{t('recipes_tab')}</h2>
          <p>Техкарты блюд. Товар выбирается из справочника поставщиков, а себестоимость берётся по последней закупке.</p>
        </div>
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
            <label><span>Категория товара</span>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label><span>Товар / ингредиент</span>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                <option value="">Выберите товар</option>
                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Товар</th>
                  <th>Кол-во использования</th>
                  <th>Ед.</th>
                  <th>Потери %</th>
                  <th>Цена за 1 ед.</th>
                  <th>Себестоимость</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recipeItems.map(row => {
                  const product = row.supplier_products
                  const cost = productCost(row.product_id)
                  return (
                    <tr key={row.id}>
                      <td>{product?.category || '—'}</td>
                      <td>
                        <select value={row.product_id || ''} onChange={e => updateRecipeItem(row.id, { product_id: e.target.value })}>
                          {products.map(p => <option key={p.id} value={p.id}>{p.category} · {p.name}</option>)}
                        </select>
                      </td>
                      <td><input inputMode="decimal" defaultValue={row.quantity} onBlur={e => updateRecipeItem(row.id, { quantity: parseNum(e.target.value) })} placeholder="18 / 200" /></td>
                      <td>{unitLabel(product?.base_unit)}</td>
                      <td><input inputMode="decimal" defaultValue={row.waste_percent} onBlur={e => updateRecipeItem(row.id, { waste_percent: parseNum(e.target.value) })} /></td>
                      <td>{cost ? `${fmt(cost.price_per_base_unit)} / ${cost.base_unit}` : 'нет закупки'}</td>
                      <td><strong>{fmt(lineCost(row))}</strong></td>
                      <td><button className="remove" onClick={() => deleteRecipeItem(row.id)}>×</button></td>
                    </tr>
                  )
                })}
                {!recipeItems.length && <tr><td colSpan="8" className="hint">Пока нет ингредиентов в техкарте выбранного блюда.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="hint">Пример: Cappuccino = молоко 200 ml + кофе 18 g. Цена берётся из последней закупки товара у поставщика.</p>
          {message && <p className={`hint ${message === t('saved') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Блюда / позиции меню</h3><p className="hint">Блюдо создаётся один раз, затем выбирается в техкарте.</p></div></div>
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
                    <td><select value={item.category || 'Прочее'} onChange={e => updateMenuItem(item.id, { category: e.target.value })}>{MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
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
          <div className="card-head"><div><h3>Товары / ингредиенты</h3><p className="hint">Это единый справочник. Эти же товары используются в закупках поставщиков и в техкартах.</p></div></div>
          <div className="form-grid compact">
            <label><span>Название товара</span><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Молоко / Кофе / Сыр" /></label>
            <label><span>Категория</span><select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span>Базовая ед. использования</span><select value={productForm.base_unit} onChange={e => setProductForm({...productForm, base_unit: e.target.value})}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
          </div>
          <button className="small" onClick={addProduct}>+ Добавить товар</button><br /><br />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Категория</th><th>Товар</th><th>Базовая ед.</th><th>Последняя цена за ед.</th><th></th></tr></thead>
              <tbody>
                {products.map(item => {
                  const cost = productCost(item.id)
                  return (
                    <tr key={item.id}>
                      <td><select value={item.category || 'Прочее'} onChange={e => updateProduct(item.id, { category: e.target.value })}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td><input defaultValue={item.name} onBlur={e => updateProduct(item.id, { name: e.target.value.trim() })} /></td>
                      <td><select value={item.base_unit || 'g'} onChange={e => updateProduct(item.id, { base_unit: e.target.value })}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                      <td>{cost ? `${fmt(cost.price_per_base_unit)} / ${cost.base_unit}` : 'нет закупки'}</td>
                      <td><button className="remove" onClick={() => deactivateProduct(item.id)}>×</button></td>
                    </tr>
                  )
                })}
                {!products.length && <tr><td colSpan="5" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}

function Attendance({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [message, setMessage] = useState('')
  const [employeeForm, setEmployeeForm] = useState({ full_name: '', position: '', branch_id: '', monthly_salary: '' })

  useEffect(() => { if (!employeeForm.branch_id && branches[0]) setEmployeeForm(f => ({ ...f, branch_id: branches[0].id })) }, [branches])
  useEffect(() => { load() }, [year, month, branchId])

  const dim = daysInMonth(year, month)
  const monthDate = monthStart(year, month)
  const days = Array.from({ length: dim }, (_, i) => i + 1)
  const DAILY_DIVISOR = 26

  async function load() {
    let empQuery = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')
    if (branchId !== 'all') empQuery = empQuery.eq('branch_id', branchId)

    const start = monthDate
    const end = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
    const attQuery = supabase.from('employee_attendance').select('*').gte('work_date', start).lte('work_date', end)

    const [{ data: emp }, { data: att }] = await Promise.all([empQuery, attQuery])
    setEmployees(emp || [])
    setAttendance(att || [])
  }

  function recordFor(employeeId, day) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return attendance.find(a => a.employee_id === employeeId && a.work_date === date) || null
  }

  function valueFor(employeeId, day) {
    const record = recordFor(employeeId, day)
    return record ? parseNum(record.value) : null
  }

  function workedDays(employeeId) {
    return days.reduce((s, d) => s + parseNum(valueFor(employeeId, d)), 0)
  }

  function dailyRate(emp) {
    return calcDailyRate(emp)
  }

  function calcSalary(emp, worked) {
    return calcGrossSalary(emp, worked)
  }

  async function addEmployee() {
    setMessage('')
    if (!employeeForm.full_name.trim()) return setMessage('Введите имя сотрудника')
    const monthlySalary = parseNum(employeeForm.monthly_salary)
    const { data, error } = await supabase.from('employees').insert({
      full_name: employeeForm.full_name.trim(),
      position: employeeForm.position.trim() || null,
      branch_id: employeeForm.branch_id || null,
      salary_type: 'monthly',
      monthly_salary: monthlySalary,
      daily_rate: monthlySalary / DAILY_DIVISOR
    }).select('*, branches(name)').single()
    if (error) return setMessage(error.message)
    setEmployeeForm(f => ({ ...f, full_name: '', position: '', monthly_salary: '' }))
    if (data) await syncSalaryForEmployee(data)
    await load()
    setMessage('Сотрудник добавлен. Он уже доступен в зарплатах и авансах.')
  }

  async function updateEmployee(id, patch) {
    setMessage('')
    const payload = { ...patch }
    if ('monthly_salary' in payload) {
      payload.monthly_salary = parseNum(payload.monthly_salary)
      payload.daily_rate = payload.monthly_salary / DAILY_DIVISOR
      payload.salary_type = 'monthly'
    }
    const { error } = await supabase.from('employees').update(payload).eq('id', id)
    if (error) setMessage(error.message)
    else {
      await load()
      setMessage(t('saved'))
    }
  }

  function nextAttendanceValue(currentValue) {
    if (currentValue === null || currentValue === undefined || currentValue === '') return 1
    const value = parseNum(currentValue)
    if (value === 1) return 0.5
    if (value === 0.5) return 0
    return null
  }

  async function setAttendanceValue(emp, day, rawValue) {
    setMessage('')
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (rawValue === null) {
      const { error } = await supabase.from('employee_attendance').delete().eq('employee_id', emp.id).eq('work_date', workDate)
      if (error) { setMessage(error.message); return }
    } else {
      const value = parseNum(rawValue)
      const { error } = await supabase.from('employee_attendance').upsert({
        employee_id: emp.id,
        branch_id: emp.branch_id || null,
        work_date: workDate,
        value
      }, { onConflict: 'employee_id,work_date' })
      if (error) { setMessage(error.message); return }
    }

    await load()
    await syncSalaryForEmployee(emp)
  }

  async function syncSalaryForEmployee(emp) {
    const start = monthDate
    const end = year + '-' + String(month).padStart(2, '0') + '-' + String(dim).padStart(2, '0')
    const { data: monthAttendance } = await supabase.from('employee_attendance').select('value').eq('employee_id', emp.id).gte('work_date', start).lte('work_date', end)
    const worked = (monthAttendance || []).reduce((s, r) => s + parseNum(r.value), 0)
    const monthlySalary = parseNum(emp.monthly_salary)
    const gross = calcGrossSalary(emp, worked)

    const [{ data: existing }, { data: advanceRows }] = await Promise.all([
      supabase.from('salary_periods').select('*').eq('employee_id', emp.id).eq('salary_month', monthDate).maybeSingle(),
      supabase.from('salary_advances').select('amount').eq('employee_id', emp.id).gte('advance_date', start).lte('advance_date', end).or('is_cancelled.is.null,is_cancelled.eq.false')
    ])
    const advance = (advanceRows || []).reduce((sum, row) => sum + parseNum(row.amount), 0)
    const deduction = parseNum(existing?.deduction_amount)
    const net = gross - advance - deduction

    const { error } = await supabase.from('salary_periods').upsert({
      employee_id: emp.id,
      branch_id: emp.branch_id || null,
      salary_month: monthDate,
      worked_days: worked,
      salary_gross: gross,
      salary_net: net,
      advance_amount: advance,
      deduction_amount: deduction,
      card_payment: parseNum(existing?.card_payment),
      cash_payment: parseNum(existing?.cash_payment),
      comment: existing?.comment || `Авторасчёт из табеля: ${worked} дн. × ${fmt(calcDailyRate(emp))} AZN`
    }, { onConflict: 'employee_id,salary_month' })
    if (error) setMessage(error.message)
  }

  async function syncAllSalaries() {
    setMessage('')
    for (const emp of employees) await syncSalaryForEmployee(emp)
    setMessage('Зарплаты пересчитаны по табелю')
  }

  const totals = employees.reduce((acc, emp) => {
    const worked = workedDays(emp.id)
    const salary = calcSalary(emp, worked)
    acc.days += worked
    acc.salary += salary
    return acc
  }, { days: 0, salary: 0 })

  return (
    <section>
      <section className="topbar"><div><h2>{t('attendance_tab')}</h2><p>Компактный табель: клик по дню переключает значение. Зарплата считается как месячная ставка / 26 × отработанные дни.</p></div></section>
      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><div><h3>Период и филиал</h3><p className="hint">Клик по ячейке: пусто → 1 → 0.5 → 0 → пусто.</p></div><button className="small" onClick={syncAllSalaries}>Пересчитать зарплаты</button></div>
          <div className="form-grid compact">
            <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
            <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <label><span>Филиал</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Формула дневной ставки</span><input value="Месячная ставка / 26" readOnly /></label>
          </div>
          <div className="metric"><span>Итого рабочих дней</span><strong>{fmt(totals.days)}</strong></div>
          <div className="metric"><span>Расчётная зарплата</span><strong>{fmt(totals.salary)}</strong></div>
          {message && <p className={`hint ${message.includes('Сохран') || message.includes('пересчитаны') || message.includes('добавлен') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Добавить сотрудника</h3><p className="hint">После добавления сотрудник сразу появляется в разделах “Зарплаты” и “Авансы”.</p></div></div>
          <div className="form-grid compact">
            <label style={{ gridColumn: 'span 2' }}><span>И.Ф.О.</span><input value={employeeForm.full_name} onChange={e => setEmployeeForm({...employeeForm, full_name: e.target.value})} /></label>
            <label><span>Должность</span><input value={employeeForm.position} onChange={e => setEmployeeForm({...employeeForm, position: e.target.value})} /></label>
            <label><span>Филиал</span><select value={employeeForm.branch_id} onChange={e => setEmployeeForm({...employeeForm, branch_id: e.target.value})}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Месячная ставка</span><input inputMode="decimal" value={employeeForm.monthly_salary} onChange={e => setEmployeeForm({...employeeForm, monthly_salary: e.target.value})} /></label>
            <label><span>Дневная ставка</span><input value={fmt(parseNum(employeeForm.monthly_salary) / DAILY_DIVISOR)} readOnly /></label>
          </div>
          <button className="small" onClick={addEmployee}>+ Добавить сотрудника</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Табель посещаемости</h3><p className="hint">Ячейки уменьшены. Ф.И.О. расширено. Значение выбирается кликом.</p></div></div>
          <div className="table-wrap">
            <table style={{ fontSize: 11, tableLayout: 'auto' }}>
              <thead><tr><th style={{ minWidth: 70 }}>Филиал</th><th style={{ minWidth: 95 }}>Должность</th><th style={{ minWidth: 230 }}>И.Ф.О.</th><th style={{ minWidth: 80 }}>Мес. ставка</th><th style={{ minWidth: 75 }}>День</th>{days.map(d => <th key={d} style={{ width: 30, minWidth: 30, textAlign: 'center' }}>{d}</th>)}<th style={{ minWidth: 48 }}>Дни</th><th style={{ minWidth: 80 }}>ЗП</th></tr></thead>
              <tbody>
                {employees.map(emp => {
                  const worked = workedDays(emp.id)
                  const salary = calcSalary(emp, worked)
                  return <tr key={emp.id}>
                    <td>{emp.branches?.name || '—'}</td>
                    <td><input style={{ minWidth: 90, padding: '6px 7px' }} defaultValue={emp.position || ''} onBlur={e => updateEmployee(emp.id, { position: e.target.value.trim() || null })} /></td>
                    <td><input style={{ minWidth: 220, padding: '6px 7px' }} defaultValue={emp.full_name} onBlur={e => updateEmployee(emp.id, { full_name: e.target.value.trim() })} /></td>
                    <td><input style={{ minWidth: 78, padding: '6px 7px' }} inputMode="decimal" defaultValue={emp.monthly_salary} onBlur={e => updateEmployee(emp.id, { monthly_salary: e.target.value })} /></td>
                    <td>{fmt(dailyRate(emp))}</td>
                    {days.map(d => {
                      const currentValue = valueFor(emp.id, d)
                      const label = currentValue === null ? '' : String(currentValue)
                      return <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                        <button
                          type="button"
                          title="Клик: пусто → 1 → 0.5 → 0 → пусто"
                          onClick={() => setAttendanceValue(emp, d, nextAttendanceValue(currentValue))}
                          style={{ width: 26, minWidth: 26, height: 24, padding: 0, borderRadius: 6, fontSize: 11 }}
                          className={label === '1' ? 'primary' : label === '0.5' ? 'ghost' : label === '0' ? 'danger' : 'ghost'}
                        >{label}</button>
                      </td>
                    })}
                    <td><strong>{fmt(worked)}</strong></td>
                    <td><strong>{fmt(salary)}</strong></td>
                  </tr>
                })}
                {!employees.length && <tr><td colSpan={days.length + 7} className="hint">Сначала добавьте сотрудников.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  )
}

function Salaries({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [rows, setRows] = useState([])
  const [message, setMessage] = useState('')
  const [employeeInfoId, setEmployeeInfoId] = useState('')
  const [employeeFiles, setEmployeeFiles] = useState({})
  const [uploadType, setUploadType] = useState('document')
  const DAILY_DIVISOR = 26

  useEffect(() => { load() }, [year, month, branchId])

  const monthDate = monthStart(year, month)
  const dim = daysInMonth(year, month)
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`

  function emptySalary(emp, advanceTotal = 0) {
    const gross = calcGrossSalary(emp, 0)
    return {
      id: null,
      employee_id: emp.id,
      branch_id: emp.branch_id,
      employees: emp,
      branches: emp.branches,
      worked_days: 0,
      salary_gross: gross,
      advance_amount: advanceTotal,
      deduction_amount: 0,
      salary_net: gross - advanceTotal,
      card_payment: 0,
      cash_payment: 0,
      comment: ''
    }
  }

  async function loadEmployeeFiles(employeeIds) {
    if (!employeeIds.length) { setEmployeeFiles({}); return }
    const { data, error } = await supabase
      .from('employee_files')
      .select('*')
      .in('employee_id', employeeIds)
      .order('created_at', { ascending: false })

    if (error) {
      // If the migration has not been executed yet, the salaries screen should still work.
      setEmployeeFiles({})
      return
    }

    const grouped = {}
    ;(data || []).forEach(f => {
      if (!grouped[f.employee_id]) grouped[f.employee_id] = []
      grouped[f.employee_id].push(f)
    })
    setEmployeeFiles(grouped)
  }

  async function load() {
    setMessage('')
    let empQ = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')
    if (branchId !== 'all') empQ = empQ.eq('branch_id', branchId)

    let salQ = supabase.from('salary_periods').select('*, employees(*), branches(name)').eq('salary_month', monthDate).order('branch_id')
    if (branchId !== 'all') salQ = salQ.eq('branch_id', branchId)

    let advQ = supabase.from('salary_advances').select('employee_id, amount, branch_id').gte('advance_date', monthDate).lte('advance_date', monthEnd).or('is_cancelled.is.null,is_cancelled.eq.false')
    if (branchId !== 'all') advQ = advQ.eq('branch_id', branchId)

    const [{ data: emp, error: empError }, { data: sal, error: salError }, { data: adv, error: advError }] = await Promise.all([empQ, salQ, advQ])
    if (empError || salError || advError) {
      setMessage(empError?.message || salError?.message || advError?.message)
      return
    }

    const advancesByEmployee = new Map()
    ;(adv || []).forEach(a => advancesByEmployee.set(a.employee_id, parseNum(advancesByEmployee.get(a.employee_id)) + parseNum(a.amount)))
    const salaryByEmployee = new Map((sal || []).map(r => [r.employee_id, r]))

    const mappedRows = (emp || []).map(e => {
      const advanceTotal = parseNum(advancesByEmployee.get(e.id))
      const salary = salaryByEmployee.get(e.id) || emptySalary(e, advanceTotal)
      const employees = { ...e, ...(salary.employees || {}) }
      const gross = salary.id ? parseNum(salary.salary_gross) : calcGrossSalary(employees, salary.worked_days)
      const deduction = parseNum(salary.deduction_amount)
      const net = gross - advanceTotal - deduction
      return { ...salary, employees, branches: e.branches || salary.branches, branch_id: e.branch_id, salary_gross: gross, advance_amount: advanceTotal, salary_net: net }
    })

    setRows(mappedRows)
    await loadEmployeeFiles(mappedRows.map(r => r.employee_id))
  }

  async function recalcSalaryRow(row, updatedEmployee = row.employees, patch = {}) {
    const workedDays = 'worked_days' in patch ? parseNum(patch.worked_days) : parseNum(row.worked_days)
    const gross = 'salary_gross' in patch ? parseNum(patch.salary_gross) : calcGrossSalary(updatedEmployee, workedDays)
    const advance = parseNum(row.advance_amount)
    const deduction = 'deduction_amount' in patch ? parseNum(patch.deduction_amount) : parseNum(row.deduction_amount)
    const payload = {
      employee_id: row.employee_id,
      branch_id: row.branch_id || null,
      salary_month: monthDate,
      worked_days: workedDays,
      salary_gross: gross,
      advance_amount: advance,
      deduction_amount: deduction,
      salary_net: gross - advance - deduction,
      card_payment: 'card_payment' in patch ? parseNum(patch.card_payment) : parseNum(row.card_payment),
      cash_payment: 'cash_payment' in patch ? parseNum(patch.cash_payment) : parseNum(row.cash_payment),
      comment: 'comment' in patch ? patch.comment : (row.comment || '')
    }
    const { error } = await supabase.from('salary_periods').upsert(payload, { onConflict: 'employee_id,salary_month' })
    return error
  }

  async function updateEmployeeDetails(row, patch, recalc = false) {
    setMessage('')
    const payload = { ...patch }
    if ('monthly_salary' in payload) payload.monthly_salary = parseNum(payload.monthly_salary)
    if ('daily_rate' in payload) payload.daily_rate = parseNum(payload.daily_rate)

    if (payload.salary_type === 'daily' && !parseNum(row.employees?.daily_rate)) {
      payload.daily_rate = parseNum(row.employees?.monthly_salary) / DAILY_DIVISOR
    }
    if (payload.salary_type === 'monthly') {
      payload.daily_rate = parseNum(row.employees?.monthly_salary) / DAILY_DIVISOR
    }

    const { error } = await supabase.from('employees').update(payload).eq('id', row.employee_id)
    if (error) return setMessage(error.message)

    if (recalc || 'salary_type' in payload || 'monthly_salary' in payload || 'daily_rate' in payload) {
      const updatedEmployee = { ...row.employees, ...payload }
      const salaryError = await recalcSalaryRow(row, updatedEmployee)
      if (salaryError) return setMessage(salaryError.message)
    }

    await load()
    setMessage(t('saved'))
  }

  async function updateSalary(row, patch) {
    setMessage('')
    const payload = { ...patch }
    ;['worked_days','salary_gross','card_payment','cash_payment','deduction_amount'].forEach(k => { if (k in payload) payload[k] = parseNum(payload[k]) })
    const error = await recalcSalaryRow(row, row.employees, payload)
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  async function uploadEmployeeFile(row, file) {
    if (!file) return
    setMessage('')
    const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_')
    const path = `${row.employee_id}/${Date.now()}_${safeName}`
    const { error: uploadError } = await supabase.storage.from('employee-files').upload(path, file, { upsert: false })
    if (uploadError) return setMessage(uploadError.message)

    const { error } = await supabase.from('employee_files').insert({
      employee_id: row.employee_id,
      file_type: uploadType,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size || null
    })
    if (error) return setMessage(error.message)
    await loadEmployeeFiles(rows.map(r => r.employee_id))
    setMessage('Файл добавлен')
  }

  async function openEmployeeFile(file) {
    const { data, error } = await supabase.storage.from('employee-files').createSignedUrl(file.storage_path, 60)
    if (error) return setMessage(error.message)
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteEmployeeFile(file) {
    if (!confirm('Удалить файл из карточки сотрудника?')) return
    setMessage('')
    await supabase.storage.from('employee-files').remove([file.storage_path])
    const { error } = await supabase.from('employee_files').delete().eq('id', file.id)
    if (error) return setMessage(error.message)
    await loadEmployeeFiles(rows.map(r => r.employee_id))
    setMessage('Файл удалён')
  }

  const totals = rows.reduce((acc, r) => {
    acc.gross += parseNum(r.salary_gross)
    acc.advances += parseNum(r.advance_amount)
    acc.deductions += parseNum(r.deduction_amount)
    acc.net += parseNum(r.salary_net)
    acc.card += parseNum(r.card_payment)
    acc.cash += parseNum(r.cash_payment)
    return acc
  }, { gross: 0, advances: 0, deductions: 0, net: 0, card: 0, cash: 0 })

  const branchTotals = branches.map(b => {
    const branchRows = rows.filter(r => r.branch_id === b.id)
    return {
      id: b.id,
      name: b.name,
      gross: branchRows.reduce((s, r) => s + parseNum(r.salary_gross), 0),
      advances: branchRows.reduce((s, r) => s + parseNum(r.advance_amount), 0),
      deductions: branchRows.reduce((s, r) => s + parseNum(r.deduction_amount), 0),
      net: branchRows.reduce((s, r) => s + parseNum(r.salary_net), 0)
    }
  }).filter(b => branchId === 'all' ? (b.gross || b.advances || b.net) : b.id === branchId)

  return <section>
    <section className="topbar"><div><h2>{t('salaries_tab')}</h2><p>Начисленные зарплаты, авансы и остатки по сотрудникам, филиалам и общей сумме.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="form-grid compact">
          <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label><span>Филиал</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        </div>
        <div className="grid mini-grid">
          <div className="metric"><span>Начислено</span><strong>{fmt(totals.gross)}</strong></div>
          <div className="metric"><span>Авансы</span><strong>{fmt(totals.advances)}</strong></div>
          <div className="metric"><span>Удержания</span><strong>{fmt(totals.deductions)}</strong></div>
          <div className="metric"><span>Остаток к выплате</span><strong>{fmt(totals.net)}</strong></div>
        </div>
        {message && <p className={`hint ${message === t('saved') || message.includes('Файл') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <h3>Сводка по филиалам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал</th><th>Начислено</th><th>Авансы</th><th>Удержания</th><th>Остаток</th></tr></thead>
          <tbody>{branchTotals.map(b => <tr key={b.id}><td>{b.name}</td><td>{fmt(b.gross)}</td><td>{fmt(b.advances)}</td><td>{fmt(b.deductions)}</td><td><strong>{fmt(b.net)}</strong></td></tr>)}{!branchTotals.length && <tr><td colSpan="5" className="hint">Нет данных за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Зарплаты сотрудников</h3>
        <div className="table-wrap"><table style={{ tableLayout: 'auto' }}>
          <thead><tr><th>Филиал</th><th>Должность</th><th style={{minWidth:220}}>Сотрудник</th><th style={{width:54}}>Инфо</th><th>Расчёт</th><th>Мес. ставка</th><th>Дневная</th><th style={{minWidth:90}}>Дни</th><th>Начислено</th><th>Авансы</th><th>Удержание</th><th>Карта</th><th>Наличные</th><th>Остаток</th><th>Комментарий</th></tr></thead>
          <tbody>{rows.map(r => <React.Fragment key={r.id || r.employee_id}>
            <tr>
              <td>{r.branches?.name || '—'}</td>
              <td>{r.employees?.position || '—'}</td>
              <td style={{minWidth:220, maxWidth:360, whiteSpace:'normal'}}>{r.employees?.full_name}</td>
              <td style={{width:54, paddingLeft:4, paddingRight:4, textAlign:'center'}}><button className="ghost small" onClick={() => setEmployeeInfoId(employeeInfoId === r.employee_id ? '' : r.employee_id)}>i</button></td>
              <td><select value={r.employees?.salary_type || 'monthly'} onChange={e => updateEmployeeDetails(r, { salary_type: e.target.value }, true)}><option value="monthly">Фикс</option><option value="daily">Ежедневный</option></select></td>
              <td><input inputMode="decimal" defaultValue={r.employees?.monthly_salary || 0} onBlur={e => updateEmployeeDetails(r, { monthly_salary: e.target.value }, true)} /></td>
              <td><input inputMode="decimal" key={(r.employees?.salary_type || 'monthly') + '-' + (r.employees?.daily_rate || '') + '-' + (r.employees?.monthly_salary || '')} defaultValue={fmt(calcDailyRate(r.employees))} readOnly={r.employees?.salary_type !== 'daily'} onBlur={e => r.employees?.salary_type === 'daily' && updateEmployeeDetails(r, { daily_rate: e.target.value }, true)} /></td>
              <td style={{minWidth:90}}><input style={{minWidth:80}} defaultValue={r.worked_days} onBlur={e => updateSalary(r, { worked_days: e.target.value })} /></td>
              <td><input defaultValue={r.salary_gross} onBlur={e => updateSalary(r, { salary_gross: e.target.value })} /></td>
              <td><strong>{fmt(r.advance_amount)}</strong></td>
              <td><input defaultValue={r.deduction_amount} onBlur={e => updateSalary(r, { deduction_amount: e.target.value })} /></td>
              <td><input defaultValue={r.card_payment} onBlur={e => updateSalary(r, { card_payment: e.target.value })} /></td>
              <td><input defaultValue={r.cash_payment} onBlur={e => updateSalary(r, { cash_payment: e.target.value })} /></td>
              <td><strong>{fmt(r.salary_net)}</strong></td>
              <td><input defaultValue={r.comment || ''} onBlur={e => updateSalary(r, { comment: e.target.value })} /></td>
            </tr>
            {employeeInfoId === r.employee_id && <tr><td colSpan="15"><div className="notice">
              <h3>Карточка сотрудника: {r.employees?.full_name}</h3>
              <div className="form-grid compact">
                <label><span>Телефон</span><input defaultValue={r.employees?.phone || ''} onBlur={e => updateEmployeeDetails(r, { phone: e.target.value.trim() || null })} /></label>
                <label><span>Адрес</span><input defaultValue={r.employees?.address || ''} onBlur={e => updateEmployeeDetails(r, { address: e.target.value.trim() || null })} /></label>
                <label><span>Прочая информация</span><input defaultValue={r.employees?.extra_info || ''} onBlur={e => updateEmployeeDetails(r, { extra_info: e.target.value.trim() || null })} /></label>
              </div>
              <br />
              <div className="form-grid compact">
                <label><span>Тип файла</span><select value={uploadType} onChange={e => setUploadType(e.target.value)}><option value="document">Удостоверение</option><option value="statement">Заявление</option><option value="contract">Договор</option><option value="other">Другое</option></select></label>
                <label style={{ gridColumn: 'span 2' }}><span>Добавить файл / изображение</span><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => { uploadEmployeeFile(r, e.target.files?.[0]); e.target.value = '' }} /></label>
              </div>
              <br />
              <div className="table-wrap"><table>
                <thead><tr><th>Тип</th><th>Файл</th><th>Размер</th><th>Дата</th><th></th></tr></thead>
                <tbody>{(employeeFiles[r.employee_id] || []).map(f => <tr key={f.id}>
                  <td>{f.file_type === 'document' ? 'Удостоверение' : f.file_type === 'statement' ? 'Заявление' : f.file_type === 'contract' ? 'Договор' : 'Другое'}</td>
                  <td><button className="ghost small" onClick={() => openEmployeeFile(f)}>{f.file_name}</button></td>
                  <td>{f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : '—'}</td>
                  <td>{formatDT(f.created_at)}</td>
                  <td><button className="danger small" onClick={() => deleteEmployeeFile(f)}>×</button></td>
                </tr>)}{!(employeeFiles[r.employee_id] || []).length && <tr><td colSpan="5" className="hint">Файлы ещё не добавлены.</td></tr>}</tbody>
              </table></div>
            </div></td></tr>}
          </React.Fragment>)}{!rows.length && <tr><td colSpan="15" className="hint">Нет активных сотрудников.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  </section>
}
function Advances({ t }) {
  const branches = useBranches()
  const current = new Date()
  const [year, setYear] = useState(current.getFullYear())
  const [month, setMonth] = useState(current.getMonth() + 1)
  const [branchId, setBranchId] = useState('all')
  const [employees, setEmployees] = useState([])
  const [advances, setAdvances] = useState([])
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState({ employee_id: '', advance_date: todayISO(), amount: '', comment: '' })
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [year, month, branchId])
  useEffect(() => { if (!form.employee_id && employees[0]) setForm(f => ({ ...f, employee_id: employees[0].id })) }, [employees])

  const monthDate = monthStart(year, month)
  const dim = daysInMonth(year, month)
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`

  async function load() {
    setMessage('')
    let empQ = supabase.from('employees').select('*, branches(name)').eq('is_active', true).order('branch_id').order('position').order('full_name')
    if (branchId !== 'all') empQ = empQ.eq('branch_id', branchId)
    let advQ = supabase.from('salary_advances').select('*, employees(full_name, position, monthly_salary), branches(name)').gte('advance_date', monthDate).lte('advance_date', monthEnd).order('advance_date', { ascending: false }).order('created_at', { ascending: false })
    if (branchId !== 'all') advQ = advQ.eq('branch_id', branchId)
    const [{ data: emp, error: empError }, { data: adv, error: advError }, { data: prof }] = await Promise.all([empQ, advQ, supabase.from('user_profiles').select('id, full_name')])
    if (empError || advError) {
      setMessage(empError?.message || advError?.message)
      return
    }
    setEmployees(emp || [])
    setAdvances(adv || [])
    setProfiles(prof || [])
  }

  function userName(id) {
    if (!id) return '—'
    const p = profiles.find(u => u.id === id)
    return p?.full_name || String(id).slice(0, 8)
  }

  function advanceStatus(row) {
    const editable = canEditAdvance(row)
    if (row.updated_at && row.updated_by) return `Изменено: ${formatDT(row.updated_at)} · ${userName(row.updated_by)}${editable ? '' : ' · закрыто'}`
    return `Создано: ${formatDT(row.created_at)} · ${userName(row.created_by)}${editable ? '' : ' · закрыто'}`
  }

  async function refreshSalaryForEmployee(employeeId) {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return
    const [{ data: existing }, { data: advanceRows }] = await Promise.all([
      supabase.from('salary_periods').select('*').eq('employee_id', employeeId).eq('salary_month', monthDate).maybeSingle(),
      supabase.from('salary_advances').select('amount').eq('employee_id', employeeId).gte('advance_date', monthDate).lte('advance_date', monthEnd).or('is_cancelled.is.null,is_cancelled.eq.false')
    ])
    const advanceTotal = (advanceRows || []).reduce((s, r) => s + parseNum(r.amount), 0)
    const gross = parseNum(existing?.salary_gross)
    const deduction = parseNum(existing?.deduction_amount)
    const net = gross - advanceTotal - deduction
    await supabase.from('salary_periods').upsert({
      employee_id: employeeId,
      branch_id: emp.branch_id || null,
      salary_month: monthDate,
      worked_days: parseNum(existing?.worked_days),
      salary_gross: gross,
      advance_amount: advanceTotal,
      deduction_amount: deduction,
      card_payment: parseNum(existing?.card_payment),
      cash_payment: parseNum(existing?.cash_payment),
      salary_net: net,
      comment: existing?.comment || ''
    }, { onConflict: 'employee_id,salary_month' })
  }

  async function addAdvance() {
    setMessage('')
    const emp = employees.find(e => e.id === form.employee_id)
    if (!emp) return setMessage('Выберите сотрудника')
    const amount = parseNum(form.amount)
    if (!amount) return setMessage('Введите сумму аванса')
    const { error } = await supabase.from('salary_advances').insert({
      employee_id: emp.id,
      branch_id: emp.branch_id || null,
      advance_date: form.advance_date || todayISO(),
      amount,
      comment: form.comment || null
    })
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(emp.id)
    setForm(f => ({ ...f, amount: '', comment: '' }))
    await load()
    setMessage('Аванс добавлен и учтён в зарплате')
  }

  async function updateAdvance(row, patch) {
    setMessage('')
    if (!canEditAdvance(row)) return setMessage('Аванс можно редактировать только в течение 24 часов после создания')
    const payload = { ...patch }
    if ('amount' in payload) payload.amount = parseNum(payload.amount)
    const { error } = await supabase.from('salary_advances').update(payload).eq('id', row.id)
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(row.employee_id)
    await load()
    setMessage(t('saved'))
  }

  async function deleteAdvance(row) {
    setMessage('')
    if (!canEditAdvance(row)) return setMessage('Аванс можно отменить только в течение 24 часов после создания')
    const ok = window.confirm('Отменить этот аванс? Строка останется в журнале перечёркнутой и не будет учитываться в расчётах.')
    if (!ok) return
    const { error } = await supabase.from('salary_advances').update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancel_comment: 'Отменено через журнал авансов'
    }).eq('id', row.id)
    if (error) return setMessage(error.message)
    await refreshSalaryForEmployee(row.employee_id)
    await load()
    setMessage('Аванс отменён и исключён из расчётов')
  }

  const activeAdvances = advances.filter(a => !a.is_cancelled)

  const totalsByEmployee = employees.map(emp => {
    const empAdvances = activeAdvances.filter(a => a.employee_id === emp.id)
    return {
      id: emp.id,
      branch: emp.branches?.name || '—',
      position: emp.position || '—',
      full_name: emp.full_name,
      amount: empAdvances.reduce((s, a) => s + parseNum(a.amount), 0)
    }
  }).filter(r => r.amount > 0)

  const totalAdvance = activeAdvances.reduce((s, r) => s + parseNum(r.amount), 0)
  const branchTotals = branches.map(b => ({
    id: b.id,
    name: b.name,
    amount: activeAdvances.filter(a => a.branch_id === b.id).reduce((s, a) => s + parseNum(a.amount), 0)
  })).filter(b => branchId === 'all' ? b.amount : b.id === branchId)

  return <section>
    <section className="topbar"><div><h2>{t('advances_tab')}</h2><p>Каждая выплата аванса фиксируется отдельной строкой с датой и комментарием.</p></div></section>
    <section className="grid">
      <div className="card span-2">
        <div className="form-grid compact">
          <label><span>{t('year')}</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{defaultYears().map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>{t('month')}</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{I18N.ru.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label><span>Филиал</span><select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="all">Все филиалы</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        </div>
        <div className="metric"><span>Итого авансы за месяц</span><strong>{fmt(totalAdvance)}</strong></div>
        {message && <p className={`hint ${message.includes('добавлен') || message === t('saved') || message.includes('удал') ? 'good' : 'bad'}`}>{message}</p>}
      </div>

      <div className="card span-2">
        <h3>Новый аванс</h3>
        <div className="form-grid compact">
          <label><span>Сотрудник</span><select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}>{employees.map(e => <option key={e.id} value={e.id}>{e.branches?.name || '—'} · {e.full_name}</option>)}</select></label>
          <label><span>Дата</span><input type="date" value={form.advance_date} onChange={e => setForm({...form, advance_date: e.target.value})} /></label>
          <label><span>Сумма</span><input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" /></label>
          <label><span>Комментарий</span><input value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} placeholder="Например: аванс за первую половину месяца" /></label>
        </div><br />
        <button className="small" onClick={addAdvance}>+ Добавить аванс</button>
      </div>

      <div className="card span-2">
        <h3>Сводка авансов по филиалам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал</th><th>Авансы</th></tr></thead>
          <tbody>{branchTotals.map(b => <tr key={b.id}><td>{b.name}</td><td><strong>{fmt(b.amount)}</strong></td></tr>)}{!branchTotals.length && <tr><td colSpan="2" className="hint">Нет авансов за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Сводка авансов по сотрудникам</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Филиал</th><th>Должность</th><th style={{minWidth:240}}>Сотрудник</th><th>Сумма авансов</th></tr></thead>
          <tbody>{totalsByEmployee.map(r => <tr key={r.id}><td>{r.branch}</td><td>{r.position}</td><td>{r.full_name}</td><td><strong>{fmt(r.amount)}</strong></td></tr>)}{!totalsByEmployee.length && <tr><td colSpan="4" className="hint">Нет авансов за выбранный период.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card span-2">
        <h3>Журнал авансов</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Дата</th><th>Филиал</th><th>Должность</th><th style={{minWidth:240}}>Сотрудник</th><th>Сумма</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead>
          <tbody>{advances.map(a => {
            const editable = canEditAdvance(a) && !a.is_cancelled
            return <tr key={a.id} className={a.is_cancelled ? 'cancelled-row' : (editable ? '' : 'muted-row')}>
              <td><input type="date" defaultValue={a.advance_date} disabled={!editable} onBlur={e => updateAdvance(a, { advance_date: e.target.value })} /></td>
              <td>{a.branches?.name || '—'}</td><td>{a.employees?.position || '—'}</td><td>{a.employees?.full_name}</td>
              <td><input defaultValue={a.amount} disabled={!editable} onBlur={e => updateAdvance(a, { amount: e.target.value })} /></td>
              <td><input defaultValue={a.comment || ''} disabled={!editable} onBlur={e => updateAdvance(a, { comment: e.target.value })} /></td>
              <td className="hint" style={{minWidth:220}}>{a.is_cancelled ? `Отменено: ${formatDT(a.cancelled_at)} · ${userName(a.cancelled_by)}` : advanceStatus(a)}</td>
              <td><button className="remove" disabled={!editable || a.is_cancelled} onClick={() => deleteAdvance(a)}>×</button></td>
            </tr>
          })}{!advances.length && <tr><td colSpan="8" className="hint">Авансов за выбранный период нет.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  </section>
}

function Suppliers({ t }) {
  const branches = useBranches()
  const [legalEntities, setLegalEntities] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [balances, setBalances] = useState([])
  const [purchases, setPurchases] = useState([])
  const [profiles, setProfiles] = useState([])
  const [supplierForm, setSupplierForm] = useState({ name: '', voen: '', contact_person: '', phone: '', info: '', payment_term_days: '', credit_limit: '' })
  const [legalForm, setLegalForm] = useState({ name: '', voen: '' })
  const [productForm, setProductForm] = useState({ name: '', category: PRODUCT_CATEGORIES[0], base_unit: 'g' })
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: '', legal_entity_id: '', branch_id: '', purchase_date: todayISO(), invoice_number: '', comment: '' })
  const emptyLine = { category: PRODUCT_CATEGORIES[0], product_id: '', new_product_name: '', base_unit: 'g', quantity: '1', unit: 'kg', unit_price: '' }
  const [lineRows, setLineRows] = useState([emptyLine])
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
  const [activeInfoId, setActiveInfoId] = useState('')
  const [editingPurchaseId, setEditingPurchaseId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!purchaseForm.supplier_id && suppliers[0]) setPurchaseForm(f => ({ ...f, supplier_id: suppliers[0].id }))
    if (!purchaseForm.legal_entity_id && legalEntities[0]) setPurchaseForm(f => ({ ...f, legal_entity_id: legalEntities[0].id }))
    if (!purchaseForm.branch_id && branches[0]) setPurchaseForm(f => ({ ...f, branch_id: branches[0].id }))
  }, [suppliers, legalEntities, branches, products])

  async function load() {
    const [{ data: le }, { data: sup }, { data: prod }, { data: bal }, { data: pur }, { data: prof }] = await Promise.all([
      supabase.from('legal_entities').select('*').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('supplier_products').select('*').eq('is_active', true).order('category').order('name'),
      supabase.from('supplier_balances_v2').select('*').order('supplier_name'),
      supabase.from('supplier_purchases').select('*, suppliers(name), legal_entities(name,voen), branches(name), supplier_purchase_items(*, supplier_products(name,base_unit,category))').is('deleted_at', null).order('purchase_date', { ascending: false }).order('created_at', { ascending: false }).limit(300),
      supabase.from('user_profiles').select('id, full_name')
    ])
    setLegalEntities(le || [])
    setSuppliers(sup || [])
    setProducts(prod || [])
    setBalances(bal || [])
    setPurchases(pur || [])
    setProfiles(prof || [])
  }

  function userName(id) {
    if (!id) return '—'
    const p = profiles.find(u => u.id === id)
    return p?.full_name || String(id).slice(0, 8)
  }

  function balanceForSupplier(id) {
    return balances.find(b => b.supplier_id === id)?.balance || 0
  }

  function supplierAlert(supplier) {
    const balance = parseNum(balanceForSupplier(supplier.id))
    const limit = parseNum(supplier.credit_limit)
    const termDays = parseNum(supplier.payment_term_days)
    const overLimit = limit > 0 && balance > limit ? balance - limit : 0
    const today = new Date()
    const overdue = termDays > 0 ? purchases.filter(p => p.supplier_id === supplier.id && ((today - new Date(p.purchase_date)) / 86400000) > termDays) : []
    return { overLimit, overdueCount: overdue.length, overdueInvoices: overdue.map(p => p.invoice_number || p.purchase_date).slice(0, 5) }
  }

  function productsByCategory(category) {
    return products.filter(p => (p.category || 'Прочее') === category)
  }

  function lineTotal(row) {
    return parseNum(row.quantity) * parseNum(row.unit_price)
  }

  function updateLine(index, patch) {
    setLineRows(rows => rows.map((row, i) => {
      if (i !== index) return row
      const next = { ...row, ...patch }
      if (patch.category) {
        next.product_id = ''
        next.new_product_name = ''
      }
      return next
    }))
  }

  async function addLegalEntity() {
    setMessage('')
    if (!legalForm.name.trim() || !legalForm.voen.trim()) return setMessage('Введите название и VOEN')
    const { error } = await supabase.from('legal_entities').insert({ name: legalForm.name.trim(), voen: legalForm.voen.trim() })
    if (error) return setMessage(error.message)
    setLegalForm({ name: '', voen: '' })
    await load()
    setMessage(t('saved'))
  }

  async function addSupplier() {
    setMessage('')
    if (!supplierForm.name.trim()) return setMessage('Введите имя контрагента')
    const { error } = await supabase.from('suppliers').insert({
      name: supplierForm.name.trim(),
      voen: supplierForm.voen.trim() || null,
      contact_person: supplierForm.contact_person.trim() || null,
      phone: supplierForm.phone.trim() || null,
      info: supplierForm.info.trim() || null,
      payment_term_days: parseNum(supplierForm.payment_term_days) || null,
      credit_limit: parseNum(supplierForm.credit_limit) || 0
    })
    if (error) return setMessage(error.message)
    setSupplierForm({ name: '', voen: '', contact_person: '', phone: '', info: '', payment_term_days: '', credit_limit: '' })
    await load()
    setMessage(t('saved'))
  }

  async function updateSupplier(id, patch) {
    setMessage('')
    const { error } = await supabase.from('suppliers').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else await load()
  }

  async function addProductFromForm() {
    setMessage('')
    if (!productForm.name.trim()) return setMessage('Введите товар')
    const { error } = await supabase.from('supplier_products').insert({
      name: productForm.name.trim(),
      category: productForm.category,
      base_unit: productForm.base_unit
    })
    if (error) return setMessage(error.message)
    setProductForm({ name: '', category: productForm.category, base_unit: productForm.base_unit })
    await load()
    setMessage(t('saved'))
  }

  async function ensureProduct(row) {
    if (row.product_id) return products.find(p => p.id === row.product_id)
    if (!row.new_product_name.trim()) throw new Error('Выберите товар или введите новый товар')
    const { data, error } = await supabase.from('supplier_products').insert({
      name: row.new_product_name.trim(),
      category: row.category,
      base_unit: row.base_unit || 'g'
    }).select('*').single()
    if (error) throw error
    return data
  }

  async function addPurchase() {
    setMessage('')
    try {
      if (!purchaseForm.supplier_id || !purchaseForm.legal_entity_id) throw new Error('Выберите поставщика и VOEN')
      const prepared = []
      for (const row of lineRows) {
        const hasData = row.product_id || row.new_product_name.trim() || parseNum(row.quantity) || parseNum(row.unit_price)
        if (!hasData) continue
        const product = await ensureProduct(row)
        const quantity = parseNum(row.quantity)
        const unitPrice = parseNum(row.unit_price)
        const total = quantity * unitPrice
        const baseQty = convertToBase(quantity, row.unit, product?.base_unit)
        if (!product?.id || !quantity || !unitPrice || !baseQty) throw new Error('Проверьте товар, количество, единицу и цену')
        prepared.push({ row, product, quantity, unitPrice, total, baseQty })
      }
      if (!prepared.length) throw new Error('Добавьте хотя бы один товар в закупку')
      const totalAmount = prepared.reduce((s, r) => s + r.total, 0)

      const { data: purchase, error } = await supabase.from('supplier_purchases').insert({
        supplier_id: purchaseForm.supplier_id,
        legal_entity_id: purchaseForm.legal_entity_id,
        branch_id: purchaseForm.branch_id || null,
        purchase_date: purchaseForm.purchase_date,
        invoice_number: purchaseForm.invoice_number.trim() || null,
        comment: purchaseForm.comment.trim() || null,
        total_amount: totalAmount
      }).select('*').single()
      if (error) throw error

      const items = prepared.map(({ row, product, quantity, unitPrice, total, baseQty }) => ({
        purchase_id: purchase.id,
        product_id: product.id,
        quantity,
        unit: row.unit,
        unit_price: unitPrice,
        total_amount: total,
        base_quantity: baseQty,
        base_unit: product?.base_unit || 'g',
        price_per_base_unit: total / baseQty
      }))
      const { error: itemError } = await supabase.from('supplier_purchase_items').insert(items)
      if (itemError) throw itemError

      await load()
      setLineRows([emptyLine])
      setPurchaseForm(f => ({ ...f, invoice_number: '', comment: '' }))
      setMessage(t('saved'))
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function recalcPurchaseTotal(purchaseId) {
    const { data } = await supabase.from('supplier_purchase_items').select('total_amount').eq('purchase_id', purchaseId)
    const total = (data || []).reduce((s, i) => s + parseNum(i.total_amount), 0)
    await supabase.from('supplier_purchases').update({ total_amount: total }).eq('id', purchaseId)
  }

  async function updatePurchase(id, patch) {
    setMessage('')
    const { error } = await supabase.from('supplier_purchases').update(patch).eq('id', id)
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  async function updatePurchaseItem(purchaseId, item, patch) {
    setMessage('')
    const next = { ...item, ...patch }
    const product = products.find(p => p.id === next.product_id) || item.supplier_products
    const quantity = parseNum(next.quantity)
    const unitPrice = parseNum(next.unit_price)
    const total = quantity * unitPrice
    const baseQty = convertToBase(quantity, next.unit, product?.base_unit)
    if (!quantity || !unitPrice || !baseQty) return setMessage('Проверьте количество, единицу и цену')
    const payload = {
      product_id: next.product_id,
      quantity,
      unit: next.unit,
      unit_price: unitPrice,
      total_amount: total,
      base_quantity: baseQty,
      base_unit: product?.base_unit || 'g',
      price_per_base_unit: total / baseQty
    }
    const { error } = await supabase.from('supplier_purchase_items').update(payload).eq('id', item.id)
    if (error) return setMessage(error.message)
    await recalcPurchaseTotal(purchaseId)
    await load()
    setMessage(t('saved'))
  }

  async function softDeletePurchase(id) {
    if (!window.confirm('Удалить закупку? Она будет скрыта из списка, но дата и пользователь удаления сохранятся.')) return
    setMessage('')
    const { error } = await supabase.from('supplier_purchases').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  async function addPayment(supplierId) {
    const raw = window.prompt('Сумма оплаты поставщику')
    const amount = parseNum(raw)
    if (!amount) return
    const invoiceNotes = window.prompt('Отметки / номера счёт-фактур для оплаты', '') || ''
    const comment = window.prompt('Комментарий к оплате', '') || ''
    const { error } = await supabase.from('supplier_payments').insert({ supplier_id: supplierId, payment_date: todayISO(), amount, invoice_notes: invoiceNotes.trim() || null, comment: comment.trim() || null })
    if (error) setMessage(error.message)
    else { await load(); setMessage(t('saved')) }
  }

  function startPayment(supplierId) {
    setPaymentForm({ supplier_id: supplierId, payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
  }

  async function savePayment() {
    setMessage('')
    const amount = parseNum(paymentForm.amount)
    if (!paymentForm.supplier_id || !amount) return setMessage('Выберите поставщика и сумму оплаты')
    const { error } = await supabase.from('supplier_payments').insert({
      supplier_id: paymentForm.supplier_id,
      payment_date: paymentForm.payment_date || todayISO(),
      amount,
      invoice_notes: paymentForm.invoice_notes.trim() || null,
      comment: paymentForm.comment.trim() || null
    })
    if (error) return setMessage(error.message)
    setPaymentForm({ supplier_id: '', payment_date: todayISO(), amount: '', invoice_notes: '', comment: '' })
    await load()
    setMessage(t('saved'))
  }

  const purchaseTotal = lineRows.reduce((s, r) => s + lineTotal(r), 0)

  return (
    <section>
      <section className="topbar"><div><h2>{t('suppliers_tab')}</h2><p>Поставщики, VOEN, закупки, товары и долги. Эти товары используются в техкартах.</p></div></section>
      <section className="grid">
        <div className="card span-2">
          <div className="card-head"><div><h3>Наши VOEN / юрлица</h3><p className="hint">Закупка привязывается к одному из ваших VOEN.</p></div></div>
          <div className="form-grid compact">
            <label><span>Название</span><input value={legalForm.name} onChange={e => setLegalForm({...legalForm, name: e.target.value})} placeholder="Barista&Chef MMC" /></label>
            <label><span>VOEN</span><input value={legalForm.voen} onChange={e => setLegalForm({...legalForm, voen: e.target.value})} /></label>
          </div>
          <button className="small" onClick={addLegalEntity}>+ Добавить VOEN</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Контрагенты</h3><p className="hint">VOEN поставщика — уникальный налоговый номер контрагента.</p></div></div>
          <div className="form-grid compact">
            <label><span>Имя контрагента</span><input value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} /></label>
            <label><span>VOEN поставщика</span><input value={supplierForm.voen} onChange={e => setSupplierForm({...supplierForm, voen: e.target.value})} /></label>
            <label><span>Контакт</span><input value={supplierForm.contact_person} onChange={e => setSupplierForm({...supplierForm, contact_person: e.target.value})} /></label>
            <label><span>Телефон</span><input value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} /></label>
            <label><span>Информация</span><input value={supplierForm.info} onChange={e => setSupplierForm({...supplierForm, info: e.target.value})} placeholder="заметки" /></label>
            <label><span>Срок оплаты, дней</span><input inputMode="numeric" value={supplierForm.payment_term_days} onChange={e => setSupplierForm({...supplierForm, payment_term_days: e.target.value})} placeholder="например 14" /></label>
            <label><span>Кредитный лимит</span><input inputMode="decimal" value={supplierForm.credit_limit} onChange={e => setSupplierForm({...supplierForm, credit_limit: e.target.value})} placeholder="например 5000" /></label>
          </div>
          <button className="small" onClick={addSupplier}>+ Добавить поставщика</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Товары</h3><p className="hint">Товар создаётся один раз и потом выбирается в закупке и в техкарте.</p></div></div>
          <div className="form-grid compact">
            <label><span>Товар</span><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Молоко / Кофе" /></label>
            <label><span>Категория</span><select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label><span>Базовая ед. для техкарты</span><select value={productForm.base_unit} onChange={e => setProductForm({...productForm, base_unit: e.target.value})}>{BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
          </div>
          <button className="small" onClick={addProductFromForm}>+ Добавить товар</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Новая закупка</h3><p className="hint">Сначала заполняется шапка фактуры. Товары добавляются строками ниже.</p></div></div>
          <div className="form-grid compact">
            <label><span>Поставщик</span><select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})}>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span>Наш VOEN</span><select value={purchaseForm.legal_entity_id} onChange={e => setPurchaseForm({...purchaseForm, legal_entity_id: e.target.value})}>{legalEntities.map(le => <option key={le.id} value={le.id}>{le.name} · {le.voen}</option>)}</select></label>
            <label><span>Филиал</span><select value={purchaseForm.branch_id} onChange={e => setPurchaseForm({...purchaseForm, branch_id: e.target.value})}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span>Дата закупа</span><input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})} /></label>
            <label><span>Номер фактуры</span><input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({...purchaseForm, invoice_number: e.target.value})} /></label>
            <label><span>Комментарий</span><input value={purchaseForm.comment} onChange={e => setPurchaseForm({...purchaseForm, comment: e.target.value})} /></label>
          </div>

          <br />
          <div className="card-head"><div><h3>Товары в закупке</h3><p className="hint">В графе “Товар” можно выбрать существующий товар или вписать новый. Новый товар автоматически попадёт в справочник.</p></div><button className="small" onClick={() => setLineRows(rows => [...rows, { ...emptyLine }])}>+ Строка товара</button></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Категория</th><th>Товар</th><th>Новый товар</th><th>Кол-во закупа</th><th>Ед. закупа</th><th>Цена за ед.</th><th>Сумма</th><th></th></tr></thead>
              <tbody>
                {lineRows.map((row, idx) => {
                  const filtered = productsByCategory(row.category)
                  return (
                    <tr key={idx}>
                      <td><select value={row.category} onChange={e => updateLine(idx, { category: e.target.value })}>{PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td><select value={row.product_id || '__new__'} onChange={e => { const v = e.target.value; updateLine(idx, { product_id: v === '__new__' ? '' : v, new_product_name: v === '__new__' ? row.new_product_name : '' }) }}><option value="__new__">+ Новый товар</option>{filtered.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                      <td><input value={row.new_product_name} onChange={e => updateLine(idx, { new_product_name: e.target.value, product_id: '' })} placeholder="если товара нет" /></td>
                      <td><input inputMode="decimal" value={row.quantity} onChange={e => updateLine(idx, { quantity: e.target.value })} /></td>
                      <td><select value={row.unit} onChange={e => updateLine(idx, { unit: e.target.value })}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                      <td><input inputMode="decimal" value={row.unit_price} onChange={e => updateLine(idx, { unit_price: e.target.value })} /></td>
                      <td><strong>{fmt(lineTotal(row))}</strong></td>
                      <td><button className="remove" onClick={() => setLineRows(rows => rows.length === 1 ? [emptyLine] : rows.filter((_, i) => i !== idx))}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="hint">Итого по фактуре: <strong>{fmt(purchaseTotal)}</strong> AZN. Пример: молоко 1 l × 2.20 → 0.0022 AZN/ml; кофе 1 kg × 37 → 0.037 AZN/g.</p>
          <button className="small" onClick={addPurchase}>+ Сохранить закупку</button>
          {message && <p className={`hint ${message === t('saved') ? 'good' : 'bad'}`}>{message}</p>}
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Поставщики и долги</h3></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Поставщик</th><th>VOEN</th><th>Условия оплаты</th><th>Лимит</th><th>Долг</th><th>Статус</th><th>Инфо</th><th></th></tr></thead>
              <tbody>
                {suppliers.map(s => {
                  const alert = supplierAlert(s)
                  const risky = alert.overLimit > 0 || alert.overdueCount > 0
                  return <tr key={s.id} style={risky ? { background: 'rgba(155,45,45,.08)' } : undefined}>
                    <td><input defaultValue={s.name} onBlur={e => updateSupplier(s.id, { name: e.target.value.trim() })} /></td>
                    <td><input defaultValue={s.voen || ''} onBlur={e => updateSupplier(s.id, { voen: e.target.value.trim() || null })} /></td>
                    <td><input inputMode="numeric" defaultValue={s.payment_term_days || ''} onBlur={e => updateSupplier(s.id, { payment_term_days: parseNum(e.target.value) || null })} placeholder="14 дней" /></td>
                    <td><input inputMode="decimal" defaultValue={s.credit_limit || 0} onBlur={e => updateSupplier(s.id, { credit_limit: parseNum(e.target.value) })} /></td>
                    <td><strong className={balanceForSupplier(s.id) > 0 ? 'bad' : 'good'}>{fmt(balanceForSupplier(s.id))}</strong></td>
                    <td className="hint" style={{minWidth:240}}>{alert.overLimit > 0 && <div className="bad">Превышение лимита: {fmt(alert.overLimit)}</div>}{alert.overdueCount > 0 && <div className="bad">Просрочено фактур: {alert.overdueCount} ({alert.overdueInvoices.join(', ')})</div>}{!risky && <span className="good">ОК</span>}</td>
                    <td><button className="ghost small" onClick={() => setActiveInfoId(activeInfoId === s.id ? '' : s.id)}>i</button>{activeInfoId === s.id && <p className="hint">{s.info || 'Нет информации'}</p>}</td>
                    <td><button className="small" onClick={() => startPayment(s.id)}>Оплата</button></td>
                  </tr>
                })}
                {!suppliers.length && <tr><td colSpan="8" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Оплата поставщику</h3><p className="hint">Здесь можно указать сумму оплаты, номера счёт-фактур и комментарий.</p></div></div>
          <div className="form-grid compact">
            <label><span>Поставщик</span><select value={paymentForm.supplier_id} onChange={e => setPaymentForm({...paymentForm, supplier_id: e.target.value})}><option value="">Выберите поставщика</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span>Дата оплаты</span><input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} /></label>
            <label><span>Сумма оплаты</span><input inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} /></label>
            <label><span>Отметки / номера счёт-фактур</span><input value={paymentForm.invoice_notes} onChange={e => setPaymentForm({...paymentForm, invoice_notes: e.target.value})} placeholder="например: INV-25, INV-26" /></label>
            <label><span>Комментарий</span><input value={paymentForm.comment} onChange={e => setPaymentForm({...paymentForm, comment: e.target.value})} placeholder="за что оплачено, примечание" /></label>
          </div>
          <button className="small" onClick={savePayment}>+ Сохранить оплату</button>
        </div>

        <div className="card span-2">
          <div className="card-head"><div><h3>Последние закупки</h3><p className="hint">Закупки можно редактировать и удалять. Справа сохраняется дата изменения/удаления и пользователь.</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Дата</th><th>Фактура</th><th>Поставщик</th><th>Наш VOEN</th><th>Филиал</th><th>Товары</th><th>Сумма</th><th>История</th><th></th></tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td>{editingPurchaseId === p.id ? <input type="date" defaultValue={p.purchase_date} onBlur={e => updatePurchase(p.id, { purchase_date: e.target.value })} /> : p.purchase_date}</td>
                    <td>{editingPurchaseId === p.id ? <input defaultValue={p.invoice_number || ''} onBlur={e => updatePurchase(p.id, { invoice_number: e.target.value.trim() || null })} /> : (p.invoice_number || '—')}</td>
                    <td>{p.suppliers?.name}</td>
                    <td>{p.legal_entities?.voen}</td>
                    <td>{editingPurchaseId === p.id ? <select defaultValue={p.branch_id || ''} onBlur={e => updatePurchase(p.id, { branch_id: e.target.value || null })}><option value="">—</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select> : (p.branches?.name || '—')}</td>
                    <td>
                      {(p.supplier_purchase_items || []).map(i => (
                        <div key={i.id} style={{display:'grid', gridTemplateColumns:'1.2fr .7fr .8fr .8fr', gap:8, marginBottom:6}}>
                          {editingPurchaseId === p.id ? <select defaultValue={i.product_id} onBlur={e => updatePurchaseItem(p.id, i, { product_id: e.target.value })}>{products.map(prod => <option key={prod.id} value={prod.id}>{prod.category} · {prod.name}</option>)}</select> : <span>{i.supplier_products?.name}</span>}
                          {editingPurchaseId === p.id ? <input inputMode="decimal" defaultValue={i.quantity} onBlur={e => updatePurchaseItem(p.id, i, { quantity: parseNum(e.target.value) })} /> : <span>{fmt(i.quantity)}</span>}
                          {editingPurchaseId === p.id ? <select defaultValue={i.unit} onBlur={e => updatePurchaseItem(p.id, i, { unit: e.target.value })}>{PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}</select> : <span>{i.unit}</span>}
                          {editingPurchaseId === p.id ? <input inputMode="decimal" defaultValue={i.unit_price} onBlur={e => updatePurchaseItem(p.id, i, { unit_price: parseNum(e.target.value) })} /> : <span>{fmt(i.unit_price)} AZN</span>}
                        </div>
                      ))}
                    </td>
                    <td><strong>{fmt(p.total_amount)}</strong></td>
                    <td className="hint">
                      <div>Создано: {p.created_at ? new Date(p.created_at).toLocaleString() : '—'} · {userName(p.created_by)}</div>
                      <div>Изменено: {p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'} · {userName(p.updated_by)}</div>
                      {p.deleted_at && <div>Удалено: {new Date(p.deleted_at).toLocaleString()} · {userName(p.deleted_by)}</div>}
                    </td>
                    <td>
                      <button className="ghost small" onClick={() => setEditingPurchaseId(editingPurchaseId === p.id ? '' : p.id)}>{editingPurchaseId === p.id ? 'Готово' : 'Ред.'}</button>
                      <button className="remove" onClick={() => softDeletePurchase(p.id)}>×</button>
                    </td>
                  </tr>
                ))}
                {!purchases.length && <tr><td colSpan="9" className="hint">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
