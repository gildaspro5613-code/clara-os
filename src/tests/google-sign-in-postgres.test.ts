import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {moduleFrom} from './helpers/production-p0-harness';
import {sessionTokenDigest,createAuthenticatedWorkspaceResolver} from '../lib/auth/authenticated-workspace-session';

test('canonical sign-in SQL: durable sessions, workspace membership, expiry, revocation and atomic nonce replay',
 {skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='auth_'+randomUUID().replaceAll('-','');
 execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 for(const migration of ['001_authenticated_workspaces','002_verified_auth_identities','003_auth_sign_in_transactions']){
  execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+migration+'.sql'),stdio:'pipe'});
 }
 const pg=(statement:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',statement],{encoding:'utf8',stdio:'pipe'});
 const query=(async(strings:TemplateStringsArray,...values:unknown[])=>{
  const statement=strings.reduce((text,part,i)=>text+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  if(/^\s*(SELECT|UPDATE)/.test(statement)&&(/\bSELECT\b/.test(statement)||/RETURNING/.test(statement))){
   // UPDATE RETURNING must stay one atomic statement, not a SELECT wrapper.
   const command=/^\s*UPDATE/.test(statement)?`WITH result AS (${statement}) SELECT row_to_json(result) FROM result`:`SELECT row_to_json(result) FROM (${statement}) result`;
   return pg(command).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  }
  pg(statement);return [];
 }) as typeof import('../lib/core/store/database').sql;
 const database={'@/lib/core/store/database':{sql:query}};
 const identities=moduleFrom('src/lib/auth/verified-identity.ts',database) as unknown as typeof import('../lib/auth/verified-identity');
 const lifecycle=moduleFrom('src/lib/auth/authenticated-session-lifecycle.ts',{...database,'./authenticated-workspace-session':{CLARA_AUTH_COOKIE:'clara_auth_session',sessionTokenDigest}}) as unknown as typeof import('../lib/auth/authenticated-session-lifecycle');
 const signin=moduleFrom('src/lib/auth/verified-sign-in.ts',{'./verified-identity':identities,'./authenticated-session-lifecycle':lifecycle}) as unknown as typeof import('../lib/auth/verified-sign-in');
 const transactions=moduleFrom('src/lib/auth/sign-in-transaction.ts',database) as unknown as typeof import('../lib/auth/sign-in-transaction');
 pg("INSERT INTO clara_auth_users(id) VALUES('a'),('b'); INSERT INTO clara_auth_workspaces(id) VALUES('wa'),('wb'); INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','wa','member'),('b','wb','viewer'); INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('https://accounts.google.com','a','a'),('https://accounts.google.com','b','b')");
 const identity={issuer:'https://accounts.google.com',subject:'a'};
 await assert.rejects(signin.completeVerifiedSignIn({...identity,subject:'unknown'}),/IDENTITY_NOT_ENROLLED/);
 const token=await signin.completeVerifiedSignIn(identity),resolve=createAuthenticatedWorkspaceResolver(query);
 assert.deepEqual(await resolve(token,'wa','connections:read'),{userId:'a',workspaceId:'wa'});
 assert.equal(await resolve(token,'wb','connections:read'),null);
 const state=await transactions.beginSignInTransaction('google');
 assert.equal(await transactions.consumeSignInTransaction('google',state.state,'x'.repeat(43)),false);
 assert.deepEqual(await Promise.all([transactions.consumeSignInTransaction('google',state.state,state.nonce),transactions.consumeSignInTransaction('google',state.state,state.nonce)]),[true,false]);
 // Fresh module instances resume the same durable records; no process-memory authority.
 const restarted=moduleFrom('src/lib/auth/sign-in-transaction.ts',database) as unknown as typeof transactions;
 assert.equal(await restarted.consumeSignInTransaction('google',state.state,state.nonce),false);
 assert.ok(await createAuthenticatedWorkspaceResolver(query)(token,'wa','connections:read'));
 await lifecycle.revokeAuthenticatedSession(token);assert.equal(await resolve(token,'wa','connections:read'),null);
 const expired=await signin.completeVerifiedSignIn(identity);
 pg(`UPDATE clara_auth_sessions SET created_at=NOW()-INTERVAL '2 hours',expires_at=NOW()-INTERVAL '1 hour' WHERE token_hash='${sessionTokenDigest(expired)}'`);
 assert.equal(await resolve(expired,'wa','connections:read'),null);
 pg("UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='a'");
 await assert.rejects(signin.completeVerifiedSignIn(identity),/ACTIVE_WORKSPACE_MEMBERSHIP_REQUIRED/);
 assert.equal(pg('SELECT count(*) FROM clara_auth_users').trim(),'2');
});
