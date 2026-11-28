export const novemberPayrollMonth='2026-11'
export const novemberPayrollBasis = asOf => 'Google Sheets · «Начисление» на '+asOf.split('-').reverse().join('.')+'; включает переносы и распределённый центральный фонд. Только для отчёта, не выплаты.'
export const containsNovemberPayroll = (from,toExclusive) => typeof from==='string'&&typeof toExclusive==='string'&&from<='2026-11-01'&&toExclusive>='2026-12-01'
export async function readNovemberPayrollReport(client,branches,{fetchImpl=globalThis.fetch}={}) {
  const {data,error}=await client.auth.getSession()
  const token=data?.session?.access_token
  if(error||typeof token!=='string'||!token)return null
  const result=await fetchImpl('/api/rms-november-payroll-report',{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000)})
  if(result.status===401||result.status===403)return null
  if(!result.ok)throw Error('Не удалось загрузить отдельный источник начислений за ноябрь')
  const d=await result.json(), scope=new Set((branches||[]).map(branch=>String(branch.id)))
  if(d?.version!==1||d.month!==novemberPayrollMonth||!/^2026-11-(?:0[1-9]|[12]\d|30)$/.test(d.asOf||'')||!d.branchCents||Object.entries(d.branchCents).length!==6||Object.entries(d.branchCents).some(([id,n])=>!scope.has(id)||!Number.isSafeInteger(n)||n<0))throw Error('Неверные данные отчёта об начислениях за ноябрь')
  return {...d,basis:novemberPayrollBasis(d.asOf)}
}
