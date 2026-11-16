import {withNativeScope,nativeContext,nativeRequest} from "@/lib/native/scoped-context";
import {nativeFailure} from "@/lib/native/authority";
import {contactRevision,saveNativeContact} from '@/lib/native/contacts';
import {fields,registryBody} from '@/lib/canonical/http';
import {RegistryError} from '@/lib/canonical/registry';
import {resolveLocale} from '@/i18n/config';
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{return await withNativeScope(request,false,async()=>{
  const ctx=nativeContext()!,q=(new URL(request.url).searchParams.get('q')??'').trim().toLowerCase();
  const contacts=[...ctx.acquisitions.values()].map(record=>{
   const intake=ctx.intakes.get(record.submissionId)!;
   return {revision:contactRevision(ctx.acquisitionSnapshots[record.submissionId]),id:record.submissionId,submissionId:record.submissionId,email:intake.contact.email,name:intake.contact.name,projectType:record.qualification.opportunity.projectType,lifecycleState:record.lifecycle.state,createdAt:record.createdAt,updatedAt:record.updatedAt};
  }).filter(contact=>!q||[contact.name,contact.email,contact.projectType].some(v=>v.toLowerCase().includes(q)));
  return Response.json({connected:true,source:'clara-os',workspaceId:ctx.scope.workspaceId,selectedSubmissionId:ctx.session.acquisitionSubmissionId??null,contacts},{headers:{'Cache-Control':'no-store'}});
 });}catch(error){return nativeFailure(error);}
}

export async function POST(request:Request){return nativeRequest(request,async()=>{
 const body=await registryBody(request.clone());fields(body,['action','name','email','submissionId','revision','locale']);
 if(typeof body.action!=='string'||!['create','update'].includes(body.action)||typeof body.name!=='string'||typeof body.email!=='string'||body.submissionId!==undefined&&typeof body.submissionId!=='string'||body.revision!==undefined&&typeof body.revision!=='string')throw new RegistryError(400,'CONTACT_INVALID');
 return Response.json(await saveNativeContact({action:body.action as 'create'|'update',name:body.name,email:body.email,submissionId:body.submissionId as string|undefined,revision:body.revision as string|undefined,locale:resolveLocale(typeof body.locale==='string'?body.locale:null)}),{headers:{'Cache-Control':'no-store'}});
});}
