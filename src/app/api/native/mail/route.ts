import {nativeRequest,withNativeScope} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {fields,registryBody,sameOrigin} from '@/lib/canonical/http';
import {opaque,name as registryName,RegistryError} from '@/lib/canonical/registry';
import {NativeMail,sendNativeMail} from '@/lib/native/mail';
import {nativeMailCommand} from '@/lib/native/mail-authority';
import {resolveLocale} from '@/i18n/config';
export const dynamic='force-dynamic';
const ok=(data:unknown)=>Response.json({success:true,...data as object},{headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{return await withNativeScope(request,false,async()=>{
 const q=new URL(request.url).searchParams,action=q.get('action')??'connections';
 if(action==='connections')return ok(await nativeMailCommand('list'));
 if(action==='overview'){
  // Read-only, bounded snapshot of previously synchronized messages.
  // Never contact IMAP, claim freshness, infer unread state, or send.
  const listed=await nativeMailCommand('list');
  const connections=(listed.connections??[]) as Array<{id:string;address:string}>;
  const overview=[];
  for(const connection of connections.slice(0,5)){
   const mail=await new NativeMail(connection.id).initialize();
   const page=await mail.list();
   const attention=page.messages.filter(m=>m.triage.requiresAttention).slice(0,10).map(m=>({id:m.id,subject:m.subject,from:m.from,priority:m.triage.priority,category:m.triage.category,reason:m.triage.reason}));
   overview.push({connectionId:connection.id,address:connection.address,highPriorityCount:page.messages.filter(m=>m.triage.priority==='high').length,quarantineCount:page.messages.filter(m=>m.triage.priority==='quarantine').length,attention,partial:page.nextCursor!==null});
  }
  return ok({overview,source:'previously-synchronized-first-page',freshnessVerified:false});
 }

 const connectionId=opaque(q.get('connectionId')),mail=await new NativeMail(connectionId).initialize();
 if(action==='messages')return ok(await mail.list(q.has('beforeId')?q.get('beforeId')!:undefined));
 if(action==='folders')return ok(await mail.folders());
 if(action==='draft')return ok({draft:await mail.draft()});
 if(action==='operations')return ok(await nativeMailCommand('operations',{connectionId}));
 if(action==='review')return ok(await mail.review(opaque(q.get('operationId'))));
 if(action==='message'||action==='attachment'){
  const message=await mail.read(opaque(q.get('messageId')));
  if(action==='message')return ok({message:{...message,attachments:message.attachments.map(a=>({id:a.id,name:a.name,type:a.type,size:a.size,sha256:a.sha256}))}});
  const attachment=message.attachments.find(a=>a.id===q.get('attachmentId'));if(!attachment)throw new RegistryError(403,'MAIL_ATTACHMENT_DENIED');
  return new Response(Buffer.from(attachment.content,'base64'),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }
 throw new RegistryError(400,'MAIL_UNKNOWN_ACTION');
 });}catch(error){return nativeFailure(error);}}
export async function POST(request:Request){try{
 sameOrigin(request);const b=await registryBody(request.clone()),action=opaque(b.action),connectionId=opaque(b.connectionId);
 const allowed:Record<string,string[]>={sync:['folder'],bind:['messageId'],createContact:['messageId','name','email','locale'],prepare:['messageId','locale'],save:['messageId','subject','body','recipients','attachmentIds'],submit:[],approve:['operationId'],send:['operationId','token'],delegate:['userId'],revokeDelegation:['userId'],revoke:[]};
 if(!allowed[action])throw new RegistryError(400,'MAIL_UNKNOWN_ACTION');fields(b,['action','connectionId',...allowed[action]]);
 if(action==='send')return ok(await sendNativeMail(request,connectionId,opaque(b.operationId),opaque(b.token)));
 return await nativeRequest(request,async()=>{const mail=await new NativeMail(connectionId).initialize();
 if(action==='sync'){
  if(typeof b.folder!=='string'||!b.folder.trim()||b.folder.length>200||/[\x00-\x1f\x7f]/.test(b.folder))throw new RegistryError(400,'MAIL_INVALID_FOLDER');
  return ok(await mail.sync(b.folder));
 }
 if(action==='bind')return ok(await mail.bind(opaque(b.messageId)));
 if(action==='createContact')return ok(await mail.createContact(opaque(b.messageId),registryName(b.name),opaque(b.email),resolveLocale(typeof b.locale==='string'?b.locale:null)));
 if(action==='prepare')return ok(await mail.prepare(opaque(b.messageId),resolveLocale(typeof b.locale==='string'?b.locale:null)));
 if(action==='save'){
  if(typeof b.subject!=='string'||typeof b.body!=='string'||!Array.isArray(b.recipients)||!b.recipients.every(x=>typeof x==='string')||!Array.isArray(b.attachmentIds)||!b.attachmentIds.every(x=>typeof x==='string'))throw new RegistryError(400,'MAIL_INVALID_DRAFT');
  return ok(await mail.saveDraft(opaque(b.messageId),{subject:b.subject,body:b.body,recipients:b.recipients,attachmentIds:b.attachmentIds}));
 }
 if(action==='submit')return ok(await mail.submit());
 if(action==='approve')return ok(await mail.approve(opaque(b.operationId)));
 return ok(await nativeMailCommand(action,{connectionId,...(b.userId?{userId:opaque(b.userId)}:{})}));
 });
 }catch(error){return nativeFailure(error);}}
