export async function loadBalances(client,{signal,supplier='',page=1,request=fetch}={}){
 const {data,error}=await client.auth.getSession();const token=data?.session?.access_token;if(error||!token)throw Error('Требуется подтверждённая сессия');
 const response=await request('/api/eqaime/balances?'+new URLSearchParams({supplier,page:String(page)}),{method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal});if(!response.ok)throw Error('Источник остатков временно недоступен');
 const r=await response.json();
 if(!r||!['connected','not_connected'].includes(r.sourceStatus))throw Error('Некорректный ответ остатков');
 if(r.sourceStatus==='connected'){
  if(r.finalDebt!==null||r.coverage?.complete!==false)throw Error('Некорректный ответ остатков');
  if(supplier){if(!r.group||r.group.finalDebt!==null||!Array.isArray(r.group.invoices)||!Array.isArray(r.group.payments)||r.group.invoices.length>100||r.group.payments.length>100||!Number.isInteger(r.pages)||r.pages<1)throw Error('Некорректные строки остатков')}
  else if(!Array.isArray(r.groups)||r.groups.length>1000||r.groups.some(g=>g.finalDebt!==null))throw Error('Некорректные группы остатков');
 }
 return r;
}
