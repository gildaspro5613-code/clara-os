import {encryptCredentialPayload} from '@/lib/connections/credential-store';
import {syntheticPdf} from './synthetic-pdf';
import {writeFileSync} from 'node:fs';
import {seedNativeCommercialFixture} from './native-commercial-fixture';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const container='clara-canonical-test-postgres',db=process.argv[2];
if(!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Unique isolated database required');
const pg=(statement:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1','-c',statement],{stdio:['pipe','pipe','pipe']});
execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
for(const n of ['001_authenticated_workspaces','002_verified_auth_identities','007_external_event_jobs','008_canonical_client_project_registry','012_native_resource_authority','013_native_scoped_runtime','014_native_commercial_continuity','015_native_google_document_authority','016_native_ionos_mail','017_native_conversation_continuity','018_native_mail_pagination','019_native_contact_editing','020_native_google_workspace','021_native_mail_five_accounts','022_native_mail_monitor_authority','023_native_mail_monitor_runtime','025_native_mission_contact_association','026_native_document_continuity','028_native_job_kind_compatibility','030_native_consultation_threads'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+n+'.sql'),stdio:['pipe','pipe','pipe']});
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b');INSERT INTO clara_auth_workspaces(id) VALUES('w');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash('A'.repeat(43))}','a',NOW()+INTERVAL '1 hour'),('${hash('B'.repeat(43))}','b',NOW()+INTERVAL '1 hour');INSERT INTO clara_sessions(id,data) VALUES('default','{"conversation":[{"content":"PRIVATE_LEGACY_HISTORY"}]}');`);
for(const [c,projects]of [['c1',['p1','p2']],['c2',['p3']]] as const){
 pg(`INSERT INTO clara_registry_clients VALUES('w','${c}','Client ${c}','a',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('w','${c}','a',true,true,true,NULL),('w','${c}','b',true,true,true,NULL)`);
 for(const p of projects)pg(`INSERT INTO clara_registry_projects VALUES('w','${p}','${c}','Project ${p}','a',NOW(),NULL);INSERT INTO clara_registry_project_access VALUES('w','${p}','a',true,true,true,NULL),('w','${p}','b',true,true,true,NULL)`);
}
seedNativeCommercialFixture(pg);
pg(`INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash('C'.repeat(43))}','a',NOW()+INTERVAL '1 hour'),('${hash('E'.repeat(43))}','a',NOW()+INTERVAL '1 hour');INSERT INTO clara_auth_sessions(token_hash,user_id,created_at,expires_at) VALUES('${hash('D'.repeat(43))}','a',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour');`);
console.info('Native browser fixture initialized; no production connections.');

pg("INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('https://accounts.google.com','google-a','a'),('https://accounts.google.com','google-b','b')");
writeFileSync('/tmp/native-fixture-google-state-'+db,JSON.stringify({versions:{'document-a':'1','document-shared':'1','document-b':'1','document-p3':'1'},denied:[],principal:null,pdf:syntheticPdf('LOT2_AUTHORIZED_PDF Capacity 800 places; opening 10m.').toString('base64'),foreignPdf:syntheticPdf('LOT2_FOREIGN_DOCUMENT PRIVATE_B').toString('base64')}));

const foreignCredentials=encryptCredentialPayload({accessToken:'synthetic-google-b',refreshToken:'synthetic-refresh-google-b',expiresAt:Date.now()+3600000},Buffer.alloc(32,9));
pg(`INSERT INTO clara_connections(id,workspace_id,provider,status,scopes) VALUES('foreign-google-b','w','google','ACTIVE','["openid","https://www.googleapis.com/auth/drive.readonly"]');INSERT INTO clara_native_google_authority(connection_id,owner_user_id,workspace_id,issuer,subject) VALUES('foreign-google-b','b','w','https://accounts.google.com','google-b');INSERT INTO clara_connection_credentials(connection_id,encrypted_payload) VALUES('foreign-google-b','${foreignCredentials.replaceAll("'","''")}')`);
