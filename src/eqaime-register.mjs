export async function loadEqaimeRegister(client, {signal, request = fetch} = {}) {
  const {data,error} = await client.auth.getSession()
  const token=data?.session?.access_token
  if(error || !token) throw new Error('Для реестра требуется подтверждённая сервером сессия. Локальный вход RMS не подтверждает её')
  const response = await request('/api/eqaime/review', {method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal})
  if(!response.ok) throw new Error(response.status===401?'Требуется подтверждённая сервером сессия':response.status===403?'Доступ к этому подразделу не разрешён':'Реестр временно недоступен. Частичный результат не показан')
  const report=await response.json()
  if(!report || report.status!=='blocked' || report.confirmedDebt!==null || report.primaryCoverage!==null || !Array.isArray(report.rows) || !Array.isArray(report.payments)) throw new Error('Некорректный ответ реестра')
  return report
}
