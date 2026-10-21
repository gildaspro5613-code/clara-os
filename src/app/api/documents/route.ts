import {withNativeScope,nativeRequest} from '@/lib/native/scoped-context';
import {selectedNativeDocuments} from '@/lib/native/documents';
import {nativeFailure} from '@/lib/native/authority';
import {fields,registryBody} from '@/lib/canonical/http';
import {RegistryError} from '@/lib/canonical/registry';
import {DocumentReadError} from '@/lib/documents/document-read-error';
import {safeResponseLocale} from '@/i18n/response-language';
export const runtime='nodejs';export const dynamic='force-dynamic';
function failure(error:unknown){if(error instanceof DocumentReadError)return Response.json({success:false,code:error.code},{status:error.status,headers:{'Cache-Control':'no-store'}});return nativeFailure(error);}
export async function GET(request:Request){try{return await withNativeScope(request,false,async()=>{
 const params=new URL(request.url).searchParams,action=params.get('action')??'list';
 if(!['list','references','download'].includes(action))throw new RegistryError(405,'NATIVE_DOCUMENT_POST_REQUIRED');
 const documents=await selectedNativeDocuments();if(action==='download')return documents.download(params.get('fileId')??'');return Response.json(action==='references'?await documents.references():await documents.list(params.get('query')??''),{headers:{'Cache-Control':'no-store'}});
});}catch(error){return failure(error);}}
export async function POST(request:Request){return nativeRequest(request,async()=>{try{
 const body=await registryBody(request.clone());fields(body,['action','fileId',...(body.action==='bind'?['version']:body.action==='read'?['question','locale']:[])]);
 if(!['inspect','bind','read'].includes(String(body.action)))throw new RegistryError(503,'NATIVE_DOCUMENT_MUTATION_NOT_CERTIFIED');
 if(typeof body.fileId!=='string'||typeof body.question==='string'&&body.question.length>4000||body.question!==undefined&&typeof body.question!=='string')throw new RegistryError(400,'INVALID_DOCUMENT_REQUEST');
 const docs=await selectedNativeDocuments();const data=body.action==='inspect'?await docs.inspect(body.fileId):body.action==='bind'?await docs.bind(body.fileId,String(body.version??'')):await docs.read(body.fileId,body.question as string|undefined,safeResponseLocale(body.locale));
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}});}
