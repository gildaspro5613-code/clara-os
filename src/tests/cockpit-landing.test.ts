import test from 'node:test';
import assert from 'node:assert/strict';
import {neonConfig} from '@neondatabase/serverless';
import {cockpitLanding} from '../lib/native/cockpit-landing';
import {checkedRegistryList,registryListMessage} from '../lib/native/registry-list-response';
import {readFileSync} from 'node:fs';

test('workspace welcome uses existing authenticated resolver, no business query; absent/revoked/expired/ambiguous access denied',async t=>{
 const previous=neonConfig.fetchFunction,old=process.env.DATABASE_URL;
 t.after(()=>{neonConfig.fetchFunction=previous;if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old;});
 process.env.DATABASE_URL='postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic';
 let mode='member',calls=0;
 neonConfig.fetchFunction=async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));
  assert.match(body.query,/SELECT s.user_id, m.workspace_id, m.role/);
  assert.match(body.query,/s.revoked_at IS NULL AND s.expires_at > NOW\(\)/);assert.match(body.query,/m.revoked_at IS NULL/);assert.match(body.query,/LIMIT 2/);
  assert(!/\b(INSERT|UPDATE|DELETE)\b/.test(body.query));
  if(mode==='sql-error')throw Error('synthetic transport failure');
  const row=['synthetic-member','synthetic-empty-workspace','member'];
  const rows=mode==='member'?[row]:mode==='ambiguous'?[row,['synthetic-member','foreign-workspace','member']]:[];
  return Response.json({fields:['user_id','workspace_id','role'].map(name=>({name,dataTypeID:25})),rows});
 };
 const request=(cookie:string)=>new Request('https://native-selector.invalid',{headers:{cookie}});
 for(const cookie of ['', 'clara_auth_session=bad','clara_auth_session='+'A'.repeat(43)+'; clara_auth_session='+'B'.repeat(43)])assert.equal(await cockpitLanding(request(cookie)),'locked');
 assert.equal(calls,0);
 const valid=request('clara_auth_session='+'A'.repeat(43));assert.equal(await cockpitLanding(valid),'welcome');assert.equal(calls,1);
 for(mode of ['expired','revoked','membership-revoked','ambiguous'])assert.equal(await cockpitLanding(valid),'locked');
 mode='sql-error';await assert.rejects(cockpitLanding(valid));
 const before=calls;
 for(const selection of ['', 'malformed',encodeURIComponent(JSON.stringify({workspaceId:'foreign'}))]){
  assert.equal(await cockpitLanding(request('clara_auth_session='+'A'.repeat(43)+'; clara_native_selection='+selection)),'scoped');
 }
 assert.equal(calls,before); // Existing nativePage, not a workspace fallback, owns these refusals.
 const page=readFileSync('src/app/page.tsx','utf8');assert.match(page,/return nativePage\(async/);
 const welcome=readFileSync('src/components/cockpit/WorkspaceWelcome.tsx','utf8');
 assert(!/resolveOperationalContext|loadMissions|ClaraChatWidget|AgendaWidget|loadSession/.test(welcome));assert.match(welcome,/nativeContextAvailable=\{false\}/);
});

test('authorized empty registry list differs from 401/403/503 and malformed responses',async()=>{
 assert.deepEqual(await checkedRegistryList(Response.json({success:true,data:[]})),[]);
 for(const [status,key] of [[401,'signInToViewAuthorizedProjects'],[403,'nativeContextForbidden'],[503,'nativeContextUnavailable']] as const){
  try{await checkedRegistryList(Response.json({success:false,data:[]},{status}));assert.fail('must refuse');}catch(error){assert.equal(registryListMessage(error),key);}
 }
 for(const body of [{success:false,data:[]},{success:true,data:null}])await assert.rejects(checkedRegistryList(Response.json(body)));
 assert.equal(registryListMessage(Error('private transport details')),'nativeContextUnavailable');
});
