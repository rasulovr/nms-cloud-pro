import { bankExpenseGroup } from './profitability-bank.mjs'
export const MONTHLY_COLUMNS = [['purchases','Базар / закупки'],['tax','Налог'],['dsmf','DSMF'],['salary','Зарплаты'],['rent','Аренда'],['utilities','Коммунальные'],['other','Прочие']]
// Display-only grouping: no allocation, rate, accrual or source modifications.
export function monthlyViewRows(section, monthly = true) {
  const definitions = new Map(section.categories.map(category => [category.key,category]))
  const rows = section.monthly.map(row => {
    const values=Object.fromEntries(MONTHLY_COLUMNS.map(([key])=>[key,0]));const present={}
    for(const [key,amount] of Object.entries(row.categories || {})) {
      const category=definitions.get(key) || {key,name:key}
      if(category.informational || key==='tax-paid') continue
      const group=bankExpenseGroup(category)
      const target=key==='tax'?'tax':group==='dsmf-tax'?'dsmf':group==='food'?'purchases':['salary','rent','utilities'].includes(group)?group:'other'
      values[target]+=Number(amount)||0;present[target]=true
    }
    return {...row,displayCategories:values,displayPresent:present}
  })
  if(monthly)return rows
  const total={month:null,revenue:section.totals.revenue,expenses:section.totals.expenses,net:section.totals.net,margin:section.totals.margin,displayCategories:Object.fromEntries(MONTHLY_COLUMNS.map(([key])=>[key,0])),displayPresent:{}}
  for(const row of rows)for(const [key,value] of Object.entries(row.displayCategories)){total.displayCategories[key]+=value;if(row.displayPresent[key])total.displayPresent[key]=true}
  return [total]
}

// Labels for this newly added view only; the legacy report keeps its existing localization.
const AZ_MONTHLY = { 'Помесячно':'Aylar üzrə','За период':'Dövr üzrə','Все месяцы выбранного периода в одном отчёте':'Seçilmiş dövrün bütün ayları bir hesabatda','Помесячные итоги, AZN':'Aylıq yekunlar, AZN','Итоги периода, AZN':'Dövrün yekunları, AZN','Месяц':'Ay','Период':'Dövr','Выручка':'Dövriyyə','Базар / закупки':'Bazar / alışlar','Налог':'Vergi','DSMF':'DSMF','Зарплаты':'Əməkhaqqı','Аренда':'İcarə','Коммунальные':'Kommunal xərclər','Прочие':'Digər','Расходы':'Xərclər','Расчётный результат':'Hesablanmış nəticə','Маржа':'Marja','Весь период':'Bütün dövr','Итого':'Cəmi','Закупки не равны себестоимости потребления. «—» — нет отдельно выделенных данных.':'Alışlar istehlakın maya dəyərinə bərabər deyil. «—» — ayrıca ayrılmış məlumat yoxdur.' }
export const monthlyText = (text,lang) => lang==='az' ? AZ_MONTHLY[text] || text : text
export const monthlyLabel = (month,lang) => new Intl.DateTimeFormat(lang==='az'?'az-AZ':'ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`))
