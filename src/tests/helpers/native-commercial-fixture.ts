import {qualifyProjectIntake} from '@/lib/acquisition/qualification';
import {buildAcquisitionDecisionBrief} from '@/lib/acquisition/decision-brief';
import {initialAcquisitionLifecycle,advanceAcquisitionLifecycle} from '@/lib/acquisition/lifecycle';
import type {MdProjectIntake} from '@/types';
/** Isolated synthetic fixtures only. This is not an attribution/import API. */
export function seedNativeCommercialFixture(pg:(sql:string)=>unknown){
 const literal=(value:unknown)=>"'"+JSON.stringify(value).replaceAll("'","''")+"'";
 for(const [id,owner,client,project] of [['prospect-a','a','c1','p1'],['prospect-b','b','c1','p1'],['prospect-p2','a','c1','p2'],['prospect-p3','a','c2','p3'],['unbound-history','','c1','p1']]){
  const intake:MdProjectIntake={schema:'md.project-intake.v1',submissionId:id,source:{system:'melodie-digital-site',channel:'website',locale:'fr'},contact:{name:'PRIVATE_'+id,email:id+'@example.invalid'},request:{projectType:'Production',disciplines:['sound'],location:'',schedule:'',brief:'PRIVATE_BRIEF_'+id},orchestration:{owner:'clara-os',initialState:'received',specialistRouting:'clara-os-decides',humanApproval:'required-for-committing-actions'},receivedAt:'2026-10-14T00:00:00Z'};
  const qualification=qualifyProjectIntake(intake,{intent:'qualify-project',summary:'PRIVATE_QUALIFICATION_'+id,confidence:.9,entities:[],actions:[],importance:.5,urgency:.5,impact:.5});
  const brief=buildAcquisitionDecisionBrief(qualification),lifecycle=advanceAcquisitionLifecycle(initialAcquisitionLifecycle(id),{type:'qualification-updated',qualification,brief});
  pg(`INSERT INTO clara_project_intake_inbox(workspace_id,submission_id,product_id,session_key,event_id,intake) VALUES('w','${id}','melodie-digital','external:synthetic','synthetic-${id}',${literal(intake)});
  INSERT INTO clara_acquisition_records(workspace_id,submission_id,qualification,decision_brief,lifecycle) VALUES('w','${id}',${literal(qualification)},${literal(brief)},${literal(lifecycle)});`);
  if(owner)pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
  VALUES('acquisition','w/${id}','${owner}','w','${client}','${project}',encode(sha256(convert_to(clara_native_acquisition_snapshot('w','${id}')::text,'UTF8')),'hex'),'a','Explicit synthetic identity and client/project ownership proof for isolated acceptance');`);
 }
}
