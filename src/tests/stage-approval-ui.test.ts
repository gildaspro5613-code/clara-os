import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '@/app/stage-approval/route';

test('Stage approval UI rejects foreign return origins and unauthenticated or external native sessions before any transport',async t=>{
 const previous=process.env.CLARA_LIVE_CALLBACK_BASE_URL;
 process.env.CLARA_LIVE_CALLBACK_BASE_URL='https://live.fixture.example';
 t.after(()=>{if(previous===undefined)delete process.env.CLARA_LIVE_CALLBACK_BASE_URL;else process.env.CLARA_LIVE_CALLBACK_BASE_URL=previous;});
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('No SQL or product transport allowed');});
 const url='https://os.fixture.example/stage-approval?intentId='+'a'.repeat(64)+'&returnOrigin=';
 assert.equal((await GET(new Request(url+'https://attacker.example'))).status,403);
 assert.equal((await GET(new Request(url+'https://live.fixture.example'))).status,401);
 assert.equal((await GET(new Request(url+'https://live.fixture.example&workspaceId=w&clientId=c&projectId=p&sessionId=external%3Alegacy',{headers:{Cookie:'clara_auth_session='+'A'.repeat(43)}}))).status,403);
 assert.equal((await GET(new Request(url.replace('a'.repeat(64),'invalid')+'https://live.fixture.example'))).status,400);
 assert.equal(calls,0);
});
