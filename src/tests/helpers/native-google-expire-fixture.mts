import {execFileSync} from 'node:child_process';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';
const [db,id]=process.argv.slice(2);
if(!/^native_browser_[a-f0-9]{32}$/.test(db??'')||! /^[a-f0-9-]{36}$/.test(id??''))throw Error('Exact isolated Google fixture required');
const payload=encryptCredentialPayload({accessToken:'synthetic-google-a',refreshToken:'synthetic-refresh-google-a',expiresAt:Date.now()-60_000,scope:['openid','https://www.googleapis.com/auth/drive.readonly']},Buffer.alloc(32,9));
execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1','-c',`UPDATE clara_connection_credentials SET encrypted_payload='${payload.replaceAll("'","''")}' WHERE connection_id='${id}' AND EXISTS(SELECT 1 FROM clara_native_google_authority WHERE connection_id='${id}' AND owner_user_id='a' AND revoked_at IS NULL)`],{stdio:['pipe','pipe','pipe']});
