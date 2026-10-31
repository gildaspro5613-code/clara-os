import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {readAccountProfile} from '@/lib/auth/account-profile';
import {verifiedGoogleDisplayCookie} from '@/lib/auth/google-display-name';
import {googleProofHash} from '@/lib/native/google-authority';
import type {sql} from '@/lib/core/store/database';

test('account display: actual canonical PostgreSQL sessions, member rights, exact Google association, revoked/expired contexts and secret-free failures',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,'clara-canonical-test-postgres');
 const db='native_browser_'+randomUUID().replaceAll('-','');execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec','clara-canonical-test-postgres','dropdb','-U','postgres',db]));
 const pg=(q:string)=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',stdio:'pipe'}).trim();
 let reads=0;const query:typeof sql=async(strings,...values)=>{
  reads++;const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');assert.match(statement,/^\s*SELECT /,'Account display never writes');
  return pg(`SELECT row_to_json(r) FROM (${statement})r`).split('\n').filter(Boolean).map(line=>JSON.parse(line));
 };
 const old=process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');t.after(()=>{if(old===undefined)delete process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;else process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=old;});
 const display=verifiedGoogleDisplayCookie('A'.repeat(43),'Gildas',true);
 const cookie='clara_auth_session='+'A'.repeat(43)+'; '+display.name+'='+display.value;
 const selected=(workspaceId='w')=>'clara_native_selection='+encodeURIComponent(JSON.stringify({workspaceId,clientId:'c1',projectId:'p1',sessionId:'native:display-only'}));
 for(const value of [null,'clara_auth_session=invalid','clara_auth_session='+'A'.repeat(43)+'; clara_auth_session='+'B'.repeat(43)])assert.deepEqual(await readAccountProfile(value,query),{state:'signed-out'});
 assert.equal(reads,0);
 assert.deepEqual(await readAccountProfile(cookie,query),{state:'authenticated',displayName:'Gildas',googleIdentityLinked:true});
 assert.deepEqual(await readAccountProfile(cookie+'; '+selected(),query),{state:'authenticated',displayName:'Gildas',googleIdentityLinked:true},'A native business session is not required to display the account');
 assert.deepEqual(await readAccountProfile(cookie.replace('A'.repeat(43),'B'.repeat(43)),query),{state:'authenticated',displayName:null,googleIdentityLinked:true},'A member can read their own account but never another session name');
 pg("INSERT INTO clara_auth_users(id) VALUES('c');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','c','c');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('c','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('"+googleProofHash('F'.repeat(43))+"','c',NOW()+INTERVAL '1 hour')");
 assert.deepEqual(await readAccountProfile('clara_auth_session='+'F'.repeat(43),query),{state:'authenticated',displayName:null,googleIdentityLinked:false});
 assert.deepEqual(await readAccountProfile('clara_auth_session='+'D'.repeat(43),query),{state:'signed-out'});
 assert.deepEqual(await readAccountProfile(cookie+'; '+selected('foreign-workspace'),query),{state:'unverified'});
 assert.deepEqual(await readAccountProfile(cookie+'; '+selected()+'; '+selected(),query),{state:'unverified'});
 assert.deepEqual(await readAccountProfile(cookie+'; clara_native_selection=forged',query),{state:'unverified'});
 pg("INSERT INTO clara_auth_workspaces(id) VALUES('second');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','second','member')");
 assert.deepEqual(await readAccountProfile(cookie,query),{state:'unverified'},'No silent workspace choice for multiple memberships');
 assert.deepEqual(await readAccountProfile(cookie+'; '+selected(),query),{state:'authenticated',displayName:'Gildas',googleIdentityLinked:true});
 pg("UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='a' AND workspace_id='w'");
 assert.deepEqual(await readAccountProfile(cookie+'; '+selected(),query),{state:'unverified'});
 pg("UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE token_hash='"+googleProofHash('A'.repeat(43))+"'");
 assert.deepEqual(await readAccountProfile(cookie,query),{state:'signed-out'});
 const unavailable=await readAccountProfile(cookie,async()=>{throw Error('PRIVATE_SQL_TOKEN_MUST_NOT_LEAK');});assert.deepEqual(unavailable,{state:'unavailable'});
 assert.ok(!JSON.stringify(unavailable).includes('PRIVATE_'));
});

test('only approved account and search slots change; other header elements and locale control are preserved',()=>{
 const before=execFileSync('git',['show','fba152a6d232b7d079d523a3afbfdedf3965160b:src/components/layout/Header.tsx'],{encoding:'utf8'}),after=readFileSync('src/components/layout/Header.tsx','utf8');
 const normalizeSearch=(s:string)=>s.replace(/      <div className="mx-5[\s\S]*?(?=\n\n      <div className="flex shrink-0)/,'      <HeaderSearch />');
 const beforeJSX=normalizeSearch(before.slice(before.indexOf('  return ('))).replace(/        <div\n          aria-label=\{tc\("profile"\)\}[\s\S]*?        <\/div>/,'        <UserAccountMenu />');
 assert.equal(after.slice(after.indexOf('  return (')),beforeJSX,'No change outside the approved account and search slots');
 const menu=readFileSync('src/components/layout/UserAccountMenu.tsx','utf8');assert.ok(menu.includes('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white'));assert.ok(menu.includes('<UserRound size={19}'));
 for(const locale of ['fr','en','es','de','it']){
  const messages=JSON.parse(readFileSync('src/i18n/messages/'+locale+'/index.json','utf8'));assert.equal(Object.keys(messages.account).length,20);
  for(const value of Object.values(messages.account))assert.ok(typeof value==='string'&&value.trim());
 }
});
