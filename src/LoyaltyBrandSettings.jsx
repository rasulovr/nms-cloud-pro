import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import LoyaltyBrandPayments from './LoyaltyBrandPayments'

export default function LoyaltyBrandSettings({ onSaved, onError }) {
  const [brands, setBrands] = useState([])
  const [org, setOrg] = useState('')
  const [form, setForm] = useState(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [example, setExample] = useState({ check: '100', balance: '0', spend: '0' })
  const brand = brands.find(item => item.organization_id === org)
  const editable = Boolean(brand?.can_edit)
  useEffect(() => {
    let active = true
    supabase.rpc('qr_loyalty_admin_programs').then(({ data, error }) => {
      if (!active) return
      setBusy(false)
      if (error) return setError(error.code === 'PGRST202' ? 'Настройки бонусной программы ещё не подключены.' : error.message)
      const rows = Array.isArray(data) ? data : []
      setBrands(rows)
      if (rows.length === 1) setOrg(rows[0].organization_id)
    }).catch(() => { if (active) { setBusy(false); setError('Не удалось загрузить программы.') } })
    return () => { active = false }
  }, [])
  useEffect(() => {
    setForm(brand ? structuredClone(brand.program.settings) : null)
    setVersion(brand?.program.version || 0)
  }, [brand])
  function change(key, value) { setForm(current => ({ ...current, [key]: value })) }
  const exampleValid = form && Object.values(example).every(value => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)
  const exampleTier = form?.tiers.filter(tier => tier.min_spend !== '' && Number(tier.min_spend) <= Number(example.spend)).at(-1)
  const exampleRate = form?.enabled ? Number(exampleTier?.cashback_percent ?? form.cashback_percent) : 0
  const exampleRedeem = form?.enabled && Number(example.balance) >= Number(form.min_redeem_balance)
    ? Math.min(Number(example.balance), Math.floor(Number(example.check) * Number(form.max_redeem_percent) + 1e-8) / 100) : 0
  const exampleCash = Number(example.check) - exampleRedeem
  const exampleEarn = form && exampleCash >= Number(form.min_purchase) ? Math.floor(exampleCash * exampleRate + 1e-8) / 100 : 0
  async function save(event) {
    event.preventDefault()
    if (!editable || busy) return
    const fields = ['cashback_percent','max_redeem_percent','min_purchase','min_redeem_balance']
    if (fields.some(key => form[key] === '' || !Number.isFinite(Number(form[key])))) return setError('Заполните все числовые поля.')
    const payload = { ...form, ...Object.fromEntries(fields.map(key => [key, Number(form[key])])),
      expiry_days: form.expiry_days === null ? null : Number(form.expiry_days),
      tiers: form.tiers.map(tier => ({ name: tier.name.trim(), min_spend: Number(tier.min_spend), cashback_percent: Number(tier.cashback_percent) })) }
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('qr_loyalty_save_program', { p_organization_id: org, p_settings: payload, p_expected_version: version })
      if (error) throw error
      setBrands(rows => rows.map(item => item.organization_id === org ? { ...item, program: data } : item))
      onSaved?.('Условия бренда сохранены. Они применяются к новым операциям.')
    } catch (e) { setError(e.message); onError?.(e.message) }
    finally { setBusy(false) }
  }
  return <><section className="loyalty-settings-grid">
    <form className="loyalty-admin-panel loyalty-settings-form" onSubmit={save}>
      <div className="loyalty-admin-panel-head"><div><span>УСЛОВИЯ БРЕНДА</span><h2>Бонусная программа</h2><p>Один бонус равен одному манату. Условия задаёт владелец или администратор бренда.</p></div></div>
      {error && <p role="alert" className="loyalty-settings-warning">{error}</p>}
      <label>Бренд<select value={org} disabled={busy} onChange={e => { setError(''); setOrg(e.target.value) }}><option value="">Выберите бренд</option>{brands.map(item => <option key={item.organization_id} value={item.organization_id}>{item.name}</option>)}</select></label>
      {!busy && !error && !brands.length && <p>Нет доступных брендов с лицензией Loyalty.</p>}
      {form && <fieldset disabled={busy || !editable} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 16 }}>
        {!editable && <p>Редактирование доступно владельцу и администратору бренда.</p>}
        <label>Название программы<input required maxLength={80} value={form.name} onChange={e => change('name', e.target.value)} /></label>
        <div className="loyalty-settings-row">
          {[['cashback_percent','Базовое начисление, %',100],['max_redeem_percent','Оплата бонусами — до, %',100],['min_purchase','Минимум оплаты деньгами для начисления, ₼',100000000],['min_redeem_balance','Минимальный баланс для списания, ₼',100000000]].map(([key,label,max]) => <label key={key}>{label}<input required type="number" min="0" max={max} step="0.01" value={form[key]} onChange={e => change(key,e.target.value)} /></label>)}
        </div>
        <label>Срок действия бонусов<select value={form.expiry_days === null ? 'never' : 'days'} onChange={e => change('expiry_days',e.target.value === 'never' ? null : 365)}><option value="never">Без срока</option><option value="days">Ограничен по дням</option></select></label>
        {form.expiry_days !== null && <label>Количество дней<input required type="number" min="1" max="3650" step="1" value={form.expiry_days} onChange={e => change('expiry_days',e.target.value)} /></label>}
        <h3>Уровни лояльности</h3><p>Пороги — по сумме покупок, оплаченной деньгами. До первого порога действует базовый процент. Укажите уровни по возрастанию порога.</p>
        {form.tiers.map((tier,index) => <fieldset key={index} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, minWidth: 0 }}><legend>Уровень {index+1}</legend>
          {[['name','Название','text'],['min_spend','Порог покупок, ₼','number'],['cashback_percent','Начисление, %','number']].map(([key,label,type]) => <label key={key}>{label}<input required type={type} min={type==='number'?0:undefined} max={key==='cashback_percent'?100:key==='min_spend'?100000000:undefined} maxLength={key==='name'?40:undefined} step={type==='number'?'0.01':undefined} value={tier[key]} onChange={e => change('tiers',form.tiers.map((row,i) => i===index?{...row,[key]:e.target.value}:row))}/></label>)}
          <button type="button" className="loyalty-admin-secondary" onClick={() => change('tiers',form.tiers.filter((_,i)=>i!==index))}>Удалить уровень</button>
        </fieldset>)}
        {form.tiers.length<10 && <button type="button" className="loyalty-admin-secondary" onClick={() => change('tiers',[...form.tiers,{name:'',min_spend:'',cashback_percent:form.cashback_percent}])}>Добавить уровень</button>}
        <label className="loyalty-settings-toggle"><span><b>Программа активна</b><small>Начисление и списание по сохранённым условиям</small></span><input type="checkbox" checked={form.enabled} onChange={e => change('enabled',e.target.checked)}/></label>
        <button className="loyalty-admin-primary" type="submit">{busy?'Сохранение…':'Сохранить условия'}</button>
      </fieldset>}
    </form>
    <aside className="loyalty-admin-panel loyalty-settings-info"><h2>Правила операций</h2><p>Бонусы начисляются только после подтверждения оплаты сотрудником, на часть чека, оплаченную деньгами.</p><p>Один чек обрабатывается один раз. Для каждой операции сохраняется версия условий: последующие изменения её не пересчитывают.</p><p>Новые настройки срока действия относятся к новым начислениям. Уже начисленные бонусы сохраняют свой срок.</p><p>Версия условий: {version || 'ещё не сохранены'}</p>
      {form && <div className="loyalty-settings-form"><h3>Проверить на примере</h3><p>Расчёт по условиям в форме с максимальным списанием. Балансы гостей не изменяются.</p>
        {[['check','Сумма чека, ₼'],['balance','Баланс бонусов, ₼'],['spend','Предыдущие покупки деньгами, ₼']].map(([key,label]) => <label key={key}>{label}<input type="number" min="0" step="0.01" value={example[key]} onChange={e => setExample(current => ({...current,[key]:e.target.value}))}/></label>)}
        <p aria-live="polite">{exampleValid ? `Списание: ${exampleRedeem.toFixed(2)} ₼. К оплате деньгами: ${exampleCash.toFixed(2)} ₼. Начисление: ${exampleEarn.toFixed(2)} ₼ (${exampleRate}%).` : 'Введите корректные суммы.'}</p>
      </div>}
    </aside>
  </section>{brand?.can_confirm && <LoyaltyBrandPayments key={org} organizationId={org} programVersion={version}/>}</>
}
