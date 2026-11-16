import {createHash,randomUUID} from 'node:crypto';
import {writableNativeContext} from './scoped-context';
import {RegistryError} from '@/lib/canonical/registry';
import {qualifyProjectIntake} from '@/lib/acquisition/qualification';
import {buildAcquisitionDecisionBrief} from '@/lib/acquisition/decision-brief';
import {initialAcquisitionLifecycle,advanceAcquisitionLifecycle} from '@/lib/acquisition/lifecycle';
import {Journal} from '@/lib/core/journal';
import {writeActionEntry} from '@/lib/core/journal-writer';
import type {MdProjectIntake} from '@/types';
import type {Locale} from '@/i18n/types';
export const contactRevision=(snapshot:unknown)=>createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
/** Contacts remain existing acquired intakes, committed with native Session and Journal. */
export async function saveNativeContact(input:{action:'create'|'update';name:string;email:string;submissionId?:string;revision?:string;locale:Locale}){
 const ctx=writableNativeContext();
 if(ctx.contactProtocolVersion!==1)throw new RegistryError(503,'CONTACT_MIGRATION_REQUIRED');
 const name=input.name.trim(),email=input.email.trim();
 if(!name||name.length>160||/[\x00-\x1f\x7f]/.test(name)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new RegistryError(400,'CONTACT_INVALID');
 let submissionId=input.submissionId;
 if(input.action==='update'){
  if(!submissionId||!ctx.acquisitions.has(submissionId))throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
  if(input.revision!==contactRevision(ctx.acquisitionSnapshots[submissionId]))throw new RegistryError(409,'CONTACT_REVISION_CONFLICT');
  if(ctx.acquisitions.get(submissionId)!.commercialDraft||[...ctx.missions.values()].some(m=>m.acquisitionSubmissionId===submissionId&&m.emailDraft))throw new RegistryError(409,'CONTACT_DRAFT_REVIEW_REQUIRED');
  ctx.contactWrite={action:'update',submissionId,name,email};
 }else{
  submissionId='native-contact:'+randomUUID();
  const intake:MdProjectIntake={schema:'md.project-intake.v1',submissionId,source:{system:'clara-os',channel:'contact-reviewed',locale:input.locale},contact:{name,email},request:{projectType:'Contact',disciplines:[],location:'',schedule:'',brief:'Contact explicitly reviewed in the selected native client/project; no inferred opportunity.'},orchestration:{owner:'clara-os',initialState:'received',specialistRouting:'clara-os-decides',humanApproval:'required-for-committing-actions'},receivedAt:new Date().toISOString()};
  const qualification=qualifyProjectIntake(intake,{intent:'qualify-project',summary:'Explicit contact review',confidence:1,entities:[],actions:[],importance:0,urgency:0,impact:0});
  const decisionBrief=buildAcquisitionDecisionBrief(qualification),lifecycle=advanceAcquisitionLifecycle(initialAcquisitionLifecycle(submissionId),{type:'qualification-updated',qualification,brief:decisionBrief});
  ctx.contactWrite={action:'create',submissionId,name,email,intake,qualification,decisionBrief,lifecycle,eventId:randomUUID()};
 }
 await new Journal().addEntry(writeActionEntry(input.action==='create'?'CONTACT_CREATED':'CONTACT_UPDATED',JSON.stringify({submissionId,clientId:ctx.scope.clientId,projectId:ctx.scope.projectId})));
 ctx.session.updatedAt=new Date();return {success:true,submissionId};
}
