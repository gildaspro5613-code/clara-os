import {NextResponse} from 'next/server';
import {nativeSelectors} from '@/lib/native/authority';
import {validateMakeCloneRuntime} from '@/lib/native/make-scoped-credentials';
import {sql} from '@/lib/core/store/database';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const unavailable=()=>NextResponse.json({
 state:'uncertified',certified:false,authorized:false
},{headers});

/** Authenticated native certification status.
 * No credentials, audit payloads, provider calls, grant or write operations.
 * Unavailable/non-clone runtimes never claim a successful certification.
 */
export async function GET(request:Request){
 if(!validateMakeCloneRuntime())return unavailable();
 let scope:ReturnType<typeof nativeSelectors>;
 try{scope=nativeSelectors(request);}
 catch{return NextResponse.json({state:'unauthorized',certified:false,authorized:false},{status:401,headers});}
 try{
  const rows=await sql`
   SELECT clara_make_runtime_scope.native_make_readiness(
    ${scope.digest},${scope.workspaceId},${scope.clientId},
    ${scope.projectId},${scope.sessionId}
   ) AS result
  `;
  const row=(rows[0] as {result?:unknown}|undefined)?.result;
  if(!row||typeof row!=='object'||Array.isArray(row))
   return unavailable();
  const data=row as Record<string,unknown>;
  const allowedStates=['uncertified','configured','ready_for_test','certified','certified_inactive'];
  const state=typeof data.state==='string'&&allowedStates.includes(data.state)?data.state:'uncertified';
  const certified=data.certified===true && (state==='certified'||state==='certified_inactive');
  const authorized=data.authorized===true && (state==='ready_for_test'||state==='certified');
  return NextResponse.json({
   state:certified?state:state.startsWith('certified')?'uncertified':state,
   certified,authorized,
  },{headers});
 }catch{
  // SQL denies absent/revoked sessions; never reveal SQL errors or secrets.
  return NextResponse.json({state:'unauthorized',certified:false,authorized:false},{status:403,headers});
 }
}
