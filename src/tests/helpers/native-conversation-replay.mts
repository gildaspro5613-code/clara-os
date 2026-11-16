/** Independent process recovery against disposable PostgreSQL only. No providers. */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {nativeChatRequest} from '@/lib/native/chat';
import type {RegistryQuery} from '@/lib/canonical/registry';
const fixture=JSON.parse(readFileSync(0,'utf8'));if(!/^native_browser_[a-f0-9]{32}$/.test(fixture.db))throw Error('Isolated fixture required');
process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');const output=execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',fixture.db,'-qAt','-v','ON_ERROR_STOP=1','-c',`SELECT row_to_json(r) FROM (${statement})r`],{encoding:'utf8',stdio:'pipe'});return output.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));};
let rendered=false;
const request=new Request('https://os.fixture.example/api/clara/chat?'+new URLSearchParams(fixture.scope),{method:'POST',headers:{cookie:'clara_auth_session='+'A'.repeat(43),origin:'https://os.fixture.example','Content-Type':'application/json'},body:JSON.stringify(fixture.body)});
const response=await nativeChatRequest(request,async()=>{rendered=true;throw Error('Recovery must never invoke cognition');},query);
console.log(JSON.stringify({status:response.status,replayed:response.headers.get('X-Clara-Operation-Replayed'),rendered}));
