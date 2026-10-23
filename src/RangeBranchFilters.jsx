import React, {useEffect,useId,useRef,useState} from 'react'
import {checkedBranchIds,defaultProfitabilityRange,isMonth,profitabilityRangePayload} from './profitability-range.mjs'
import './profitability-range-filters.css'
const words={
  ru:{period:'Период',from:'С месяца',to:'По месяц включительно',branches:'Филиалы',all:'Все филиалы',choose:'Выберите филиалы',selected:'Выбрано',selectAll:'Выбрать все',clear:'Снять выбор',done:'Готово',apply:'Показать отчёт',hint:'Период задаётся полными месяцами. Начисления не пересчитываются по дням.',invalid:'Выберите начальный и конечный месяцы.',reversed:'Конец периода не может быть раньше начала.',empty:'Выберите хотя бы один филиал.',none:'Нет доступных филиалов.'},
  az:{period:'Dövr',from:'Başlanğıc ay',to:'Son ay daxil olmaqla',branches:'Filiallar',all:'Bütün filiallar',choose:'Filialları seçin',selected:'Seçilib',selectAll:'Hamısını seç',clear:'Seçimi sil',done:'Hazır',apply:'Hesabatı göstər',hint:'Dövr tam aylarla seçilir. Hesablamalar günlərə görə yenidən bölünmür.',invalid:'Başlanğıc və son ayı seçin.',reversed:'Son ay başlanğıc ayından əvvəl ola bilməz.',empty:'Ən azı bir filial seçin.',none:'Əlçatan filial yoxdur.'}
}
export default function RangeBranchFilters({value,selectedBranchIds,branches=[],onApply,lang='ru',disabled=false}) {
  const w=words[lang==='az'?'az':'ru'], id=useId(), root=useRef(null), trigger=useRef(null)
  const initial=value || defaultProfitabilityRange()
  const [from,setFrom]=useState(initial.from?.slice(0,7)||''),[to,setTo]=useState(initial.to?.slice(0,7)||'')
  const [selected,setSelected]=useState(()=>checkedBranchIds(selectedBranchIds===undefined?branches.map(b=>b.id):selectedBranchIds,branches))
  const [open,setOpen]=useState(false),[error,setError]=useState('')
  const branchesKey=JSON.stringify(branches.map(b=>String(b.id))), selectedKey=JSON.stringify(selectedBranchIds)
  useEffect(()=>{if(value){setFrom(value.from?.slice(0,7)||'');setTo(value.to?.slice(0,7)||'');setError('')}},[value?.from,value?.to])
  useEffect(()=>{setSelected(old=>checkedBranchIds(selectedBranchIds===undefined?branches.map(b=>b.id):selectedBranchIds,branches))},[selectedKey,branchesKey])
  useEffect(()=>{if(disabled)setOpen(false)},[disabled])
  useEffect(()=>{
    if(!open)return
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false)}
    const escape=event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
  },[open])
  const ids=checkedBranchIds(selected,branches)
  const all=branches.length>0&&ids.length===new Set(branches.map(b=>String(b.id))).size
  const names=branches.filter(b=>ids.includes(String(b.id))).map(b=>b.name)
  const caption=all?w.all:ids.length===1?names[0]:ids.length?`${w.selected}: ${ids.length}`:w.choose
  const apply=()=>{
    if(!isMonth(from)||!isMonth(to)){setError(w.invalid);return}
    if(from>to){setError(w.reversed);return}
    if(!ids.length){setError(w.empty);return}
    setError('');setOpen(false);onApply(profitabilityRangePayload(from,to,ids,branches))
  }
  return <section className="profit-range-filters" aria-label={w.period}>
    <div className="profit-range-dates"><label htmlFor={`${id}-from`}>{w.from}<input id={`${id}-from`} type="month" value={from} max={to||undefined} disabled={disabled} onChange={event=>{setFrom(event.target.value);setError('')}} /></label><label htmlFor={`${id}-to`}>{w.to}<input id={`${id}-to`} type="month" value={to} min={from||undefined} disabled={disabled} onChange={event=>{setTo(event.target.value);setError('')}} /></label></div>
    <div className="profit-range-branches" ref={root}><span id={`${id}-branch-label`}>{w.branches}</span><button ref={trigger} type="button" className="profit-range-trigger" aria-labelledby={`${id}-branch-label ${id}-caption`} aria-expanded={open} aria-controls={`${id}-options`} disabled={disabled||!branches.length} onClick={()=>setOpen(!open)}><span id={`${id}-caption`}>{caption}</span><span aria-hidden="true">▾</span></button>
      {open&&<div className="profit-range-popover" id={`${id}-options`} role="group" aria-label={w.branches}><div className="profit-range-options-actions"><button type="button" onClick={()=>setSelected(checkedBranchIds(branches.map(b=>b.id),branches))}>{w.selectAll}</button><button type="button" onClick={()=>setSelected([])}>{w.clear}</button></div><div className="profit-range-options">{branches.map(branch=><label key={branch.id}><input type="checkbox" checked={ids.includes(String(branch.id))} onChange={event=>{const key=String(branch.id);setSelected(old=>event.target.checked?[...new Set([...old,key])]:old.filter(id=>id!==key));setError('')}}/><span>{branch.name}</span></label>)}</div><button type="button" className="profit-range-close" onClick={()=>{setOpen(false);trigger.current?.focus()}}>{w.done}</button></div>}
    </div>
    <button type="button" className="profit-range-apply" disabled={disabled||!branches.length} onClick={apply}>{w.apply}</button>
    <p className="profit-range-hint">{branches.length?w.hint:w.none}</p>{error&&<p className="profit-range-error" role="alert">{error}</p>}
  </section>
}
