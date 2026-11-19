export async function verifiedImportOwner(client,{request=fetch,signal}={}){
 const session=await client.auth.getSession(),token=session.data?.session?.access_token;if(session.error||!token)throw Error('Нужен вход владельца.');
 const [response,user]=await Promise.all([request('/api/eqaime/preview-identity',{method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'same-origin',signal}),client.auth.getUser(token)]);
 if(!response.ok||(await response.json()).state!=='MATCH'||user.error||!user.data?.user?.id||user.data.user.is_anonymous)throw Error('Локальный импорт доступен только подтверждённому владельцу тестовой RMS.');
 return user.data.user.id;
}
