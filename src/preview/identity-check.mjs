export async function checkPreviewIdentity(client,{request=fetch,signal}={}){
 try{
  const before=await client.auth.getUser();
  if(before.error||!before.data?.user||before.data.user.is_anonymous)return 'SIGN_IN_REQUIRED';
  // Ordinary in-app transport, as for other existing authenticated APIs.
  // No session is exposed to UI, logs, agent or another origin.
  const session=await client.auth.getSession();
  if(session.error||!session.data?.session?.access_token)return 'SIGN_IN_REQUIRED';
  if(session.data.session.user?.id!==before.data.user.id||session.data.session.user?.is_anonymous)return 'SESSION_CHANGED';
  const response=await request('/api/eqaime/preview-identity',{method:'GET',headers:{Authorization:`Bearer ${session.data.session.access_token}`},credentials:'same-origin',cache:'no-store',signal});
  const result=await response.json();
  const after=await client.auth.getUser();
  if(after.error||!after.data?.user||after.data.user.is_anonymous||before.data.user.id!==after.data.user.id)return 'SESSION_CHANGED';
  if(response.status===200&&['MATCH','MISMATCH'].includes(result.state))return result.state;
  return response.status===401?'SIGN_IN_REQUIRED':'UNAVAILABLE';
 }catch{return 'UNAVAILABLE'}
}
export function mountIdentityCheck(root,{client}){
 const doc=root.ownerDocument,button=doc.createElement('button'),result=doc.createElement('p');let active=true;const controller=new AbortController();
 button.textContent='Проверить связь аккаунта владельца';
 result.setAttribute('role','status');root.replaceChildren(button,result);
 const labels={MATCH:'MATCH: подтверждённый аккаунт совпадает с проверенной серверной привязкой владельца.',MISMATCH:'MISMATCH: аккаунт не совпадает с серверной привязкой владельца.',SIGN_IN_REQUIRED:'Нужен подтверждённый вход в RMS.',SESSION_CHANGED:'Сеанс изменился. Результат отброшен.',UNAVAILABLE:'Проверка недоступна. Совпадение не подтверждено.'};
 button.onclick=async()=>{button.disabled=true;result.textContent='Проверка…';const state=await checkPreviewIdentity(client,{signal:controller.signal});if(active){result.textContent=labels[state];button.disabled=false;}};
 return ()=>{active=false;controller.abort();button.onclick=null;root.replaceChildren();};
}
