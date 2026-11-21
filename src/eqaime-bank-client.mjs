export async function loadBankPage(client,{signal,page=1,from='',to='',search='',supplier='',request=fetch}={}){
 const {data,error}=await client.auth.getSession();const token=data?.session?.access_token;if(error||!token)throw Error('Требуется подтверждённая сессия');
 const query=new URLSearchParams({page:String(page),from,to,search,supplier});const response=await request('/api/eqaime/bank?'+query,{method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal});if(!response.ok)throw Error('Банковский источник временно недоступен');
 const r=await response.json();if(!r||!['connected','not_connected'].includes(r.sourceStatus)||!Array.isArray(r.rows)||r.rows.length>100||!Number.isInteger(r.total)||!Number.isInteger(r.pages)||r.total<0||r.pages<1)throw Error('Некорректный банковский ответ');
 const seen=new Set();for(const x of r.rows){if(!x.id||seen.has(x.id)||typeof x.amount!=='string'||!/^\d+(\.\d+)?$/.test(x.amount)||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||typeof x.purpose!=='string'||!Array.isArray(x.electronicInvoiceNumbers))throw Error('Некорректная банковская строка');seen.add(x.id)}return r;
}
