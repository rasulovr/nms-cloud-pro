import { readFileSync } from 'node:fs'
import { transformWithEsbuild } from 'vite'

// This draft deploys only a synthetic editor. Never import the application/Supabase
// entry into the Preview bundle, even when the host provides production env vars.
export function adminExpensePreviewPlugin() {
  const id = '\0virtual:rms-admin-expense-preview'
  return {
    name: 'isolated-admin-expense-preview',
    enforce: 'pre',
    configResolved() {
      if (process.env.VERCEL_ENV === 'production') {
        throw new Error('This isolated expense draft is Preview-only. Production deployment is not supported.')
      }
    },
    resolveId(source) { if (source === 'virtual:rms-admin-expense-preview') return id },
    async load(source) {
      if (source !== id) return null
      const part2 = readFileSync(new URL('../src/main.parts/part-02.jsxpart', import.meta.url), 'utf8')
      const part3 = readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
      const row = part3.slice(part3.indexOf('function ExpenseRow('), part3.indexOf('\nfunction ExpenseNameInput'))
      const handlers = part2.slice(part2.indexOf('  async function updateExpense('), part2.indexOf('  async function addInflow('))
      if (!row.startsWith('function ExpenseRow(') || !handlers.includes('rms_expense_update_secure')) throw new Error('Expense extraction failed')
      const code = `
import React, {useState, useRef} from 'react'
import {createPortal} from 'react-dom'
import {expenseEditAccess, expenseEditPatch} from '/src/expenseEditPolicy.mjs'
const todayISO = () => new Date().toISOString().slice(0,10)
const fmt = value => Number(value || 0).toFixed(2)
const formatDT = value => new Date(value).toLocaleString('ru-RU')
const parseNum = value => Number(String(value ?? '').replace(',', '.')) || 0
const isBazarExpenseName = value => String(value).toLowerCase() === 'базар'
const canEditWithinWeek = row => row?.created_at ? Date.now() - new Date(row.created_at).getTime() <= 604800000 : true
const DateInput = props => <input type="date" {...props}/>
${row}
export {ExpenseRow}
export function createExpenseHandlers(context) {
 const {expenses,isAdmin,setExpenses,setMessage,branchId,date,currentUserMeta,hydrateExpenseForLocalState,expenseNameFromPatch,distributeBazarExpense,loadMonthStats,loadLogs,load,supabase} = context
 ${handlers}
 return {updateExpense,cancelExpense}
}`
      return (await transformWithEsbuild(code, 'admin-expense-preview.jsx', {loader:'jsx',jsx:'automatic'})).code
    }
  }
}
