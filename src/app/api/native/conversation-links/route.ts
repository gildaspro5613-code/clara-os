import {canonicalConversationLinks as links} from '@/lib/canonical/conversation-links';
import {fields,registryBody,registryFailure,registrySuccess,sameOrigin} from '@/lib/canonical/http';
import {opaque,RegistryError} from '@/lib/canonical/registry';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const id=opaque(new URL(request.url).searchParams.get('id'));return registrySuccess(await links.command(request,'read',{id}));}catch(e){return registryFailure(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const b=await registryBody(request);
 if(b.action==='request'){fields(b,['action','requestId','liveConversationId']);if(typeof b.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(b.requestId))throw new RegistryError(400,'INVALID_CONVERSATION_REQUEST');return registrySuccess(await links.request(request,b.requestId,opaque(b.liveConversationId)));}
 fields(b,['action','id','expectedRevision','approve']);if(!Number.isSafeInteger(b.expectedRevision)||(b.expectedRevision as number)<1)throw new RegistryError(400,'INVALID_CONVERSATION_REVISION');
 if(b.action==='approve'&&b.approve===true)return registrySuccess(await links.approve(request,opaque(b.id),b.expectedRevision as number));
 if(b.action==='revoke'&&b.approve===true)return registrySuccess(await links.revoke(request,opaque(b.id),b.expectedRevision as number));
 throw new RegistryError(400,'EXPLICIT_CONVERSATION_DECISION_REQUIRED');
}catch(e){return registryFailure(e);}}
