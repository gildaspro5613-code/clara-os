import type {drive_v3} from 'googleapis';
import type {OAuth2Client} from 'google-auth-library';
import {DriveClient} from '@/lib/connectors/internal/google/drive/drive-client';
import {GoogleDriveEngine} from '@/lib/connectors/internal/google/drive/google-drive-engine';
import {googleAuthority,nativeGoogleCommand,type NativeGoogleProof} from './google-authority';
import {nativeContext,writableNativeContext,nativeMission} from './scoped-context';
import {RegistryError} from '@/lib/canonical/registry';
import {DocumentReadError} from '@/lib/documents/document-read-error';
import {dispatchEvent} from '@/lib/core/event-bus';
import {Clara} from '@/lib/core/clara';
import {EventType} from '@/types';
import {Journal} from '@/lib/core/journal';
import {writeActionEntry} from '@/lib/core/journal-writer';
import {encryptCredentialPayload,decryptCredentialPayload} from '@/lib/connections/credential-store';
import {composeClaraResponseWithProposal} from '@/lib/brain/response-composer';
import type {Locale} from '@/i18n/types';
interface Binding {bindingId:string;fileId:string;version:string}
interface Analysis {recommendation:string|null;answer:string;generation:unknown;checkedAt:string}
const id=(v:string)=>{if(!/^[A-Za-z0-9_-]{1,400}$/.test(v))throw new RegistryError(400,'INVALID_DOCUMENT_IDENTIFIER');return v;};
/** Authority adapter over the existing Drive client/engine, not a new connector. */
export class NativeDocuments {
 private proof!:NativeGoogleProof;private drive!:drive_v3.Drive;
 constructor(private connectionId:string,private createDrive:(connectionId:string)=>Promise<drive_v3.Drive>=connectionId=>new DriveClient().create(connectionId)){}
 async initialize(){this.proof=await googleAuthority(this.connectionId);this.drive=await this.createDrive(this.connectionId);return this;}
 private async rights(fileId:string,version?:string){
  try{return await this.currentRights(fileId,version);}catch(error){
   if(error instanceof RegistryError)throw error;
   const status=(error as {response?:{status?:number}})?.response?.status;
   throw new RegistryError([401,403,404].includes(status??0)?403:503,'NATIVE_DOCUMENT_GOOGLE_RIGHTS_UNAVAILABLE');
  }
 }
 private async currentRights(fileId:string,version?:string){
  id(fileId);const auth=await googleAuthority(this.connectionId);
  if(auth.revision!==this.proof.revision||auth.subject!==this.proof.subject)throw new RegistryError(409,'NATIVE_GOOGLE_REVISION_CONFLICT');
  const client=this.drive.context?._options.auth as OAuth2Client|undefined;
  if(!client||typeof client.request!=='function')throw new RegistryError(403,'NATIVE_GOOGLE_PRINCIPAL_UNVERIFIED');
  const principal=await client.request<{sub?:string}>({url:'https://openidconnect.googleapis.com/v1/userinfo',timeout:15_000});
  if(principal.data.sub!==this.proof.subject)throw new RegistryError(403,'NATIVE_GOOGLE_PRINCIPAL_CHANGED');
  const about=await this.drive.about.get({fields:'user(permissionId)'},{timeout:15_000});
  if(!about.data.user?.permissionId)throw new RegistryError(403,'NATIVE_DOCUMENT_GOOGLE_RIGHTS_DENIED');
  const metadata=await this.drive.files.get({fileId,fields:'id,name,mimeType,version,trashed,capabilities(canDownload),webViewLink',supportsAllDrives:true},{timeout:15_000});
  if(metadata.data.id!==fileId||metadata.data.trashed||metadata.data.capabilities?.canDownload!==true||!metadata.data.version)throw new RegistryError(403,'NATIVE_DOCUMENT_GOOGLE_RIGHTS_DENIED');
  const permissions=await this.drive.permissions.list({fileId,fields:'permissions(id,type,role,deleted,expirationTime),nextPageToken',supportsAllDrives:true,pageSize:100},{timeout:15_000});
  // No email/domain inference. Unknown or paginated permission sets fail closed.
  if(permissions.data.nextPageToken||!permissions.data.permissions?.some(p=>!p.deleted&&(!p.expirationTime||Date.parse(p.expirationTime)>Date.now())&&['owner','organizer','fileOrganizer','writer','commenter','reader'].includes(p.role??'')&&(p.id===about.data.user!.permissionId||p.type==='anyone')))throw new RegistryError(403,'NATIVE_DOCUMENT_GOOGLE_RIGHTS_DENIED');
  if(version&&metadata.data.version!==version)throw new RegistryError(409,'NATIVE_DOCUMENT_REVISION_CONFLICT');
  return metadata.data;
 }
 private async binding(fileId:string){
  const data=await nativeGoogleCommand('documents',{connectionId:this.connectionId});const bindings=data.bindings as Binding[];
  const b=bindings.find(b=>b.fileId===fileId);if(!b)throw new RegistryError(403,'NATIVE_DOCUMENT_SCOPE_DENIED');
  await nativeGoogleCommand('document',{connectionId:this.connectionId,bindingId:b.bindingId,version:b.version,revision:this.proof.revision});return b;
 }
 async list(query=''){
  const data=await nativeGoogleCommand('documents',{connectionId:this.connectionId});const bindings=data.bindings as Binding[];
  if(bindings.length>100)throw new RegistryError(503,'NATIVE_DOCUMENT_REVIEW_BATCH_REQUIRED');
  const files=[];
  for(const b of bindings){try{const m=await this.rights(b.fileId,b.version);if((m.name??'').toLocaleLowerCase().includes(query.toLocaleLowerCase()))files.push({id:m.id,name:m.name,mimeType:m.mimeType,url:m.webViewLink,version:m.version});}catch(error){if(!(error instanceof RegistryError)||error.status>=500)throw error;/* Withheld; never return foreign/revoked names or stale metadata. */}}
  return {success:true,files,nextPageToken:null,readOnly:true,source:"native-project"};
 }
 async inspect(fileId:string){
  if(this.proof.ownerUserId!==nativeContext()!.userId)throw new RegistryError(403,'NATIVE_DOCUMENT_BIND_DENIED');
  // An explicit file ID is reviewed; this does not search a whole account or infer OS membership.
  const m=await this.rights(fileId);return {success:true,file:{id:m.id,name:m.name,mimeType:m.mimeType,version:m.version}};
 }
 async bind(fileId:string,version:string){
  const ctx=writableNativeContext();if(!ctx.session.mission)throw new RegistryError(409,'NATIVE_DOCUMENT_MISSION_REQUIRED');
  const m=await this.rights(fileId,version);const metadata={connectionId:this.connectionId,fileId,version:m.version,issuer:this.proof.issuer,subject:this.proof.subject};
  const bound=await nativeGoogleCommand('bind',{connectionId:this.connectionId,fileId,version,metadata,revision:this.proof.revision});return {success:true,bindingId:bound.bindingId};
 }
 async read(fileId:string,question?:string,locale?:Locale){
  const ctx=writableNativeContext(),mission=ctx.session.mission;if(!mission)throw new RegistryError(409,'NATIVE_DOCUMENT_MISSION_REQUIRED');
  const b=await this.binding(fileId),metadata=await this.rights(fileId,b.version);
  const result=await new GoogleDriveEngine(this.drive).readContent({fileId,fileName:metadata.name??fileId,mimeType:metadata.mimeType??undefined});
  if(!result.textContent?.trim())throw new DocumentReadError('DOCUMENT_NO_TEXT','No extractible text.',422);
  await this.rights(fileId,b.version);
  // Run the real Core/Brain cycle with one fresh, bounded source. Its temporary
  // analysis must not replace the existing commercial mission or persist raw
  // content in a dashboard, Journal or conversation that later bypasses Drive.
  const session=structuredClone(ctx.session),missions=structuredClone(ctx.missions),writes=structuredClone(ctx.writes),entries=structuredClone(ctx.entries),previousSource=ctx.documentSource;
  let analysis:Analysis;
  try{
   ctx.documentSource={source:'google-drive',available:true,data:{fileId,version:b.version,textContent:result.textContent},summary:result.textContent};
   const analyzed=await dispatchEvent(new Clara(ctx.scope.sessionId,ctx.scope.workspaceId),{id:crypto.randomUUID(),type:EventType.DOCUMENT_RECEIVED,source:'CLARA_DOCUMENTS',timestamp:new Date(),payload:{fileId,fileName:metadata.name,mimeType:result.mimeType,textContent:result.textContent}});
   const answer=await composeClaraResponseWithProposal(question??'Analyse ce document pour la mission sélectionnée.',analyzed,locale);
   analysis={recommendation:analyzed.recommendation?.summary??null,answer:answer.content,generation:answer.generation,checkedAt:new Date().toISOString()};
  }finally{ctx.session=session;ctx.missions=missions;ctx.writes=writes;ctx.entries=entries;ctx.documentSource=previousSource;}
  await this.rights(fileId,b.version);
  await nativeGoogleCommand('document',{connectionId:this.connectionId,bindingId:b.bindingId,version:b.version,revision:this.proof.revision});
  const ref={connectionId:this.connectionId,fileId,version:b.version,missionId:mission.id,encryptedAnalysis:encryptCredentialPayload(analysis),checkedAt:analysis.checkedAt};
  const references=[...(ctx.session.documentReferences??ctx.session.mission?.documentReferences??[]).filter(r=>!(r.connectionId===ref.connectionId&&r.fileId===ref.fileId&&r.version===ref.version&&r.missionId===ref.missionId)),ref];
  ctx.session.documentReferences=references;const updated={...ctx.session.mission!,documentReferences:references.filter(r=>r.missionId===mission.id)};nativeMission(updated);ctx.session.mission=updated;ctx.session.updatedAt=new Date();
  await new Journal().addEntry(writeActionEntry('DOCUMENT_RECEIVED',JSON.stringify({fileId,version:b.version,missionId:mission.id,connectionId:this.connectionId,authority:'canonical+current-google',checkedAt:analysis.checkedAt})));
  ctx.documentCommitProof={connectionId:this.connectionId,bindingId:b.bindingId,version:b.version,revision:this.proof.revision};
  return {success:true,extractable:true,fileId,fileName:metadata.name,mimeType:result.mimeType,textContent:result.textContent,analysis,brain:{recommendation:analysis.recommendation,missionId:mission.id}};
 }
 async authorize(fileId:string){
  const b=await this.binding(fileId);await this.rights(fileId,b.version);
  await nativeGoogleCommand('document',{connectionId:this.connectionId,bindingId:b.bindingId,version:b.version,revision:this.proof.revision});
  return {osBindingVerified:true,driveRightsVerified:true,contentRevisionVerified:true,readAllowed:true,version:b.version,checkedAt:new Date().toISOString()};
 }
 async download(fileId:string){
  const b=await this.binding(fileId);const m=await this.rights(fileId,b.version);
  const result=await new GoogleDriveEngine(this.drive).download({fileId,fileName:m.name??fileId,mimeType:m.mimeType??undefined});
  await this.rights(fileId,b.version);await nativeGoogleCommand('document',{connectionId:this.connectionId,bindingId:b.bindingId,version:b.version,revision:this.proof.revision});
  if(!(result.content instanceof Uint8Array))throw new RegistryError(503,'NATIVE_DOCUMENT_CONTENT_UNAVAILABLE');
  return new Response(new Uint8Array(result.content),{headers:{'Content-Type':m.mimeType??'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(m.name??fileId)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 async references(){
  const ctx=nativeContext()!,refs=(ctx.session.documentReferences??ctx.session.mission?.documentReferences??[]).filter(r=>r.connectionId===this.connectionId&&r.missionId===ctx.session.mission?.id),results=[];
  for(const ref of refs){try{const b=await this.binding(ref.fileId);if(b.version!==ref.version)throw new RegistryError(409,'NATIVE_DOCUMENT_REVISION_CONFLICT');const m=await this.rights(ref.fileId,ref.version);results.push({fileId:ref.fileId,version:ref.version,name:m.name,available:true,analysis:decryptCredentialPayload<Analysis>(ref.encryptedAnalysis)});}catch(error){if(!(error instanceof RegistryError))throw error;results.push({fileId:ref.fileId,version:ref.version,available:false});}}
  return {success:true,references:results};
 }
}
export async function selectedNativeDocuments(){const connectionId=nativeContext()?.session.googleConnectionId;if(!connectionId)throw new RegistryError(409,'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED');return new NativeDocuments(connectionId).initialize();}
