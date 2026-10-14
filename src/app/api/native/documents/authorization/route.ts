import {nativeSelectors,nativeFailure} from '@/lib/native/authority';
import {nativeCommand} from '@/lib/native/scoped-context';
import {opaque} from '@/lib/canonical/registry';
export async function GET(request:Request){
 try{
  const scope=nativeSelectors(request),fileId=opaque(new URL(request.url).searchParams.get('fileId'));
  const verification=await nativeCommand(scope,'document',{fileId});
  return Response.json({success:false,code:'DRIVE_PRINCIPAL_AND_PERMISSION_PROOF_REQUIRED',verification},{status:409,headers:{'Cache-Control':'no-store'}});
 }catch(error){return nativeFailure(error);}
}
