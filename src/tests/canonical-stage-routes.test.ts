import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as core} from '@/app/api/core/canonical/stage/route';
import {POST as native} from '@/app/api/native/stage/route';

test('Stage HTTP authority fails before SQL/transport for missing product/native identity, read/archive scopes and foreign origins',async(t)=>{
 const keys=['CLARA_EXTERNAL_PRODUCTS_JSON','CLARA_LIVE_PRODUCT_TOKEN','CLARA_LIVE_WORKSPACE_ID','CLARA_LIVE_CAPABILITIES','CLARA_AUTH_APP_ORIGIN'] as const;
 const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 t.after(()=>{for(const k of keys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}});
 delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
 process.env.CLARA_LIVE_PRODUCT_TOKEN='synthetic-stage-route-token';process.env.CLARA_LIVE_WORKSPACE_ID='w';process.env.CLARA_LIVE_CAPABILITIES='["canonical-links:v1"]';process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 let transports=0;t.mock.method(globalThis,'fetch',async()=>{transports++;throw Error('No external or SQL transport permitted');});
 const req=(headers:Record<string,string>={},body:unknown={action:'claim'})=>new Request('https://os.fixture.example/api/core/canonical/stage',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await core(req())).status,401);
 assert.equal((await core(req({Authorization:'Bearer synthetic-stage-route-token','x-clara-product':'clara-live'}))).status,403,'read/archive product scope never authorizes Stage mutation');
 process.env.CLARA_LIVE_CAPABILITIES='["canonical-links:v1","stage:light:mutate:v1"]';
 assert.equal((await core(req({Authorization:'Bearer synthetic-stage-route-token','x-clara-product':'clara-live'},{action:'apply_stage_proposal'}))).status,400);
 const nativeReq=(origin:string,cookie?:string,session='native:stage')=>new Request('https://os.fixture.example/api/native/stage?workspaceId=w&clientId=c&projectId=p&sessionId='+encodeURIComponent(session),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({action:'approve',intentId:'a'.repeat(64)})});
 assert.equal((await native(nativeReq('https://foreign.invalid'))).status,403);
 assert.equal((await native(nativeReq('https://os.fixture.example'))).status,401);
 assert.equal((await native(nativeReq('https://os.fixture.example','clara_auth_session='+'A'.repeat(43),'external:legacy'))).status,403);
 assert.equal(transports,0);
});
