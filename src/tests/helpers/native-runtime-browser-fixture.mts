import {seedNativeCommercialFixture} from './native-commercial-fixture';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const container='clara-canonical-test-postgres',db=process.argv[2];
if(!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Unique isolated database required');
const pg=(statement:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1','-c',statement],{stdio:['pipe','pipe','pipe']});
execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
for(const n of ['001_authenticated_workspaces','002_verified_auth_identities','008_canonical_client_project_registry','012_native_resource_authority','013_native_scoped_runtime','014_native_commercial_continuity'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+n+'.sql'),stdio:['pipe','pipe','pipe']});
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b');INSERT INTO clara_auth_workspaces(id) VALUES('w');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash('A'.repeat(43))}','a',NOW()+INTERVAL '1 hour'),('${hash('B'.repeat(43))}','b',NOW()+INTERVAL '1 hour');INSERT INTO clara_sessions(id,data) VALUES('default','{"conversation":[{"content":"PRIVATE_LEGACY_HISTORY"}]}');`);
for(const [c,projects]of [['c1',['p1','p2']],['c2',['p3']]] as const){
 pg(`INSERT INTO clara_registry_clients VALUES('w','${c}','Client ${c}','a',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('w','${c}','a',true,true,true,NULL),('w','${c}','b',true,true,true,NULL)`);
 for(const p of projects)pg(`INSERT INTO clara_registry_projects VALUES('w','${p}','${c}','Project ${p}','a',NOW(),NULL);INSERT INTO clara_registry_project_access VALUES('w','${p}','a',true,true,true,NULL),('w','${p}','b',true,true,true,NULL)`);
}
seedNativeCommercialFixture(pg);
pg(`INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash('C'.repeat(43))}','a',NOW()+INTERVAL '1 hour'),('${hash('E'.repeat(43))}','a',NOW()+INTERVAL '1 hour');INSERT INTO clara_auth_sessions(token_hash,user_id,created_at,expires_at) VALUES('${hash('D'.repeat(43))}','a',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour');`);
console.info('Native browser fixture initialized; no production connections.');
