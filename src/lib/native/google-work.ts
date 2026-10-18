import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import type {drive_v3,calendar_v3} from 'googleapis';
import type {OAuth2Client} from 'google-auth-library';
import {DriveClient} from '@/lib/connectors/internal/google/drive/drive-client';
import {CalendarClient} from '@/lib/connectors/google/calendar/calendar-client';
import {googleAuthority,nativeGoogleCommand,type NativeGoogleProof} from './google-authority';
import {nativeContext,writableNativeContext,nativeMission,withNativeScope} from './scoped-context';
import {RegistryError,databaseError,type RegistryQuery} from '@/lib/canonical/registry';
import {encryptCredentialPayload,decryptCredentialPayload} from '@/lib/connections/credential-store';
import {jobFingerprint} from '@/lib/external-capabilities/event-jobs';
import {writeActionEntry} from '@/lib/core/journal-writer';
import {Journal} from '@/lib/core/journal';
export const GOOGLE_SCOPES={read:['openid','https://www.googleapis.com/auth/drive.readonly'],agenda:['https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events'],drive:['https://www.googleapis.com/auth/drive.file'],existing:['https://www.googleapis.com/auth/drive']} as const;
export type GoogleWorkKind='calendar.create'|'calendar.update'|'drive.upload'|'drive.create'|'drive.update'|'drive.move';
export interface GoogleWorkInput {operationId:string;kind:GoogleWorkKind;resourceId:string;name:string;content?:string;mimeType?:string;fileId?:string;eventId?:string;start?:string;end?:string;description?:string}
type Resource={bindingId:string;resourceId:string;kind:string;metadata:Record<string,string>};
export interface GooglePlan {input:GoogleWorkInput;inputHash:string;planHash?:string;marker:string;targetId:string;resources:Resource[];etag?:string;previousParents?:string[];previousProperties?:Record<string,string>;previousChecksum?:string;previousPrivate?:Record<string,string>;contentHash?:string;missionId:string;connectionId:string}
type Receipt={id:string;version:string;name:string;kind:GoogleWorkKind;operationId:string};
type Job={jobId?:string;status?:string;expired?:boolean;ownerToken?:string;request?:{inputHash:string;planHash:string;encryptedPlan:string;authorityRevision:number};result?:{encryptedResult:string}};
export interface GoogleClients {drive:drive_v3.Drive;calendar:calendar_v3.Calendar;mutate?:(plan:GooglePlan)=>Promise<void>}
export type GoogleClientFactory=(id:string)=>Promise<GoogleClients>;
const factory:GoogleClientFactory=async id=>({drive:await new DriveClient().create(id),calendar:await new CalendarClient().create(id)});
const digest=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
export const googleWorkCommands=(query?:RegistryQuery)=>async(operation:string,payload:Record<string,unknown>={})=>{
 const ctx=nativeContext();if(!ctx)throw new RegistryError(403,'NATIVE_GOOGLE_SCOPE_REQUIRED');const s=ctx.scope;
 try{const rows=await(query??ctx.query)`SELECT clara_native_google_work_command(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;return (rows[0] as {data:Record<string,unknown>}).data;}catch(error){if((error as {code?:string}).code==='40001'){const detail=String((error as {message?:string}).message??'')+String((error as {detail?:string}).detail??'');throw new RegistryError(409,detail.includes('GOOGLE_RECONCILIATION_REQUIRED')?'GOOGLE_RECONCILIATION_REQUIRED':'GOOGLE_WORK_CONFLICT');}databaseError(error);}
};
export const googleWorkCommand=googleWorkCommands();
export class GoogleWorkRefused extends RegistryError{constructor(status:number){super(status,'GOOGLE_PROVIDER_REFUSED');}}
const etagOf=(headers:unknown)=>{const h=headers as {get?:(k:string)=>string|null;etag?:string};return typeof h?.get==='function'?h.get('etag')??undefined:typeof h?.etag==='string'?h.etag:undefined;};
const fileId=(value:string)=>{if(!/^[a-zA-Z0-9_-]{1,400}$/.test(value)||value==='root')throw new RegistryError(400,'GOOGLE_EXPLICIT_RESOURCE_REQUIRED');return value;};
export function normalizeGoogleWorkInput(value:GoogleWorkInput):GoogleWorkInput{
 if(['operationId','kind','resourceId','name','content','mimeType','fileId','eventId','start','end','description'].some(key=>value[key as keyof GoogleWorkInput]!==undefined&&typeof value[key as keyof GoogleWorkInput]!=='string'))throw new RegistryError(400,'GOOGLE_WORK_INVALID');
 if(!/^[a-zA-Z0-9_-]{16,80}$/.test(value.operationId)||!['calendar.create','calendar.update','drive.upload','drive.create','drive.update','drive.move'].includes(value.kind)||typeof value.name!=='string'||!value.name.trim()||value.name.length>200||/[\x00-\x1f\x7f]/.test(value.name)||typeof value.resourceId!=='string'||value.resourceId.length>400)throw new RegistryError(400,'GOOGLE_WORK_INVALID');
 const input={...value,name:value.name.trim()};
 if(input.kind.startsWith('calendar.')){
  if(input.resourceId==='primary'||!input.resourceId||/[\x00-\x1f]/.test(input.resourceId)||!input.start||!input.end||![input.start,input.end].every(s=>/(Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s)))||Date.parse(input.end)<=Date.parse(input.start)||input.description&&input.description.length>4000)throw new RegistryError(400,'GOOGLE_WORK_INVALID');
  if(input.kind==='calendar.update'&&(!input.eventId||!/^[a-zA-Z0-9_-]{1,400}$/.test(input.eventId)))throw new RegistryError(400,'GOOGLE_WORK_INVALID');
 }else{
  fileId(input.resourceId);if(input.fileId)fileId(input.fileId);
  if(['drive.move','drive.update'].includes(input.kind)&&!input.fileId)throw new RegistryError(400,'GOOGLE_WORK_INVALID');
  if(input.kind!=='drive.move'){
   if(typeof input.content!=='string'||!input.mimeType||!/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(input.mimeType)||input.mimeType.startsWith('application/vnd.google-apps.'))throw new RegistryError(400,'GOOGLE_WORK_INVALID');
   const bytes=Buffer.from(input.content,'base64');if(bytes.length>2*1024*1024||bytes.toString('base64')!==input.content)throw new RegistryError(413,'GOOGLE_UPLOAD_LIMIT');
  }
 }
 return input;
}
/** An authority adapter over existing Google clients and durable operation store. */
export class NativeGoogleWork {
 private auth!:NativeGoogleProof;private clients!:GoogleClients;
 constructor(readonly connectionId:string,private createClients:GoogleClientFactory=factory){}
 async initialize(providers=true){this.auth=providers?await googleAuthority(this.connectionId):await nativeGoogleCommand('historyAuthority',{connectionId:this.connectionId}) as unknown as NativeGoogleProof;if(providers)this.clients=await this.createClients(this.connectionId);return this;}
 private async check(){const a=await googleAuthority(this.connectionId);if(a.revision!==this.auth.revision||a.subject!==this.auth.subject)throw new RegistryError(409,'GOOGLE_AUTHORITY_CHANGED');const client=this.clients.drive.context._options.auth as OAuth2Client;const principal=await client.request<{sub?:string}>({url:'https://openidconnect.googleapis.com/v1/userinfo',timeout:15000,retry:false});if(principal.data.sub!==this.auth.subject)throw new RegistryError(403,'NATIVE_GOOGLE_PRINCIPAL_CHANGED');return a;}
 private async scopes(kind:'calendar'|'drive'){
  const a=await this.check(),scopes=a.connection.scopes as string[];
  const ok=kind==='calendar'?GOOGLE_SCOPES.agenda.every(s=>scopes.includes(s)):scopes.includes(GOOGLE_SCOPES.drive[0])||scopes.includes(GOOGLE_SCOPES.existing[0]);
  if(!ok)throw new RegistryError(403,'GOOGLE_CONSENT_REQUIRED');return scopes;
 }
 private owner(){if(this.auth.ownerUserId!==nativeContext()!.userId)throw new RegistryError(403,'GOOGLE_WORK_OWNER_REQUIRED');}
 async calendar(id:string){
  await this.scopes('calendar');if(!id||id==='primary'||id.length>400)throw new RegistryError(400,'GOOGLE_EXPLICIT_RESOURCE_REQUIRED');
  const r=await this.clients.calendar.calendarList.get({calendarId:id},{timeout:15_000,retry:false});
  if(r.data.id!==id||r.data.deleted||!['owner','writer','reader'].includes(r.data.accessRole??''))throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');return r.data;
 }
 private async file(id:string,mode:'read'|'folder'|'write'='read'){
  fileId(id);await this.check();const r=await this.clients.drive.files.get({fileId:id,fields:'id,name,mimeType,version,trashed,parents,capabilities(canEdit,canAddChildren,canMoveItemWithinDrive,canDownload),isAppAuthorized,appProperties,md5Checksum',supportsAllDrives:true},{timeout:15_000,retry:false});
  const f=r.data;if(f.id!==id||f.trashed||!f.version)throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');
  if(mode!=='read'){
   const scopes=await this.scopes('drive');if(!scopes.includes(GOOGLE_SCOPES.existing[0])&&f.isAppAuthorized!==true)throw new RegistryError(403,'GOOGLE_FILE_CONSENT_REQUIRED');
   if(mode==='folder'?(f.mimeType!=='application/vnd.google-apps.folder'||f.capabilities?.canAddChildren!==true):f.capabilities?.canEdit!==true)throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');
  }
  return {file:f,etag:etagOf(r.headers)};
 }
 private async bindings(){const r=await googleWorkCommand('resources',{connectionId:this.connectionId});return r.resources as Resource[];}
 private async bound(id:string,kind:'calendar'|'folder'|'file'){
  const b=(await this.bindings()).find(b=>(b.metadata.id??b.metadata.fileId)===id&&(kind==='calendar'?b.kind==='calendar':kind==='folder'?b.metadata.kind==='folder':b.kind==='document'&&b.metadata.kind!=='folder'));
  if(!b)throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');await googleWorkCommand('resource',{connectionId:this.connectionId,bindingId:b.bindingId});return b;
 }
 async capabilities(){const capabilities=await googleWorkCommand('capabilities',{connectionId:this.connectionId});return {...capabilities,selectedCalendarId:nativeContext()!.session.googleCalendarId??null,selectedFolderId:nativeContext()!.session.googleFolderId??null};}
 async resources(){
  const out=[];for(const b of await this.bindings()){try{if(b.kind==='calendar'){const c=await this.calendar(b.metadata.id);out.push({id:c.id,name:c.summary,kind:'calendar',role:c.accessRole});}else if(b.metadata.kind==='folder'){const f=await this.file(b.metadata.id,'folder');out.push({id:f.file.id,name:f.file.name,kind:'folder'});}else{const f=await this.file(b.metadata.fileId,'write');out.push({id:f.file.id,name:f.file.name,kind:'file',mimeType:f.file.mimeType});}}catch(error){const status=error instanceof RegistryError?error.status:(error as {response?:{status?:number}})?.response?.status;if(!status||status>=500)throw new RegistryError(503,'GOOGLE_PROVIDER_UNAVAILABLE');/* Withhold inaccessible metadata. */}}
  return {resources:out};
 }
 async calendars(pageToken?:string){
  this.owner();await this.scopes('calendar');const r=await this.clients.calendar.calendarList.list({maxResults:50,pageToken,fields:'items(id,summary,accessRole,deleted),nextPageToken'},{timeout:15_000,retry:false});const calendars=[];for(const c of r.data.items??[]){if(!c.deleted&&['owner','writer','reader'].includes(c.accessRole??'')&&(await googleWorkCommand('candidate',{connectionId:this.connectionId,kind:'calendar',id:c.id})).allowed)calendars.push(c);}return {calendars,nextPageToken:r.data.nextPageToken??null};
 }
 async inspect(kind:'calendar'|'folder',id:string){
  this.owner();const allowed=await googleWorkCommand('candidate',{connectionId:this.connectionId,kind,id});if(!allowed.allowed)throw new RegistryError(403,'GOOGLE_RESOURCE_SCOPE_CONFLICT');const m=kind==='calendar'?await this.calendar(id):(await this.file(id,'folder')).file;
  return {resource:{id:m.id,name:kind==='calendar'?(m as calendar_v3.Schema$CalendarListEntry).summary:(m as drive_v3.Schema$File).name,version:kind==='calendar'?(m as calendar_v3.Schema$CalendarListEntry).etag:(m as drive_v3.Schema$File).version,kind}};
 }
 async bind(kind:'calendar'|'folder',id:string,version:string){
  const ctx=writableNativeContext();this.owner();const inspected=await this.inspect(kind,id),r=inspected.resource;
  if(!ctx.session.mission||!r.version||r.version!==version)throw new RegistryError(409,'GOOGLE_RESOURCE_CHANGED');
  const metadata={id,fileId:kind==='folder'?id:undefined,kind,version,connectionId:this.connectionId,issuer:this.auth.issuer,subject:this.auth.subject};
  if(ctx.session.googleConnectionId!==this.connectionId){ctx.session.googleCalendarId=undefined;ctx.session.googleFolderId=undefined;}ctx.session.googleConnectionId=this.connectionId;if(kind==='calendar')ctx.session.googleCalendarId=id;else ctx.session.googleFolderId=id;
  ctx.googleWorkCommitProof={operation:'bind',connectionId:this.connectionId,metadata};await new Journal().addEntry(writeActionEntry('GOOGLE_RESOURCE_BOUND',JSON.stringify({kind,id,connectionId:this.connectionId,missionId:ctx.session.mission.id})));return {success:true};
 }
 async select(kind:'calendar'|'folder',id:string){
  await this.bound(id,kind);if(kind==='calendar')await this.calendar(id);else await this.file(id,'folder');
  const ctx=writableNativeContext();if(ctx.session.googleConnectionId!==this.connectionId){ctx.session.googleCalendarId=undefined;ctx.session.googleFolderId=undefined;}ctx.session.googleConnectionId=this.connectionId;if(kind==='calendar')ctx.session.googleCalendarId=id;else ctx.session.googleFolderId=id;return {success:true};
 }
 async events(pageToken?:string,timeMin?:string,timeMax?:string){
  const id=nativeContext()!.session.googleCalendarId;if(!id||nativeContext()!.session.googleConnectionId!==this.connectionId)throw new RegistryError(409,'GOOGLE_CALENDAR_SELECTION_REQUIRED');
  await this.bound(id,'calendar');await this.calendar(id);
  const now=new Date();now.setUTCHours(0,0,0,0);const end=new Date(now);end.setUTCDate(end.getUTCDate()+1);
  timeMin??=now.toISOString();timeMax??=end.toISOString();
  if(![timeMin,timeMax].every(s=>s.length<80&&/(Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s)))||Date.parse(timeMax)<=Date.parse(timeMin)||Date.parse(timeMax)-Date.parse(timeMin)>366*86400000)throw new RegistryError(400,'GOOGLE_CALENDAR_RANGE_INVALID');
  const r=await this.clients.calendar.events.list({calendarId:id,timeMin,timeMax,maxResults:50,pageToken,singleEvents:true,orderBy:'startTime',fields:'items(id,summary,description,start,end,etag,location,recurringEventId),nextPageToken'},{timeout:15_000,retry:false});
  await this.bound(id,'calendar');await this.calendar(id);return {success:true,events:r.data.items??[],nextPageToken:r.data.nextPageToken??null,calendarId:id};
 }
 async lookup(operationId:string){return await googleWorkCommand('lookup',{connectionId:this.connectionId,operationId}) as Job;}
 async prepare(raw:GoogleWorkInput){
  this.owner();const input=normalizeGoogleWorkInput(raw),inputHash=jobFingerprint(input),existing=await this.lookup(input.operationId);
  if(existing.jobId){if(existing.request?.inputHash!==inputHash)throw new RegistryError(409,'GOOGLE_OPERATION_CONTENT_CONFLICT');return this.review(input.operationId);}
  const ctx=nativeContext()!;if(!ctx.session.mission)throw new RegistryError(409,'GOOGLE_MISSION_REQUIRED');
  const resources:Resource[]=[];let targetId='',etag:string|undefined,previousParents:string[]|undefined,previousProperties:Record<string,string>|undefined,previousChecksum:string|undefined,previousPrivate:Record<string,string>|undefined;
  if(input.kind.startsWith('calendar.')){
   if(ctx.session.googleCalendarId!==input.resourceId||ctx.session.googleConnectionId!==this.connectionId)throw new RegistryError(409,'GOOGLE_CALENDAR_SELECTION_REQUIRED');
   resources.push(await this.bound(input.resourceId,'calendar'));const cal=await this.calendar(input.resourceId);if(!['owner','writer'].includes(cal.accessRole??''))throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');
   targetId=input.eventId??digest(input.operationId+ctx.userId+ctx.session.mission.id);
   if(input.kind==='calendar.update'){const r=await this.clients.calendar.events.get({calendarId:input.resourceId,eventId:targetId},{timeout:15_000,retry:false});if(r.data.recurrence?.length||r.data.recurringEventId||r.data.status==='cancelled'||r.data.start?.date||r.data.end?.date)throw new RegistryError(403,'GOOGLE_EVENT_SHAPE_NOT_CERTIFIED');if(r.data.attendees?.length)throw new RegistryError(403,'GOOGLE_EVENT_INVITATIONS_NOT_CERTIFIED');etag=r.data.etag??undefined;previousPrivate=r.data.extendedProperties?.private??{};if(!etag)throw new RegistryError(409,'GOOGLE_PRECONDITION_REQUIRED');}
  }else{
   resources.push(await this.bound(input.resourceId,'folder'));await this.file(input.resourceId,'folder');
   if(input.kind==='drive.update'||input.kind==='drive.move'){
    const b=await this.bound(input.fileId!,'file');resources.push(b);const r=await this.file(input.fileId!,'write');if(r.file.version!==b.metadata.version)throw new RegistryError(409,'GOOGLE_RESOURCE_CHANGED');if(input.kind==='drive.move'&&r.file.capabilities?.canMoveItemWithinDrive!==true)throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');etag=r.etag;previousParents=r.file.parents??[];previousProperties=r.file.appProperties??{};previousChecksum=r.file.md5Checksum??undefined;if(input.kind==='drive.update'&&(r.file.mimeType!=='text/plain'||input.mimeType!=='text/plain'))throw new RegistryError(400,'GOOGLE_TEXT_UPDATE_ONLY');if(input.kind==='drive.update'&&!previousParents.includes(input.resourceId))throw new RegistryError(409,'GOOGLE_DESTINATION_CHANGED');if(!etag)throw new RegistryError(409,'GOOGLE_PRECONDITION_REQUIRED');targetId=input.fileId!;
   }else{const ids=await this.clients.drive.files.generateIds({count:1,space:'drive',type:'files'},{timeout:15_000,retry:false});targetId=ids.data.ids?.[0]??'';fileId(targetId);}
  }
  const plan:GooglePlan={input,inputHash,targetId,resources,etag,previousParents,previousProperties,previousChecksum,previousPrivate,marker:digest(ctx.userId+input.operationId),missionId:ctx.session.mission.id,connectionId:this.connectionId,...(input.content!==undefined?{contentHash:digest(Buffer.from(input.content,'base64'))}:{})};
  const planHash=jobFingerprint(plan);
  await googleWorkCommand('prepare',{connectionId:this.connectionId,operationId:input.operationId,kind:input.kind,missionId:plan.missionId,targetId:plan.targetId,authorityRevision:this.auth.revision,inputHash,planHash,encryptedPlan:encryptCredentialPayload(plan),resources:resources.map(r=>({bindingId:r.bindingId})),journal:writeActionEntry('GOOGLE_WRITE_PREPARED',JSON.stringify({operationId:input.operationId,kind:input.kind,missionId:plan.missionId}))});
  return this.review(input.operationId);
 }
 async review(operationId:string){
  const job=await this.lookup(operationId);if(!job.request)throw new RegistryError(403,'GOOGLE_OPERATION_DENIED');const plan=decryptCredentialPayload<GooglePlan>(job.request.encryptedPlan);
  return {success:true,operationId,status:job.status==='queued'&&job.expired?'expired':job.status,reviewHash:job.request.planHash,proposal:{kind:plan.input.kind,name:plan.input.name,resourceId:plan.input.resourceId,targetId:plan.targetId,start:plan.input.start,end:plan.input.end,description:plan.input.description,mimeType:plan.input.mimeType,bytes:plan.input.content!==undefined?Buffer.from(plan.input.content,'base64').length:undefined,sha256:plan.input.content!==undefined?digest(Buffer.from(plan.input.content,'base64')):undefined,missionId:plan.missionId},result:job.result?decryptCredentialPayload<Receipt>(job.result.encryptedResult):null};
 }
 async stagedFile(operationId:string){const job=await this.lookup(operationId);if(!job.request)throw new RegistryError(403,'GOOGLE_OPERATION_DENIED');const plan=decryptCredentialPayload<GooglePlan>(job.request.encryptedPlan);if(plan.input.content===undefined)throw new RegistryError(404,'GOOGLE_PROPOSAL_FILE_MISSING');return {content:Buffer.from(plan.input.content,'base64'),name:plan.input.name};}
 async preflight(plan:GooglePlan){
  this.owner();await this.check();for(const r of plan.resources)await googleWorkCommand('resource',{connectionId:this.connectionId,bindingId:r.bindingId});
  if(plan.input.kind.startsWith('calendar.')){const c=await this.calendar(plan.input.resourceId);if(!['owner','writer'].includes(c.accessRole??''))throw new RegistryError(403,'GOOGLE_RESOURCE_DENIED');if(plan.etag){const r=await this.clients.calendar.events.get({calendarId:plan.input.resourceId,eventId:plan.targetId},{timeout:15_000,retry:false});if(r.data.etag!==plan.etag)throw new RegistryError(409,'GOOGLE_RESOURCE_CHANGED');}}
  else{await this.file(plan.input.resourceId,'folder');if(plan.etag){const r=await this.file(plan.targetId,'write');if(r.etag!==plan.etag)throw new RegistryError(409,'GOOGLE_RESOURCE_CHANGED');}}
 }
 async mutate(plan:GooglePlan){
  if(this.clients.mutate){await this.clients.mutate(plan);return;}
  const input=plan.input,calendar=input.kind.startsWith('calendar.'),auth=(calendar?this.clients.calendar:this.clients.drive).context._options.auth as OAuth2Client;
  let url:string,method:string,body:BodyInit;const headers=new Headers();
  if(calendar){
   url='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(input.resourceId)+'/events'+(input.kind==='calendar.update'?'/'+encodeURIComponent(plan.targetId):'')+'?sendUpdates=none';method=input.kind==='calendar.update'?'PATCH':'POST';
   body=JSON.stringify({...(method==='POST'?{id:plan.targetId,attendees:[],reminders:{useDefault:false,overrides:[]}}:{}),summary:input.name,description:input.description??'',start:{dateTime:input.start},end:{dateTime:input.end},extendedProperties:{private:{...plan.previousPrivate,claraOsOperation:plan.marker}}});headers.set('Content-Type','application/json');
  }else{
   const create=['drive.upload','drive.create'].includes(input.kind),move=input.kind==='drive.move';method=create?'POST':'PATCH';
   url='https://www.googleapis.com/'+(move?'drive/v3':'upload/drive/v3')+'/files'+(create?'':'/'+encodeURIComponent(plan.targetId))+'?supportsAllDrives=true';
   const metadata={...(create?{id:plan.targetId,parents:[input.resourceId],mimeType:input.mimeType}:{}),name:input.name,appProperties:{...plan.previousProperties,claraOsOperation:plan.marker}};
   if(move){const params=new URLSearchParams({addParents:input.resourceId,removeParents:(plan.previousParents??[]).join(',')});url+='&'+params;body=JSON.stringify(metadata);headers.set('Content-Type','application/json');}
   else{url+='&uploadType=multipart';const boundary='clara_'+randomBytes(16).toString('hex');body=new Uint8Array(Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: '+input.mimeType+'\r\n\r\n'),Buffer.from(input.content!,'base64'),Buffer.from('\r\n--'+boundary+'--\r\n')]));headers.set('Content-Type','multipart/related; boundary='+boundary);}
  }
  const authorization=await auth.getRequestHeaders(url);authorization.forEach((v,k)=>headers.set(k,v));if(plan.etag)headers.set('If-Match',plan.etag);
  // Exactly one handoff. No SDK retry, redirect, automatic replay or implicit primary/root.
  assertRecetteExternalExecutionBlocked('google.native-work.mutate');
   const response=await fetch(url,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(20_000)});if(!response.ok){await response.body?.cancel().catch(()=>{});if([400,401,403,404,412,413].includes(response.status))throw new GoogleWorkRefused(response.status);throw new RegistryError(503,'GOOGLE_WRITE_NOT_CONFIRMED');}
  await response.body?.cancel();
 }
 async verify(plan:GooglePlan):Promise<Receipt>{
  await this.check();if(plan.input.kind.startsWith('calendar.')){await this.calendar(plan.input.resourceId);const r=await this.clients.calendar.events.get({calendarId:plan.input.resourceId,eventId:plan.targetId},{timeout:15_000,retry:false});if(r.data.status==='cancelled'||r.data.recurrence?.length||r.data.recurringEventId||r.data.attendees?.length||r.data.extendedProperties?.private?.claraOsOperation!==plan.marker||r.data.summary!==plan.input.name||(r.data.description??'')!==(plan.input.description??'')||!r.data.etag||Date.parse(r.data.start?.dateTime??'')!==Date.parse(plan.input.start!)||Date.parse(r.data.end?.dateTime??'')!==Date.parse(plan.input.end!))throw new RegistryError(409,'GOOGLE_OUTCOME_UNCERTAIN');return {id:plan.targetId,version:r.data.etag??'',name:plan.input.name,kind:plan.input.kind,operationId:plan.input.operationId};}
  await this.file(plan.input.resourceId,'folder');const {file}=await this.file(plan.targetId,'write'),expectedParents=plan.input.kind==='drive.update'?plan.previousParents??[]:[plan.input.resourceId];
  if(file.appProperties?.claraOsOperation!==plan.marker||file.name!==plan.input.name||plan.previousChecksum&&plan.input.kind==='drive.move'&&file.md5Checksum!==plan.previousChecksum||plan.input.content!==undefined&&file.mimeType!==plan.input.mimeType||[...(file.parents??[])].sort().join('|')!==[...expectedParents].sort().join('|')||plan.input.content!==undefined&&file.md5Checksum!==createHash('md5').update(Buffer.from(plan.input.content,'base64')).digest('hex'))throw new RegistryError(409,'GOOGLE_OUTCOME_UNCERTAIN');return {id:plan.targetId,version:file.version!,name:plan.input.name,kind:plan.input.kind,operationId:plan.input.operationId};
 }
 async complete(operationId:string,plan:GooglePlan,result:Receipt,ownerToken:string,reconcile=false){
  const ctx=writableNativeContext(),mission=ctx.session.mission;if(mission?.id!==plan.missionId)throw new RegistryError(403,'GOOGLE_MISSION_CHANGED');
  const updated={...mission,googleOperations:[...(mission.googleOperations??[]).filter(r=>r.operationId!==operationId),{operationId,connectionId:this.connectionId,kind:result.kind,resourceId:result.id,version:result.version}]};nativeMission(updated);ctx.session.mission=updated;ctx.session.updatedAt=new Date();
  await new Journal().addEntry(writeActionEntry('GOOGLE_WRITE_COMPLETED',JSON.stringify({operationId,kind:result.kind,resourceId:result.id,missionId:mission.id,reconciled:reconcile})));
  ctx.googleWorkCommitProof={operation:'finish',operationId,connectionId:this.connectionId,ownerToken,reconcile,result:{encryptedResult:encryptCredentialPayload(result)},...(result.kind.startsWith('drive.')?{fileMetadata:{fileId:result.id,version:result.version,connectionId:this.connectionId,issuer:this.auth.issuer,subject:this.auth.subject}}:{})};return {success:true,status:'completed',result};
 }
}
/** Durable claim/approval BEFORE HTTP; finish+receipt+Mission+Journal in one PG commit. */
export async function executeGoogleWork(request:Request,connectionId:string,operationId:string,reviewHash:string,confirm:boolean,clients?:GoogleClientFactory,query?:RegistryQuery,reconcile=false):Promise<Record<string,unknown>>{
 let plan!:GooglePlan,job!:Job,work!:NativeGoogleWork;const ownerToken=randomUUID();
 const committedReview=()=>withNativeScope(request,false,async()=>{const saved=await(await new NativeGoogleWork(connectionId,clients).initialize(false)).review(operationId);return {...saved,success:saved.status==='completed'};},query);
 const readTerminal=async()=>{try{const saved=await committedReview();if(saved.status==='completed'||saved.status==='failed')return saved;}catch{/* Current access and availability still govern receipt consultation. */}return undefined;};
 const terminalOrUncertain=async()=>await readTerminal()??{success:false,status:'uncertain',operationId};
 let initial:Awaited<ReturnType<NativeGoogleWork['review']>>|null;try{initial=await withNativeScope(request,false,async()=>{work=await new NativeGoogleWork(connectionId,clients).initialize(false);job=await work.lookup(operationId);if(!job.request)throw new RegistryError(403,'GOOGLE_OPERATION_DENIED');if(job.status==='completed'||job.status==='failed')return work.review(operationId);plan=decryptCredentialPayload<GooglePlan>(job.request.encryptedPlan);if(reconcile)return null;if(job.status!=='queued')return {...await work.review(operationId),status:'uncertain'};await work.initialize();await work.preflight(plan);return null;},query);}catch(error){const saved=job?.request?await readTerminal():undefined;if(saved)return saved;throw error;}
 if(initial)return initial;
 if(reconcile){
  if(!['processing','uncertain'].includes(job.status??''))throw new RegistryError(409,'GOOGLE_NOT_HANDED_OFF');
  let receipt:Receipt;try{receipt=await withNativeScope(request,false,async()=>{const current=await new NativeGoogleWork(connectionId,clients).initialize();return current.verify(plan);},query);}catch{return terminalOrUncertain();}
  try{await withNativeScope(request,true,async()=>await(await new NativeGoogleWork(connectionId,clients).initialize()).complete(operationId,plan,receipt,job.ownerToken!,true),query);return await committedReview();}catch{return terminalOrUncertain();}
 }
 const claimed=await withNativeScope(request,false,()=>googleWorkCommand('claim',{connectionId,operationId,ownerToken,planHash:reviewHash,confirm,journal:writeActionEntry('GOOGLE_WRITE_CONFIRMED',JSON.stringify({operationId,kind:plan.input.kind,missionId:plan.missionId}))}),query);
 if(!claimed.owned)return terminalOrUncertain();
 try{
  await withNativeScope(request,false,async()=>{await googleWorkCommand('attempt',{connectionId,operationId,ownerToken});await work.mutate(plan);},query);
  const receipt=await withNativeScope(request,false,async()=>await(await new NativeGoogleWork(connectionId,clients).initialize()).verify(plan),query);
  await withNativeScope(request,true,async()=>await(await new NativeGoogleWork(connectionId,clients).initialize()).complete(operationId,plan,receipt,ownerToken),query);return await committedReview();
 }catch(error){
  if(error instanceof GoogleWorkRefused){try{await withNativeScope(request,false,()=>googleWorkCommand('refuse',{connectionId,operationId,ownerToken,journal:writeActionEntry('GOOGLE_WRITE_REFUSED',JSON.stringify({operationId,status:error.status}))}),query);return await committedReview();}catch{/* Preserve ambiguity if the refusal receipt cannot be committed. */}}
  await withNativeScope(request,false,()=>googleWorkCommand('uncertain',{connectionId,operationId,ownerToken,journal:writeActionEntry('GOOGLE_WRITE_UNCERTAIN',JSON.stringify({operationId}))}),query).catch(()=>{});
  return terminalOrUncertain();
 }
}
