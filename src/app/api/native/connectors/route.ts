import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {RegistryError} from '@/lib/canonical/registry';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {discoverNativeConnectorReads} from '@/lib/connectors/core/native-connector-builder-discovery';
import {nativeConnectorCandidates} from '@/lib/connectors/core/native-connector-builder-candidates';
import {nativeBuilderAdmin} from '@/lib/connectors/core/native-connector-builder-admin';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};

export async function GET(request:Request){
 try{
  return await withNativeScope(request,false,async()=>{
   const directory=new ConnectorBuilderDirectory();
   const [authorized,candidates]=await Promise.all([
    discoverNativeConnectorReads(directory),
    nativeConnectorCandidates(directory),
   ]);
   return Response.json({
    authorized:authorized.map(({provider,capabilityId,connectionId})=>({
     provider,capabilityId,connectionId,
    })),
    candidates:candidates.map(({provider,capabilityId,connectionId})=>({
     provider,capabilityId,connectionId,
    })),
    certified:false, // A grant is never proof of provider E2E reception.
   },{headers});
  });
 }catch(error){return nativeFailure(error);}
}

/** Browser-only, explicit owner-approved READ grant/revoke; never a model tool.
 * All account and actor permissions are revalidated inside canonical SQL.
 * No provider action, WRITE/SEND capability or raw token is accepted.
 */
export async function POST(request:Request){
 try{
  return await withNativeScope(request,true,async()=>{
   const text=await request.text();
   if(text.length>2500)throw new RegistryError(413,'CONNECTOR_BUILDER_INPUT_TOO_LARGE');
   let raw:unknown;
   try{raw=JSON.parse(text);}catch{throw new RegistryError(400,'CONNECTOR_BUILDER_INVALID_INPUT');}
   if(!raw||typeof raw!=='object'||Array.isArray(raw))
    throw new RegistryError(400,'CONNECTOR_BUILDER_INVALID_INPUT');
   const body=raw as Record<string,unknown>;
   if(Object.keys(body).sort().join('|')!=='approved|capabilityId|connectionId|operation'||
      body.approved!==true||
      (body.operation!=='grant'&&body.operation!=='revoke')||
      typeof body.capabilityId!=='string'||
      typeof body.connectionId!=='string')
    throw new RegistryError(400,'CONNECTOR_BUILDER_EXPLICIT_APPROVAL_REQUIRED');

   const ctx=nativeContext();
   if(!ctx)throw new RegistryError(403,'CONNECTOR_BUILDER_AUTH_REQUIRED');
   const directory=new ConnectorBuilderDirectory();
   const outcome=await nativeBuilderAdmin(directory)(
    body.operation,{connectionId:body.connectionId,
     capabilityId:body.capabilityId,ownerUserId:ctx.userId,
     reason:body.operation==='grant'
      ? 'Autorisation de lecture confirmée depuis Clara OS'
      : 'Révocation de lecture confirmée depuis Clara OS',
     approved:true,
    },
   );
   return Response.json({success:true,operation:outcome.operation,
    capabilityId:outcome.capabilityId,revision:outcome.revision},{headers});
  });
 }catch(error){return nativeFailure(error);}
}
