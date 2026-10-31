import {authenticateExternalProduct} from '@/lib/external-capabilities/config';
import {stageAuthority} from '@/lib/canonical/stage-authority';
import {challengeDigest,opaque,RegistryError} from '@/lib/canonical/registry';
import {fields,registryBody,registryFailure,registrySuccess} from '@/lib/canonical/http';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const product=authenticateExternalProduct('clara-live',request.headers.get('authorization'));
 if(!product||request.headers.get('x-clara-product')!=='clara-live')throw new RegistryError(401,'PRODUCT_AUTHENTICATION_REQUIRED');
 if(!product.capabilities.some(c=>c==='stage:light:mutate:v1'||/^stage:(light|sound|video|structure|production):mutate:v2$/.test(c)))throw new RegistryError(403,'STAGE_CAPABILITY_REQUIRED');
 const body=await registryBody(request);fields(body,['action','decisionId','nonce','intentDigest','receipt']);
 if(body.action!=='claim'&&body.action!=='inspect'&&body.action!=='settle')throw new RegistryError(400,'INVALID_STAGE_ACTION');
 const context={digest:'',workspaceId:product.workspaceId};const payload={id:opaque(body.decisionId),nonceHash:challengeDigest(body.nonce),intentDigest:body.intentDigest,receipt:body.receipt};
 const inspected=await stageAuthority.command(context,'','','inspect',payload);
 if(!product.capabilities.includes(String((inspected.intent as Record<string,unknown>)?.capability)))throw new RegistryError(403,'STAGE_CAPABILITY_REQUIRED');
 return registrySuccess(await stageAuthority.command({digest:'',workspaceId:product.workspaceId},'','',body.action,{id:opaque(body.decisionId),nonceHash:challengeDigest(body.nonce),intentDigest:body.intentDigest,receipt:body.receipt}));
 }catch(e){return registryFailure(e);}}
