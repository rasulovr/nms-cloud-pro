async function verifiedIdentity(client,{request=fetch,signal}={}){
 const session=await client.auth.getSession(),token=session.data?.session?.access_token;if(session.error||!token)throw Error('Нужен вход владельца.');
 const [response,user]=await Promise.all([request('/api/eqaime/preview-identity',{method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal}),client.auth.getUser(token)]);
 const body=await response.json();
 if(!response.ok||body.state!=='MATCH'||user.error||!user.data?.user?.id||user.data.user.is_anonymous)throw Error('Локальный импорт доступен только подтверждённому владельцу тестовой RMS.');
 return {account:user.data.user.id,scopeEntityHash:body.scopeEntityHash};
}

export async function verifiedImportOwner(client,options){return (await verifiedIdentity(client,options)).account}
export async function verifiedImportScope(client,options){const r=await verifiedIdentity(client,options);if(!/^entity-sha256:v1:[a-f0-9]{64}$/.test(r.scopeEntityHash||''))throw Error('Область RMS не подтверждена');return r}
export async function entityScopeHash(id){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rms-eqaime-legal-entity-v1:'+id));return 'entity-sha256:v1:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
