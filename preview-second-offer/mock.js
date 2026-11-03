const rows = [
 ['b769d1a8-fe80-430e-9df0-62f0ed82ebb0','Вильямс Бургер','Vilyams Burger','Williams Burger','БУРГЕРЫ',13.9,'recovered/c4ccdb59-de63-4967-bb83-9beadae04efa.webp'],
 ['91d2c7d5-e397-4ed1-ae62-d6d5443fa13c','Ананас Розмарин','Ananas Rozmarin','Pineapple Rosemary','ЛИМОНАДЫ',6,'bc-076-pineapple-rosemary.webp'],
 ['v2-duck','Утиная грудка с овощами','Tərəvəzli ördək döş əti','Duck breast with vegetables','ГОРЯЧИЕ БЛЮДА',24,'bc-004-duck-full.webp'],
 ['v2-chicken','Пицца с курицей и грибами','Toyuq və göbələkli pizza','Chicken and mushroom pizza','ГОРЯЧИЕ БЛЮДА',18,'chicken-funghi-full.webp'],
 ['bc-003','Сырники со сметаной и ягодами','Xama və giləmeyvə ilə sırniklər','Syrniki with berries','ЗАВТРАК',12,'bc-003-syrniki-full.webp'],
 ['v2-tonic','Эспрессо-тоник','Espresso tonik','Espresso tonic','КОФЕ',8,'bc-068-espresso-tonic-full.webp'],
 ['v2-latte','Холодный латте','Soyuq latte','Iced latte','КОФЕ',7,'bc-074-cold-latte-full.webp'],
 ['v2-lemonade','Ананас и розмарин','Ananas və rozmarin','Pineapple and rosemary','ЛИМОНАДЫ',9,'bc-076-pineapple-rosemary.webp'],
 ['v2-syrniki-long','Нежные сырники с сезонными ягодами и домашним сметанным кремом','Mövsümi giləmeyvələr və ev üsulu xama kremi ilə zərif sırniklər','Syrniki with seasonal berries and homemade cream','ЗАВТРАК',14,'bc-003-syrniki-full.webp'],
 ['v2-aloe','Алоэ и гранат','Aloe və nar','Aloe and pomegranate','ЛИМОНАДЫ',9,'bc-078-aloe-pomegranate.webp']
].map(([id,ru,az,en,category,price,image])=>({id,name:ru,category,price,image:'/menu/'+image,is_available:true,description:'Описание блюда для локальной проверки макета. Состав и цены — синтетические.',translations:{ru:{name:ru,description:'Описание блюда для локальной проверки макета. Состав и цены — синтетические.'},az:{name:az,description:'Maket yoxlaması üçün nümunə təsvir. Tərkib və qiymətlər sintetikdir.'},en:{name:en,description:'Synthetic description for local layout checks. Ingredients and prices are test fixtures.'}}}));
window.__mockWrites=[];
const result = data => Promise.resolve({data,error:null});
export const supabase={
 rpc(name,args){
   if(name==='qr_get_public_menu') {
     const state=new URLSearchParams(location.search).get('menuState');
     if(state==='error') return Promise.resolve({data:null,error:{message:'SYNTHETIC menu unavailable'}});
     if(state==='missing') return result(rows.slice(1));
     if(state==='empty') return result([]);
     if(state==='stopped') return result(rows.map(r=>({...r,is_available:false})));
     if(state==='no-photos') return result(rows.map(r=>({...r,name:'SYNTHETIC no photo '+r.id,translations:{},image:null})));
     if(state==='first-stopped') return result(rows.map((r,i)=>({...r,is_available:i!==0})));
     return result(rows);
   }
   if(name==='qr_get_my_loyalty') return result(new URLSearchParams(location.search).get('fixture')==='member' ? {available_bonus:12.5} : new URLSearchParams(location.search).get('fixture')==='unknown' ? {} : null);
   if(name==='qr_get_order') return result(null);
   window.__mockWrites.push({name,args}); return Promise.resolve({data:null,error:{message:'LOCAL PREVIEW: external writes disabled'}});
 },
 from(name){const chain={select(){return chain},eq(){return chain},maybeSingle(){return result(null)},then(fn){return result([]).then(fn)}};return chain},
 auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},getSession(){return result({session:new URLSearchParams(location.search).has('fixture') ? {user:{id:'SYNTHETIC-PREVIEW'}} : null})},signInWithOtp(args){window.__mockWrites.push({name:'otp',args});return Promise.resolve({error:{message:'LOCAL PREVIEW: SMS disabled'}})},verifyOtp(){return Promise.resolve({error:{message:'LOCAL PREVIEW: verification disabled'}})},signOut(){return result(null)}}
};
