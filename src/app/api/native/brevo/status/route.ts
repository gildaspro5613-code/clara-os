import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {RegistryError} from '@/lib/canonical/registry';
import {CURRENT_WORKSPACE_ID} from '@/lib/connections/current-workspace';
import {brevoReadOAuthStatus} from '@/lib/connectors/brevo/read-oauth-status';

export const dynamic='force-dynamic';
export const runtime='nodejs';

/** Metadata only: a configured key is not proof that Brevo accepted an API call.
 * The historical /api/connections/brevo route remains fenced. */
export async function GET(request:Request){
 try{
  return await withNativeScope(request,false,async()=>{
   const context=nativeContext();
   if(!context || context.scope.workspaceId!==CURRENT_WORKSPACE_ID)
     throw new RegistryError(403,'BREVO_WORKSPACE_DENIED');
   const configured=Boolean(process.env.BREVO_API_KEY?.trim());
   return Response.json({
     provider:'brevo',connected:false,
     status:configured?'CONFIGURED':'NOT_CONFIGURED',
     apiKeyConfigured:configured,
     oauthReady:brevoReadOAuthStatus().ready,
   },{headers:{'Cache-Control':'private, no-store'}});
  });
 }catch(error){return nativeFailure(error);}
}
