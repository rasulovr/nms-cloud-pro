export async function loadEqaimeRegister(client, {signal, request = fetch} = {}) {
  const {data,error} = await client.auth.getSession()
  const token=data?.session?.access_token
  if(error || !token) throw new Error('Для реестра требуется подтверждённая сервером сессия. Локальный вход RMS не подтверждает её')
  const response = await request('/api/eqaime/review', {method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal})
  if(!response.ok){
    let code=''
    try{const body=await response.json();if(/^EQ_(CONFIG|AUTH|ACCESS|REQUEST|READ|TIMEOUT|PAYLOAD|PROCESS|STARTUP)$/.test(body?.code||''))code=body.code}catch{}
    throw new Error((response.status===401?'Требуется подтверждённая сервером сессия':response.status===403?'Доступ к этому подразделу не разрешён':'Реестр временно недоступен')+(code?` [${code}]`:''))
  }
  const report=await response.json()
  if(!report || report.status!=='blocked' || report.confirmedDebt!==null || report.primaryCoverage!==null || !Array.isArray(report.rows) || !Array.isArray(report.payments) || !Array.isArray(report.groups)) throw new Error('Некорректный ответ реестра')
  const rowIds=new Set(report.rows.map(x=>x.id)),groupIds=new Set(),children=new Set()
  if(rowIds.size!==report.rows.length || rowIds.has(undefined))throw new Error('Некорректный состав реестра')
  for(const group of report.groups){
    if(!group.id || groupIds.has(group.id) || !Array.isArray(group.childIds) || !group.childIds.length || group.primaryAmount!==null)throw new Error('Некорректная группировка реестра')
    groupIds.add(group.id)
    for(const id of group.childIds){if(!rowIds.has(id)||children.has(id))throw new Error('Некорректные связи группы');children.add(id)}
  }
  if(children.size!==rowIds.size)throw new Error('Неполная группировка реестра')
  return report
}
