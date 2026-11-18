import {createClient} from '@supabase/supabase-js';
import {mountReadCanary} from './read-canary-probe.mjs';
const sha256=async(bytes)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
export async function mountOwnerReadCanary(root,{ownerClient,ownerDigest,isActive=()=>true}){
 if(!/^[a-f0-9]{64}$/.test(ownerDigest||''))return ()=>{};
 const who=await ownerClient.auth.getUser();
 if(!isActive()||who.error||!who.data?.user||who.data.user.is_anonymous)return ()=>{};
 const id=who.data.user.id;
 if(await sha256(new TextEncoder().encode(id))!==ownerDigest||!isActive())return ()=>{};
 const anonymousClient=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'rms-canary-anonymous'}});
 if(!isActive())return ()=>{};
 return mountReadCanary(root,{ownerClient,anonymousClient,expectedOwnerId:id,sha256});
}
