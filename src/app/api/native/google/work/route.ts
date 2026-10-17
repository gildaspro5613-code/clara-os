import { recetteRequested } from '@/lib/recette/policy';
import {withNativeScope} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {fields} from '@/lib/canonical/http';
import {opaque,RegistryError} from '@/lib/canonical/registry';
import {NativeGoogleWork,executeGoogleWork,googleWorkCommand,type GoogleWorkInput} from '@/lib/native/google-work';
import {readDocumentRequest} from '@/lib/documents/bounded-request';
import {DocumentReadError} from '@/lib/documents/document-read-error';
const ok=(value:object)=>Response.json({success:true,...value},{headers:{'Cache-Control':'no-store'}});
const failure=(error:unknown)=>{if(error instanceof DocumentReadError)return Response.json({success:false,code:error.code},{status:error.status});const status=(error as {response?:{status?:number}})?.response?.status;return nativeFailure([401,403,404].includes(status??0)?new RegistryError(403,'GOOGLE_RESOURCE_DENIED'):error);};
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){try{return await withNativeScope(request,false,async()=>{
 const q=new URL(request.url).searchParams,connectionId=opaque(q.get('connectionId')),action=q.get('action')??'capabilities',work=await new NativeGoogleWork(connectionId).initialize(!['capabilities','operations','review','proposalFile'].includes(action));
 if(action==='capabilities')return ok(await work.capabilities());
 if(action==='resources')return ok(await work.resources());
 if(action==='calendars')return ok(await work.calendars(q.get('pageToken')??undefined));
 if(action==='events')return ok(await work.events(q.get('pageToken')??undefined,q.get('timeMin')??undefined,q.get('timeMax')??undefined));
 if(action==='operations')return ok(await googleWorkCommand('list',{connectionId}));
 if(action==='review')return ok(await work.review(opaque(q.get('operationId'))));
 if(action==='proposalFile'){const file=await work.stagedFile(opaque(q.get('operationId')));return new Response(new Uint8Array(file.content),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});}
 throw new RegistryError(400,'GOOGLE_WORK_INVALID');
});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 if(recetteRequested())return Response.json({success:false,code:'RECETTE_EXTERNAL_OPERATION_BLOCKED'},{status:403});
 // Authority precedes bounded parsing, including multipart-sized JSON uploads.
 const body=await withNativeScope(request,true,async()=>{
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new RegistryError(415,'JSON_REQUIRED');
  let b:Record<string,unknown>;try{b=JSON.parse(new TextDecoder().decode(await readDocumentRequest(request,3*1024*1024)));}catch(error){if(error instanceof DocumentReadError)throw error;throw new RegistryError(400,'GOOGLE_WORK_INVALID');}
  if(!b||Array.isArray(b)||typeof b!=='object')throw new RegistryError(400,'GOOGLE_WORK_INVALID');return b;
 });
 const action=opaque(body.action),connectionId=opaque(body.connectionId);
 const allowed:Record<string,string[]>={inspect:['kind','resourceId'],bind:['kind','resourceId','version'],select:['kind','resourceId'],prepare:['input'],execute:['operationId','reviewHash','confirm'],reconcile:['operationId'],cancel:['operationId']};if(!allowed[action])throw new RegistryError(400,'GOOGLE_WORK_INVALID');fields(body,['action','connectionId',...allowed[action]]);
 if(action==='execute'||action==='reconcile')return ok(await executeGoogleWork(request,connectionId,opaque(body.operationId),typeof body.reviewHash==='string'?body.reviewHash:'',body.confirm===true,undefined,undefined,action==='reconcile'));
 return await withNativeScope(request,true,async()=>{
  const work=await new NativeGoogleWork(connectionId).initialize();
  if(action==='prepare'){
   if(!body.input||typeof body.input!=='object'||Array.isArray(body.input))throw new RegistryError(400,'GOOGLE_WORK_INVALID');
   fields(body.input as Record<string,unknown>,['operationId','kind','resourceId','name','content','mimeType','fileId','eventId','start','end','description']);
   return ok(await work.prepare(body.input as GoogleWorkInput));
  }
  if(action==='cancel')return ok(await googleWorkCommand('cancel',{connectionId,operationId:opaque(body.operationId)}));
  if(!['calendar','folder'].includes(String(body.kind)))throw new RegistryError(400,'GOOGLE_WORK_INVALID');const kind=body.kind as 'calendar'|'folder';if(typeof body.resourceId!=='string'||!body.resourceId||body.resourceId.length>400||/[\x00-\x20\x7f]/.test(body.resourceId))throw new RegistryError(400,'GOOGLE_WORK_INVALID');const id=body.resourceId;
  if(action==='inspect')return ok(await work.inspect(kind,id));if(action==='select')return ok(await work.select(kind,id));
  return ok(await work.bind(kind,id,opaque(body.version)));
 });
}catch(error){return failure(error);}}
