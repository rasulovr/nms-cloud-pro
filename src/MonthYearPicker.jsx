import React, { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './month-year-picker.css'

const text = {
  ru: { month: 'Месяц', year: 'Год', title: 'Месяц и год', reset: 'Сбросить', done: 'Готово', close: 'Отмена', all: 'Все годы / все месяцы', mode: 'Период', monthly: 'Месяц', yearly: 'Год', hint: 'Сбросить к текущему месяцу' },
  az: { month: 'Ay', year: 'İl', title: 'Ay və il', reset: 'Sıfırla', done: 'Hazır', close: 'Ləğv et', all: 'Bütün illər / aylar', mode: 'Dövr', monthly: 'Ay', yearly: 'İl', hint: 'Cari aya sıfırla' }
}
export function currentBakuMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit' }).formatToParts(now)
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`
}
const valid = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value))
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const labelMonth = (value, lang) => new Intl.DateTimeFormat(lang === 'az' ? 'az-AZ' : 'ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`))

const Wheel = forwardRef(function Wheel({ items, value, onChange, label }, forwardedRef) {
  const ref = useRef(null)
  const timer = useRef(null)
  const id = useId()
  const index = Math.max(0, items.findIndex(item => item.value === value))
  useLayoutEffect(() => {
    const element = ref.current
    if (element && Math.abs(element.scrollTop - index * 44) > 1) element.scrollTop = index * 44
  }, [index])
  useEffect(() => () => clearTimeout(timer.current), [])
  const choose = next => { clearTimeout(timer.current); onChange(items[clamp(next, 0, items.length - 1)].value) }
  useImperativeHandle(forwardedRef, () => ({ value: () => items[clamp(Math.round((ref.current?.scrollTop || 0) / 44), 0, items.length - 1)].value }))
  return <div className="rms-month-wheel" ref={ref} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`${id}-${index}`}
    onKeyDown={event => {
      const delta = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[event.key]
      if (delta != null || event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); choose(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index + delta)
      }
    }}
    onScroll={event => {
      const element = event.currentTarget
      clearTimeout(timer.current)
      timer.current = setTimeout(() => choose(Math.round(element.scrollTop / 44)), 100)
    }}>
    {items.map((item, i) => <div id={`${id}-${i}`} key={item.value} role="option" aria-selected={i === index} className={`rms-month-option${i === index ? ' is-selected' : ''}`} onClick={() => choose(i)}>{item.label}</div>)}
  </div>
})

export default function MonthYearPicker({ value, onChange, lang = 'ru', label, disabled = false, minYear = 2000, maxYear = 2100 }) {
  const words = text[lang === 'az' ? 'az' : 'ru']
  const normalize = source => {
    const input = valid(source) ? source : currentBakuMonth()
    return `${clamp(Number(input.slice(0, 4)), minYear, maxYear)}-${input.slice(5, 7)}`
  }
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [draft, setDraft] = useState(() => normalize(value))
  const trigger = useRef(null), dialog = useRef(null), monthWheel = useRef(null), yearWheel = useRef(null)
  const id = useId()
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => {
    if (!open) return
    dialog.current?.querySelector('[role="listbox"]')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])
  // External navigation/filter changes discard stale uncommitted choices.
  useEffect(() => { setOpen(false); setDraft(normalize(value)) }, [value])
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({ value: String(minYear + i), label: String(minYear + i) }))
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: new Intl.DateTimeFormat(lang === 'az' ? 'az-AZ' : 'ru-RU', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, i, 1))) }))
  return <>
    <button className="rms-month-trigger" ref={trigger} type="button" disabled={disabled} aria-label={`${label || words.title}: ${labelMonth(normalize(value), lang)}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setDraft(normalize(value)); setOpen(true) }}><span>{labelMonth(normalize(value), lang)}</span><span aria-hidden="true">▾</span></button>
    {open && createPortal(<div className="rms-month-overlay" onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="rms-month-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close() }
        if (event.key === 'Tab') {
          const nodes = [...dialog.current.querySelectorAll('button:not(:disabled),[tabindex="0"]')]
          const first = nodes[0], last = nodes[nodes.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
      }}>
        <header><strong id={`${id}-title`}>{label || words.title}</strong><button type="button" aria-label={words.close} onClick={close}>×</button></header>
        <div className="rms-month-columns"><Wheel key={`month-${resetKey}`} ref={monthWheel} items={months} value={draft.slice(5)} label={words.month} onChange={month => setDraft(old => `${old.slice(0, 4)}-${month}`)}/><Wheel key={`year-${resetKey}`} ref={yearWheel} items={years} value={draft.slice(0, 4)} label={words.year} onChange={year => setDraft(old => `${year}-${old.slice(5)}`)}/></div>
        <footer><button type="button" title={words.hint} onClick={() => { setDraft(normalize(currentBakuMonth())); setResetKey(key => key + 1) }}>{words.reset}</button><button type="button" className="rms-month-done" onClick={() => { onChange(`${yearWheel.current.value()}-${monthWheel.current.value()}`); close() }}>{words.done}</button></footer>
      </div>
    </div>, document.body)}
  </>
}

// Preserve existing all/year report modes; only monthly selection changes UI.
export function ReportMonthPeriod({ value, onChange, years = [], lang = 'ru', disabled = false, allowYear = true }) {
  const words = text[lang === 'az' ? 'az' : 'ru']
  const mode = value === 'all' ? 'all' : String(value).startsWith('year:') ? 'year' : 'month'
  const yearValues = [...new Set([...years.map(String), currentBakuMonth().slice(0, 4), ...(mode === 'year' ? [String(value).slice(5)] : [])])].sort().reverse()
  return <div className="rms-report-period">
    <select aria-label={words.mode} value={mode} disabled={disabled} onChange={event => onChange(event.target.value === 'all' ? 'all' : event.target.value === 'year' ? `year:${currentBakuMonth().slice(0, 4)}` : currentBakuMonth())}><option value="all">{words.all}</option><option value="month">{words.monthly}</option>{(allowYear || mode === 'year') && <option value="year">{words.yearly}</option>}</select>
    {mode === 'month' && <MonthYearPicker value={value} onChange={onChange} lang={lang} disabled={disabled}/>}
    {mode === 'year' && <select aria-label={words.year} value={String(value).slice(5)} disabled={disabled} onChange={event => onChange(`year:${event.target.value}`)}>{yearValues.map(year => <option key={year} value={year}>{year}</option>)}</select>}
  </div>
}
