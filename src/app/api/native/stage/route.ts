import {nativeSelectors,readAuthorizedNativeSession,nativeFailure} from '@/lib/native/authority';
import {sameOrigin,fields,registryBody,registrySuccess} from '@/lib/canonical/http';
import {opaque,RegistryError,challengeDigest} from '@/lib/canonical/registry';
import {stageAuthority} from '@/lib/canonical/stage-authority';
import {callLiveCanonical} from '@/lib/canonical/live-bridge';
export const runtime='nodejs';
export async function POST(request:Request){try{
 sameOrigin(request);const scope=nativeSelectors(request);await readAuthorizedNativeSession(request);
 const b=await registryBody(request);
 if(b.action==='list'){fields(b,['action']);return registrySuccess(await stageAuthority.command(scope,scope.clientId,scope.projectId,'list',{nativeSessionId:scope.sessionId}));}
 if(b.action==='grantLight'){fields(b,['action','userId','enabled']);if(typeof b.enabled!=='boolean')throw new RegistryError(400,'EXPLICIT_LIGHT_GRANT_REQUIRED');return registrySuccess(await stageAuthority.command(scope,scope.clientId,scope.projectId,'grantLight',{userId:opaque(b.userId),enabled:b.enabled}));}
 if(b.action==='grantSpatial'){fields(b,['action','userId','enabled','domain','operation']);if(typeof b.enabled!=='boolean'||!['light','sound','video','structure','production'].includes(String(b.domain))||!['create','pose','support','retire'].includes(String(b.operation)))throw new RegistryError(400,'EXPLICIT_SPATIAL_GRANT_REQUIRED');return registrySuccess(await stageAuthority.command(scope,scope.clientId,scope.projectId,'grantSpatial',{userId:opaque(b.userId),enabled:b.enabled,domain:b.domain,operation:b.operation}));}
 if(b.action==='approve'){fields(b,['action','intentId']);return registrySuccess(await stageAuthority.approve(scope,scope.clientId,scope.projectId,opaque(b.intentId)));}
 if(b.action!=='revoke')throw new RegistryError(400,'INVALID_STAGE_ACTION');
 fields(b,['action','decisionId','nonce','intentDigest']);
 const payload={id:opaque(b.decisionId),...(b.nonce!==undefined?{nonceHash:challengeDigest(b.nonce)}:{}),...(b.intentDigest!==undefined?{intentDigest:b.intentDigest}:{}),nativeSessionId:scope.sessionId};
 const decision=await stageAuthority.command(scope,scope.clientId,scope.projectId,'inspect',payload);
 if(decision.state==='revoked')return registrySuccess(decision);
 const receipt=await callLiveCanonical('/api/core/canonical/stage/cancel',{decision}) as {state?:string;receipt?:Record<string,unknown>};
 if(receipt.state==='committed'&&receipt.receipt){await stageAuthority.command(scope,scope.clientId,scope.projectId,'settle',{...payload,intentDigest:(decision.intent as {intentDigest:string}).intentDigest,receipt:receipt.receipt});throw new RegistryError(409,'STAGE_ALREADY_COMMITTED');}
 if(receipt.state!=='cancelled')throw new RegistryError(409,'STAGE_ALREADY_COMMITTED_OR_UNCERTAIN');
 return registrySuccess(await stageAuthority.command(scope,scope.clientId,scope.projectId,'revoke',{...payload,liveCancellation:'cancelled'}));
 }catch(e){return nativeFailure(e);}}
