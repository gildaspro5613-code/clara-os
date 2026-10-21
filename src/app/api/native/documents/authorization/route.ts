import {nativeFailure} from '@/lib/native/authority';
import {withNativeScope} from '@/lib/native/scoped-context';
import {selectedNativeDocuments} from '@/lib/native/documents';
import {opaque} from '@/lib/canonical/registry';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{return await withNativeScope(request,false,async()=>{
  const fileId=opaque(new URL(request.url).searchParams.get('fileId'));
  const verification=await (await selectedNativeDocuments()).authorize(fileId);
  return Response.json({success:true,verification},{headers:{'Cache-Control':'no-store'}});
 });}catch(error){return nativeFailure(error);}
}
