import {nativeOperationFence,nativeFailure} from '@/lib/native/authority';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {NativeGoogleWork} from '@/lib/native/google-work';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const denied=await nativeOperationFence(request,'google-calendar-read');if(denied)return denied;
 try{return await withNativeScope(request,false,async()=>Response.json(await(await new NativeGoogleWork(nativeContext()!.session.googleConnectionId!).initialize()).events(new URL(request.url).searchParams.get('pageToken')??undefined,new URL(request.url).searchParams.get('timeMin')??undefined,new URL(request.url).searchParams.get('timeMax')??undefined),{headers:{'Cache-Control':'no-store'}}));}catch(error){return nativeFailure(error);}
}
