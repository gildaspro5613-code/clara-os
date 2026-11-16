import {Journal} from '@/lib/core/journal';
import {writeActionEntry} from '@/lib/core/journal-writer';
import {RegistryError} from '@/lib/canonical/registry';
import {nativeMission,writableNativeContext} from './scoped-context';

/** Business ownership is not permission to reassign an existing conversation. */
export function contactContextIsEmpty(session: ReturnType<typeof writableNativeContext>['session']) {
 return !session.conversation.length&&!session.brainDashboard&&!session.recommendation&&!session.sources?.length&&!session.documentReferences?.length;
}
export async function associateNativeMissionContact(missionId:string,submissionId:string) {
 const ctx=writableNativeContext(),mission=ctx.missions.get(missionId);
 if(!mission||ctx.session.mission?.id!==missionId||!ctx.acquisitions.has(submissionId))throw new RegistryError(403,'NATIVE_ACQUISITION_DENIED');
 if(ctx.missionContactProtocolVersion!==1)throw new RegistryError(503,'NATIVE_MISSION_CONTACT_MIGRATION_REQUIRED');
 if(mission.acquisitionSubmissionId&&mission.acquisitionSubmissionId!==submissionId||ctx.session.acquisitionSubmissionId&&ctx.session.acquisitionSubmissionId!==submissionId)throw new RegistryError(409,'NATIVE_NEW_SESSION_REQUIRED');
 const requiresNewSession=!ctx.session.acquisitionSubmissionId&&(!!mission.acquisitionSubmissionId||!contactContextIsEmpty(ctx.session));
 if(mission.acquisitionSubmissionId===submissionId)return {success:true,mission,requiresNewSession};
 const updated={...mission,acquisitionSubmissionId:submissionId};
 nativeMission(updated);ctx.session.mission=updated;
 // Empty threads can activate the newly selected contact. Existing turns,
 // Brain, documents and receipts keep their original active context.
 if(!requiresNewSession)ctx.session.acquisitionSubmissionId=submissionId;
 ctx.session.updatedAt=new Date();
 ctx.missionContactWrite={missionId,submissionId};
 await new Journal().addEntry(writeActionEntry('MISSION_CONTACT_ASSOCIATED',JSON.stringify({missionId,submissionId,requiresNewSession})));
 return {success:true,mission:updated,requiresNewSession};
}
