import {withNativeScope,nativeContext} from "@/lib/native/scoped-context";
import {nativeFailure} from "@/lib/native/authority";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{return await withNativeScope(request,false,async()=>{
  const ctx=nativeContext()!,q=(new URL(request.url).searchParams.get('q')??'').trim().toLowerCase();
  const contacts=[...ctx.acquisitions.values()].map(record=>{
   const intake=ctx.intakes.get(record.submissionId)!;
   return {id:record.submissionId,submissionId:record.submissionId,email:intake.contact.email,name:intake.contact.name,projectType:record.qualification.opportunity.projectType,lifecycleState:record.lifecycle.state,createdAt:record.createdAt,updatedAt:record.updatedAt};
  }).filter(contact=>!q||[contact.name,contact.email,contact.projectType].some(v=>v.toLowerCase().includes(q)));
  return Response.json({connected:true,source:'clara-os',workspaceId:ctx.scope.workspaceId,selectedSubmissionId:ctx.session.acquisitionSubmissionId??null,contacts},{headers:{'Cache-Control':'no-store'}});
 });}catch(error){return nativeFailure(error);}
}
