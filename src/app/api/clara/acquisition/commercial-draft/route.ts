import {getTranslations} from "next-intl/server";
import {nativeRequest,nativeContext} from "@/lib/native/scoped-context";
import {RegistryError,opaque} from "@/lib/canonical/registry";
import {fields,registryBody} from "@/lib/canonical/http";
import {updateCommercialDraft} from "@/lib/acquisition/commercial-communication-service";
import {Journal} from "@/lib/core/journal";
import {writeActionEntry} from "@/lib/core/journal-writer";
import {saveSession} from "@/lib/core/store/session-store";
import {saveMission} from "@/modules/missions/mission-store";
export async function PATCH(request:Request){
 return nativeRequest(request,async()=>{
  const body=await registryBody(request);fields(body,['submissionId','revision','subject','body']);const ctx=nativeContext()!;
  if(opaque(body.submissionId)!==ctx.session.acquisitionSubmissionId)throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
  if(!Number.isSafeInteger(body.revision)||ctx.acquisitions.get(ctx.session.acquisitionSubmissionId!)?.commercialDraft?.revision!==body.revision)throw new RegistryError(409,'NATIVE_ACQUISITION_REVISION_CONFLICT');
  if(typeof body.subject!=='string'||!body.subject.trim()||body.subject.length>500||typeof body.body!=='string'||!body.body.trim()||body.body.length>50000)throw new RegistryError(400,'INVALID_COMMERCIAL_DRAFT');
  const draft=await updateCommercialDraft({workspaceId:ctx.scope.workspaceId,submissionId:ctx.session.acquisitionSubmissionId!,subject:body.subject,body:body.body});
  if(!draft)throw new RegistryError(404,'COMMERCIAL_DRAFT_NOT_FOUND');const ui=await getTranslations('ui');
  ctx.session.conversation=[...ctx.session.conversation,{id:crypto.randomUUID(),role:'clara' as const,content:ui('commercialDraftUpdated',{revision:draft.revision}),createdAt:new Date().toISOString()}].slice(-100);
  if(ctx.session.mission){ctx.session.mission.lastAction=ui('commercialDraftUpdated',{revision:draft.revision});await saveMission(ctx.session.mission);}
  await saveSession(ctx.session,ctx.scope.sessionId);await new Journal().addEntry(writeActionEntry(ui('communicationPreparedByClara'),draft.recipient.name));
  return Response.json({success:true,draft,conversation:ctx.session.conversation},{headers:{'Cache-Control':'no-store'}});
 });
}
