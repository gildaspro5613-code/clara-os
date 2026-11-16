import {withNativeScope,nativeContext} from './scoped-context';
import {RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
export type SearchKind='missions'|'conversations'|'contacts'|'journal';
export type SearchHit={label:string;href:string};
export type SearchView={state:'ready';groups:Record<SearchKind,SearchHit[]>}|{state:'denied'|'unavailable'};
const link=(page:string,kind:string,id:string)=>page+'#'+encodeURIComponent(kind+'-'+id);
/** Ephemeral presentation of the existing authorized native snapshot. No index, writes or global fallback. */
export async function readNativeSearch(request:Request,text:string,query?:RegistryQuery):Promise<SearchView>{
 if(typeof text!=='string'||!text.trim()||text.length>160)return {state:'unavailable'};
 try{return await withNativeScope(request,false,async()=>{
  const ctx=nativeContext()!,term=text.trim().toLocaleLowerCase();
  const matches=(...values:(string|undefined)[])=>values.some(v=>v?.toLocaleLowerCase().includes(term));
  return {state:'ready',groups:{
   missions:[...ctx.missions.values()].filter(m=>matches(m.title,m.objective)).slice(0,8).map(m=>({label:m.title,href:link('/missions','mission',m.id)})),
   conversations:ctx.session.conversation.filter(m=>matches(m.content)).slice(-8).reverse().map(m=>({label:m.content.slice(0,160),href:link('/conversations','message',m.id)})),
   contacts:[...ctx.intakes.entries()].filter(([,i])=>matches(i.contact.name,i.contact.email)).slice(0,8).map(([id,i])=>({label:i.contact.name||i.contact.email,href:link('/contacts','contact',id)})),
   journal:ctx.journal.filter(e=>matches(e.summary,e.details)).slice(-8).reverse().map(e=>({label:e.summary,href:link('/journal','entry',e.id)})),
  }};
 },query);}catch(error){return {state:error instanceof RegistryError&&[401,403].includes(error.status)?'denied':'unavailable'};}
}
