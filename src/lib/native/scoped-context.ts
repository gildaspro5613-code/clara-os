import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {sql} from '@/lib/core/store/database';
import {RegistryError,databaseError,type RegistryQuery} from '@/lib/canonical/registry';
import {nativeSelectors,nativeFailure,type NativeSelectors} from './authority';
import {sameOrigin,registryBody} from '@/lib/canonical/http';
import {normalizeSession,type ClaraSession} from '@/lib/core/session';
import type {Mission} from '@/modules/missions/types/Mission';
import type {JournalEntry} from '@/lib/core/journal-entry';
import type {Clara} from '@/lib/core/clara';
export interface ScopedNativeContext {
 scope:NativeSelectors&{digest:string};userId:string;session:ClaraSession;
 missions:Map<string,Mission>;journal:JournalEntry[];writes:Map<string,Mission>;entries:JournalEntry[];
 writable:boolean;runtime?:Clara;dirty:boolean;commitOnFailure?:boolean;
}
const storage=new AsyncLocalStorage<ScopedNativeContext>();
export const nativeContext=()=>storage.getStore();
export function writableNativeContext(){const context=nativeContext();if(!context||!context.writable)throw new RegistryError(403,'NATIVE_WRITE_DENIED');context.dirty=true;return context;}
export function nativeMission(mission:Mission){
 const ctx=writableNativeContext();
 if(!ctx.missions.has(mission.id)&&!ctx.writes.has(mission.id)){
  if(mission.id.startsWith('native:'))throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
  mission.id='native:'+randomUUID();
 }
 ctx.missions.set(mission.id,mission);ctx.writes.set(mission.id,mission);
}
export function hydrateNative(data:Record<string,unknown>):ClaraSession {
 const parsed=normalizeSession(data as unknown as ClaraSession);
 return {...parsed,startedAt:new Date(parsed.startedAt),updatedAt:new Date(parsed.updatedAt)};
}
export function nativeCommands(query:RegistryQuery=sql){
 return async(scope:NativeSelectors&{digest:string},operation:string,payload:unknown={})=>{
  try{
   const rows=await query`SELECT clara_native_runtime_command(${scope.digest},${scope.workspaceId},${scope.clientId},${scope.projectId},${scope.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;
   const data=(rows[0] as {data?:Record<string,unknown>})?.data;if(!data)throw new RegistryError(503,'NATIVE_RUNTIME_UNAVAILABLE');return data;
  }catch(error){if((error as {code?:string})?.code==='40001')throw new RegistryError(409,'NATIVE_REVISION_CONFLICT');databaseError(error);}
 };
}
export const nativeCommand=nativeCommands();
export async function withNativeScope<T>(request:Request,write:boolean,render:()=>Promise<T>,query:RegistryQuery=sql):Promise<T>{
 const scope=nativeSelectors(request);if(write)sameOrigin(request);
 const command=nativeCommands(query),data=await command(scope,write?'write':'read');
 const expected=structuredClone(data.session),session=hydrateNative(data.session as Record<string,unknown>);
 const missions=(data.missions as Mission[]).map(m=>({...m,createdAt:new Date(m.createdAt)}));
 const ctx:ScopedNativeContext={scope,userId:String(data.userId),session,missions:new Map(missions.map(m=>[m.id,m])),journal:(data.journal as JournalEntry[]).map(j=>({...j,createdAt:new Date(j.createdAt)})),writes:new Map(),entries:[],writable:write,dirty:false};
 return storage.run(ctx,async()=>{
  const result=await render();
  if(write&&ctx.dirty){
   if(result instanceof Response&&result.status>=400&&!ctx.commitOnFailure)return result;
   await command(scope,'commit',{expected,session:ctx.session,missions:[...ctx.writes.values()],journal:ctx.entries});
  }
  return result;
 });
}
export async function nativeRequest(request:Request,render:()=>Promise<Response>){try{return await withNativeScope(request,true,async()=>{await registryBody(request.clone());return render();});}catch(error){return nativeFailure(error);}}
