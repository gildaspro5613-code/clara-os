import {resolveCommercialDraft} from "@/lib/acquisition/commercial-communication-service";
import {getTranslations} from "next-intl/server";
import {Journal} from "@/lib/core/journal";
import {writeActionEntry} from "@/lib/core/journal-writer";
import {registryContext,opaque,RegistryError} from '@/lib/canonical/registry';
import {fields,registryBody,sameOrigin} from '@/lib/canonical/http';
import {nativeCommand,nativeRequest,nativeContext,writableNativeContext,nativeMission} from '@/lib/native/scoped-context';
import {nativeFailure,nativeSessionView} from '@/lib/native/authority';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  registryContext(request.headers.get('cookie'),'native-selector');sameOrigin(request);
  const body=await registryBody(request.clone()),action=opaque(body.action);
  if(action==='createSession'||action==='selectSession'){
   fields(body,['action','workspaceId','clientId','projectId',...(action==='selectSession'?['sessionId']:[])]);
   const context=registryContext(request.headers.get('cookie'),body.workspaceId);
   const scope={...context,clientId:opaque(body.clientId),projectId:opaque(body.projectId),sessionId:action==='selectSession'?opaque(body.sessionId):'native:new'};
   const capabilities=await nativeCommand(scope,'list');
   if(capabilities.protocolVersion!==2)throw new RegistryError(503,'NATIVE_CONVERSATION_MIGRATION_REQUIRED');
   const result=await nativeCommand(scope,action==='createSession'?'create':'read');
   const selected={workspaceId:scope.workspaceId,clientId:scope.clientId,projectId:scope.projectId,sessionId:action==='createSession'?String(result.sessionId):scope.sessionId};
   return Response.json({success:true,data:selected},{headers:{'Cache-Control':'no-store','Set-Cookie':`clara_native_selection=${encodeURIComponent(JSON.stringify(selected))}; Path=/; HttpOnly; Secure; SameSite=Lax`}});
  }
  return await nativeRequest(request,async()=>{
   const ctx=writableNativeContext();
   const ui=await getTranslations("ui");
   if(action==='selectAcquisition'){
    fields(body,['action','submissionId']);const submissionId=opaque(body.submissionId);
    if(!ctx.acquisitions.has(submissionId))throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
    if(ctx.session.acquisitionSubmissionId&&ctx.session.acquisitionSubmissionId!==submissionId)throw new RegistryError(409,'NATIVE_NEW_SESSION_REQUIRED');
    if(!ctx.session.acquisitionSubmissionId&&ctx.session.mission)throw new RegistryError(409,'NATIVE_NEW_SESSION_REQUIRED');
    ctx.session.acquisitionSubmissionId=submissionId;ctx.session.updatedAt=new Date();
    await new Journal().addEntry(writeActionEntry(ui('nativeSelectContact'),ctx.intakes.get(submissionId)!.contact.name));
   }else if(action==='prepareCommercialDraft'){
    fields(body,['action']);const submissionId=ctx.session.acquisitionSubmissionId;
    if(!submissionId||!ctx.acquisitions.has(submissionId))throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
    const resolved=await resolveCommercialDraft(ctx.scope.workspaceId,submissionId);
    if(!resolved)throw new RegistryError(409,'NATIVE_COMMERCIAL_DRAFT_UNAVAILABLE');
    await new Journal().addEntry(writeActionEntry(ui('communicationPreparedByClara'),resolved.draft.recipient.name));
    return Response.json({success:true,draft:resolved.draft},{headers:{'Cache-Control':'no-store'}});
   }else if(action==='createMission'){
    fields(body,['action','title','objective']);
    if(typeof body.title!=='string'||!body.title.trim()||body.title.length>160||typeof body.objective!=='string'||!body.objective.trim()||body.objective.length>4000)throw new RegistryError(400,'INVALID_NATIVE_MISSION');
    const existing=ctx.session.acquisitionSubmissionId?[...ctx.missions.values()].find(m=>m.acquisitionSubmissionId===ctx.session.acquisitionSubmissionId):undefined;
    if(existing){ctx.session.mission=existing;return Response.json({success:true,mission:existing},{headers:{'Cache-Control':'no-store'}});}
    if(ctx.session.mission||ctx.session.conversation.length||ctx.session.brainDashboard)throw new RegistryError(409,'NATIVE_THREAD_MISSION_BOUND');
    const mission={id:'new',title:body.title.trim(),objective:body.objective.trim(),status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};
    nativeMission(mission);ctx.session.mission=mission;ctx.session.updatedAt=new Date();
    await new Journal().addEntry(writeActionEntry(ui("nativeCreateMission"),mission.title));
   }else if(action==='selectMission'){
    fields(body,['action','missionId']);const mission=ctx.missions.get(opaque(body.missionId));
    if(!mission)throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
    if(mission.acquisitionSubmissionId!==ctx.session.acquisitionSubmissionId)throw new RegistryError(409,'NATIVE_EXPLICIT_CONTACT_SELECTION_REQUIRED');
    if(ctx.session.mission?.id===mission.id)return Response.json({success:true,mission},{headers:{'Cache-Control':'no-store'}});
    if(ctx.session.mission||ctx.session.conversation.length||ctx.session.brainDashboard)throw new RegistryError(409,'NATIVE_THREAD_MISSION_BOUND');
    ctx.session.mission=mission;ctx.session.documentReferences=mission.documentReferences??[];ctx.session.updatedAt=new Date();
    await new Journal().addEntry(writeActionEntry(ui('nativeOpenMission'),mission.id));
   }else if(action==='toggleTask'){
    fields(body,['action','missionId','taskId','completed']);
    const mission=ctx.missions.get(opaque(body.missionId));if(!mission)throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
    const taskId=opaque(body.taskId);const task=mission.tasks.find(t=>t.id===taskId);if(!task)throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
    if(task.execution)throw new RegistryError(503,'NATIVE_CAPABILITY_NOT_CERTIFIED');
    if(typeof body.completed!=='boolean')throw new RegistryError(400,'INVALID_NATIVE_TASK_STATUS');
    const tasks=mission.tasks.map(t=>t.id===task.id?{...t,completed:body.completed as boolean}:t);
    const progress=Math.round(tasks.filter(t=>t.completed).length/tasks.length*100);
    const updated={...mission,tasks,progress,status:progress===100?'completed' as const:mission.status==='completed'?'active' as const:mission.status,nextAction:tasks.find(t=>!t.completed)?.title};
    nativeMission(updated);if(ctx.session.mission?.id===mission.id)ctx.session.mission=updated;ctx.session.updatedAt=new Date();
    await new Journal().addEntry(writeActionEntry(ui("save"),task.title));
    return Response.json({success:true,mission:updated},{headers:{'Cache-Control':'no-store'}});
   }else if(action==='setMissionStatus'){
    fields(body,['action','missionId','status']);
    const mission=ctx.missions.get(opaque(body.missionId));if(!mission)throw new RegistryError(403,'NATIVE_SCOPE_DENIED');
    if(!['planned','active','blocked','completed','cancelled'].includes(String(body.status)))throw new RegistryError(400,'INVALID_NATIVE_STATUS');
    if(body.status==='completed'&&mission.tasks.some(t=>!!t.execution&&!t.completed))throw new RegistryError(409,'NATIVE_EXECUTION_PROOF_REQUIRED');
    nativeMission({...mission,status:body.status as typeof mission.status});ctx.session.mission=ctx.missions.get(mission.id)!;ctx.session.updatedAt=new Date();
   }else throw new RegistryError(400,'UNKNOWN_NATIVE_ACTION');
   return Response.json({success:true,mission:nativeContext()!.session.mission},{headers:{'Cache-Control':'no-store'}});
  });
 }catch(error){return nativeFailure(error);}
}
export async function GET(request:Request){
 try{
  const {nativeSelectors}=await import('@/lib/native/authority');
  const scope=nativeSelectors(request);
  if(new URL(request.url).searchParams.get('list')==='1')return Response.json({success:true,data:await nativeCommand(scope,'list')},{headers:{'Cache-Control':'no-store'}});
  const data=await nativeCommand(scope,'read');
  return Response.json({success:true,data:{workspaceId:scope.workspaceId,clientId:scope.clientId,projectId:scope.projectId,sessionId:scope.sessionId},session:nativeSessionView(data.session as Record<string,unknown>),missions:(data.missions as {id:string;title:string}[]).map(m=>({id:m.id,title:m.title})),permissions:{read:true,write:data.canWrite===true}},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return nativeFailure(error);}
}
