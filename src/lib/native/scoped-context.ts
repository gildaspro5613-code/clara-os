import {ClaraState} from '@/lib/core/state';
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
import type {AcquisitionRecord} from '@/lib/acquisition/acquisition-store';
import type {MdProjectIntake} from '@/types';
import type {CommercialCommunicationDraft} from '@/lib/acquisition/commercial-communication-draft';
export interface ScopedNativeContext {
 query:RegistryQuery;scope:NativeSelectors&{digest:string};userId:string;session:ClaraSession;
 missions:Map<string,Mission>;journal:JournalEntry[];writes:Map<string,Mission>;entries:JournalEntry[];
 acquisitions:Map<string,AcquisitionRecord>;intakes:Map<string,MdProjectIntake>;intakeMetadata:Map<string,{productId:string;sessionKey:string;eventId:string}>;acquisitionSnapshots:Record<string,unknown>;draftWrites:Map<string,CommercialCommunicationDraft>;draftRevisionSteps:Map<string,number>;
 documentSource?:import("@/lib/brain/brain-source").BrainSourceContext;documentCommitProof?:Record<string,unknown>;
 googleWorkCommitProof?:Record<string,unknown>;
 mailCommitProof?:Record<string,unknown>;
 chatCommitProof?:Record<string,unknown>;
 contactProtocolVersion?:number;contactWrite?:Record<string,unknown>;
 writable:boolean;runtime?:Clara;dirty:boolean;commitOnFailure?:boolean;
}
const storage=new AsyncLocalStorage<ScopedNativeContext>();
export const nativeContext=()=>storage.getStore();
export function writableNativeContext(){const context=nativeContext();if(!context||!context.writable)throw new RegistryError(403,'NATIVE_WRITE_DENIED');context.dirty=true;return context;}
export function nativeMission(mission:Mission){
 const ctx=writableNativeContext();
 const isNew=!ctx.missions.has(mission.id)&&!ctx.writes.has(mission.id);
 if(isNew){
  if(mission.id.startsWith('native:'))throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
  mission.id='native:'+randomUUID();
 }
 const linked=ctx.missions.get(mission.id)?.acquisitionSubmissionId;
 if(linked){if(mission.acquisitionSubmissionId&&mission.acquisitionSubmissionId!==linked)throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');mission.acquisitionSubmissionId=linked;}
 if(ctx.session.acquisitionSubmissionId){
  if(mission.acquisitionSubmissionId&&mission.acquisitionSubmissionId!==ctx.session.acquisitionSubmissionId)throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
  if(isNew)mission.acquisitionSubmissionId=ctx.session.acquisitionSubmissionId;
 }
 ctx.missions.set(mission.id,mission);ctx.writes.set(mission.id,mission);
}
export function nativeThreadCertified(session:ClaraSession){return session.mission ? session.nativeMissionId===session.mission.id : !session.conversation.length&&!session.brainDashboard&&!session.recommendation&&!session.sources?.length&&!session.documentReferences?.length;}
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
 if(write&&data.protocolVersion!==2)throw new RegistryError(503,'NATIVE_CONVERSATION_MIGRATION_REQUIRED');
 if(write&&!nativeThreadCertified(session))throw new RegistryError(409,'NATIVE_THREAD_REVIEW_REQUIRED');
 if(!nativeThreadCertified(session)){session.state=ClaraState.STOPPED;session.brainDashboard=null;session.recommendation=null;session.sources=[];}
 const missions=(data.missions as Mission[]).map(m=>({...m,createdAt:new Date(m.createdAt)}));
 const acquisitions=new Map<string,AcquisitionRecord>(),intakes=new Map<string,MdProjectIntake>(),acquisitionSnapshots:Record<string,unknown>={},intakeMetadata=new Map<string,{productId:string;sessionKey:string;eventId:string}>();
 for(const snapshot of (data.acquisitions??[]) as Array<{record:Record<string,unknown>;intake:MdProjectIntake;intakeMetadata:{productId:string;sessionKey:string;eventId:string}}>){
  const row=snapshot.record,id=String(row.submission_id);acquisitionSnapshots[id]=snapshot;intakes.set(id,snapshot.intake);intakeMetadata.set(id,snapshot.intakeMetadata);
  acquisitions.set(id,{submissionId:id,workspaceId:String(row.workspace_id),qualification:row.qualification as AcquisitionRecord['qualification'],decisionBrief:row.decision_brief as AcquisitionRecord['decisionBrief'],lifecycle:row.lifecycle as AcquisitionRecord['lifecycle'],commercialDraft:row.commercial_draft as CommercialCommunicationDraft|null,createdAt:new Date(String(row.created_at)),updatedAt:new Date(String(row.updated_at))});
 }
 const ctx:ScopedNativeContext={contactProtocolVersion:Number(data.contactProtocolVersion??0),query,scope,userId:String(data.userId),session,acquisitions,intakes,intakeMetadata,acquisitionSnapshots,draftWrites:new Map(),draftRevisionSteps:new Map(),missions:new Map(missions.map(m=>[m.id,m])),journal:(data.journal as JournalEntry[]).map(j=>({...j,createdAt:new Date(j.createdAt)})),writes:new Map(),entries:[],writable:write,dirty:false};
 return storage.run(ctx,async()=>{
  const result=await render();
  if(write&&(ctx.dirty||ctx.chatCommitProof)){
   const discard=result instanceof Response&&result.status>=400&&!ctx.commitOnFailure;
   if(discard&&!ctx.chatCommitProof)return result;
   const commit={expected,session:ctx.session,missions:[...ctx.writes.values()],journal:ctx.entries,contactWrite:ctx.contactWrite,expectedAcquisitions:ctx.acquisitionSnapshots,acquisitions:[...ctx.draftWrites].map(([submissionId,draft])=>({submissionId,draft,revisionSteps:ctx.draftRevisionSteps.get(submissionId)}))};
   if(ctx.chatCommitProof){const {nativeChatCommands}=await import('./chat');await nativeChatCommands(query)(scope,'finish',{...ctx.chatCommitProof,commit:ctx.dirty&&!discard?commit:null});}
   else if(ctx.googleWorkCommitProof){const {googleWorkCommands}=await import('./google-work');const {operation,...proof}=ctx.googleWorkCommitProof;await googleWorkCommands(query)(String(operation),{...proof,commit});}
   else if(ctx.mailCommitProof){const {nativeMailCommands}=await import('./mail-authority');const {operation,...proof}=ctx.mailCommitProof;await nativeMailCommands(query)(String(operation),{...proof,commit});}
   else if(ctx.documentCommitProof){const {nativeGoogleCommands}=await import('./google-authority');await nativeGoogleCommands(query)('commit',{...ctx.documentCommitProof,commit});}
   else await command(scope,'commit',commit);
  }
  return result;
 });
}
export async function nativeRequest(request:Request,render:()=>Promise<Response>){try{return await withNativeScope(request,true,async()=>{await registryBody(request.clone());return render();});}catch(error){return nativeFailure(error);}}
