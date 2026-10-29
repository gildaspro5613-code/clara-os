import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {neon,neonConfig} from '@neondatabase/serverless';
import {issueEnrollment,completeRecetteEnrollment,enrollmentReady,enrollmentProvider,digest,emailDigest} from '../lib/auth/recette-google-enrollment';

const container='clara-recette-enrollment-test',db='enroll_'+randomUUID().replaceAll('-','');
const args=['exec','-i',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1'];
const pg=(text:string)=>execFileSync('docker',args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const run=promisify(execFile);
const literal=(value:unknown)=>value===null?'NULL':"'"+String(value).replaceAll("'","''")+"'";
test('single-use enrollment: real PostgreSQL, limited role, atomic rollback, concurrency and durable receipt',async t=>{
 execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
 const role='enroll_'+randomUUID().replaceAll('-','');
 t.after(()=>{execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);execFileSync('docker',['exec',container,'psql','-U','postgres','-q','-c',`DROP ROLE ${role}`]);});
 for(const file of ['001_authenticated_workspaces.sql','002_verified_auth_identities.sql','003_auth_sign_in_transactions.sql'])pg(readFileSync('db/migrations/'+file,'utf8'));
 pg(`CREATE ROLE ${role};GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO ${role};`);
 pg("INSERT INTO clara_auth_workspaces(id) VALUES('recette-176-fictional-workspace-v1');INSERT INTO clara_auth_users(id) VALUES('recette-176-fictional-user-v1');INSERT INTO clara_auth_identities VALUES('urn:clara:recette:fixture:v1','fictional-operator-v1','recette-176-fictional-user-v1',NOW());INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('recette-176-fictional-user-v1','recette-176-fictional-workspace-v1','owner');");
 const snapshot=()=>pg("SELECT json_build_array((SELECT json_agg(t) FROM clara_auth_users t),(SELECT json_agg(t) FROM clara_auth_workspaces t),(SELECT json_agg(t) FROM clara_auth_identities t),(SELECT json_agg(t) FROM clara_workspace_memberships t))");
 const fixture=snapshot(),oldFetch=neonConfig.fetchFunction,prior={...process.env};
 t.after(()=>{neonConfig.fetchFunction=oldFetch;for(const k of Object.keys(process.env))if(!(k in prior))delete process.env[k];Object.assign(process.env,prior);});
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',CLARA_AUTH_APP_ORIGIN:'https://clara-os-recette.vercel.app',CLARA_AUTH_GOOGLE_REDIRECT_URI:'https://clara-os-recette.vercel.app/api/auth/google/callback'});delete process.env.POSTGRES_URL;
 let calls=0;
 neonConfig.fetchFunction=async(_url,init)=>{
  calls++;const batch=JSON.parse(String(init?.body));assert.ok(Array.isArray(batch.queries));
  const queries=batch.queries as {query:string;params:unknown[]}[];
  const statements=queries.map((q,index)=>{
   const text=q.query.replace(/\$(\d+)/g,(_m,n)=>literal(q.params[Number(n)-1]));
   return /^SELECT/i.test(text.trim())?`SELECT json_build_object('index',${index},'row',row_to_json(result)) FROM (${text}) result;`:text+';';
  });
  const readOnly=new Headers(init?.headers).get('Neon-Batch-Read-Only')==='true';
  // Distinct asynchronous backend processes; the lock is held across all writes.
  const sql=`BEGIN${readOnly?' READ ONLY':''};SET LOCAL ROLE ${role};${statements.join('\n')}COMMIT;`;
  const result=await run('docker',[...args,'-c',sql],{maxBuffer:1024*1024});
  const rows=result.stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  return Response.json({results:queries.map((_q,index)=>{
   const data=rows.filter(r=>r.index===index).map(r=>r.row);const names=Object.keys(data[0]??{});
   return {fields:names.map(name=>({name,dataTypeID:typeof data[0][name]==='boolean'?16:25})),rows:data.map(row=>names.map(name=>typeof row[name]==='boolean'?(row[name]?'t':'f'):row[name]))};
  })});
 };
 const query=neon(process.env.DATABASE_URL!);const token='t'.repeat(43),claims={sub:'synthetic-verified-subject',email:'owner@example.test',email_verified:true};
 assert.equal(await enrollmentReady(query),false);
 const issued=await Promise.allSettled([issueEnrollment(query,token,claims.email),issueEnrollment(query,'u'.repeat(43),claims.email)]);
 assert.equal(issued.filter(r=>r.status==='fulfilled').length,1);
 const activeHash=pg(`SELECT state_hash FROM clara_auth_sign_in_transactions WHERE provider='${enrollmentProvider}'`);
 const ticket=activeHash===digest(token)?token:'u'.repeat(43);
 assert.equal(await enrollmentReady(query),true);assert.equal(snapshot(),fixture);
 await assert.rejects(completeRecetteEnrollment(ticket,{...claims,email_verified:false}));
 await assert.rejects(completeRecetteEnrollment(ticket,{...claims,email:'foreign@example.test'}));assert.equal(snapshot(),fixture);
 pg(`UPDATE clara_auth_sign_in_transactions SET consumed_at=NOW() WHERE provider='${enrollmentProvider}'`);
 assert.equal(await enrollmentReady(query),false);await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(snapshot(),fixture);
 pg(`UPDATE clara_auth_sign_in_transactions SET consumed_at=NULL WHERE provider='${enrollmentProvider}'`);
 pg(`UPDATE clara_auth_sign_in_transactions SET expires_at=NOW()-INTERVAL '1 hour',created_at=NOW()-INTERVAL '2 hours' WHERE provider='${enrollmentProvider}'`);
 assert.equal(await enrollmentReady(query),false);
 await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(snapshot(),fixture);
 pg(`UPDATE clara_auth_sign_in_transactions SET created_at=NOW(),expires_at=NOW()+INTERVAL '30 minutes' WHERE provider='${enrollmentProvider}'`);
 // A pre-existing identity (including one with revoked membership) is never reassigned.
 pg(`INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('https://accounts.google.com','synthetic-verified-subject','recette-176-fictional-user-v1')`);
 await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(pg("SELECT count(*) FROM clara_auth_workspaces WHERE id='melodie-digital-recette'"),'0');
 pg("DELETE FROM clara_auth_identities WHERE issuer='https://accounts.google.com'");
 pg("INSERT INTO clara_auth_workspaces(id) VALUES('melodie-digital-recette');");
 await assert.rejects(completeRecetteEnrollment(ticket,claims));
 assert.equal(pg("SELECT count(*) FROM clara_auth_users"),'1');
 pg("DELETE FROM clara_auth_workspaces WHERE id='melodie-digital-recette';");
 // Force failure after workspace/user/identity INSERT: all must roll back,
 // including consumption of the authorization.
 pg("CREATE FUNCTION deny_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic interrupt'; END $$;CREATE TRIGGER deny_enrollment BEFORE INSERT ON clara_workspace_memberships FOR EACH ROW EXECUTE FUNCTION deny_membership();");
 await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(snapshot(),fixture);assert.equal(await enrollmentReady(query),true);
 pg('DROP TRIGGER deny_enrollment ON clara_workspace_memberships;DROP FUNCTION deny_membership();');
 pg(`REVOKE UPDATE ON clara_auth_sign_in_transactions FROM ${role}`);assert.equal(await enrollmentReady(query),false);pg(`GRANT UPDATE ON clara_auth_sign_in_transactions TO ${role}`);
 const attempts=await Promise.allSettled([completeRecetteEnrollment(ticket,claims),completeRecetteEnrollment(ticket,claims)]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(pg("SELECT count(*) FROM clara_workspace_memberships WHERE workspace_id='melodie-digital-recette' AND role='member' AND revoked_at IS NULL"),'1');
 assert.equal(pg("SELECT count(*) FROM clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id='recette-176-fictional-user-v1' AND role='owner'"),'1');
 assert.equal(pg("SELECT json_build_array((SELECT json_agg(t) FROM clara_auth_users t WHERE id='recette-176-fictional-user-v1'),(SELECT json_agg(t) FROM clara_auth_workspaces t WHERE id='recette-176-fictional-workspace-v1'),(SELECT json_agg(t) FROM clara_auth_identities t WHERE user_id='recette-176-fictional-user-v1'),(SELECT json_agg(t) FROM clara_workspace_memberships t WHERE user_id='recette-176-fictional-user-v1'))"),fixture);
 assert.equal(pg(`SELECT count(*) FROM clara_auth_sign_in_transactions WHERE provider='${enrollmentProvider}' AND consumed_at IS NOT NULL AND nonce_hash='${emailDigest(claims.email)}'`),'1');
 await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(pg('SELECT count(*) FROM clara_auth_users'),'2');assert.equal(await enrollmentReady(query),false);
 const before=calls;process.env.VERCEL_ENV='production';await assert.rejects(completeRecetteEnrollment(ticket,claims));assert.equal(calls,before);
});
