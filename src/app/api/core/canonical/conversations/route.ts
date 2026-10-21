import {canonicalConversationLinks as links,CONVERSATION_LINK_CAPABILITY} from '@/lib/canonical/conversation-links';
import {authenticateExternalProduct} from '@/lib/external-capabilities/config';
import {fields,registryBody,registryFailure,registrySuccess} from '@/lib/canonical/http';
import {opaque,RegistryError} from '@/lib/canonical/registry';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 const p=authenticateExternalProduct('clara-live',request.headers.get('authorization'));
 if(!p||request.headers.get('x-clara-product')!=='clara-live')throw new RegistryError(401,'PRODUCT_AUTHENTICATION_REQUIRED');
 if(!p.capabilities.includes(CONVERSATION_LINK_CAPABILITY))throw new RegistryError(403,'CONVERSATION_LINK_CAPABILITY_REQUIRED');
 const b=await registryBody(request);fields(b,['action','associationId']);
 if(b.action!=='inspect'&&b.action!=='authorize'&&b.action!=='stop')throw new RegistryError(400,'INVALID_CONVERSATION_COMMAND');
 return registrySuccess(await links.product(p.workspaceId,opaque(b.associationId),b.action==='inspect'?'inspectProduct':b.action==='stop'?'stopProduct':'authorizeProduct'));
}catch(e){return registryFailure(e);}}
