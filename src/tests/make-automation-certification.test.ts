import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const statusSql=readFileSync('docs/operations/make-clone-certified-status-20261114.sql','utf8');
const route=readFileSync('src/app/api/native/make/status/route.ts','utf8');
const card=readFileSync('src/components/automatisations/MakeAutomationCertification.tsx','utf8');
const page=readFileSync('src/app/automatisations/page.tsx','utf8');

test('status requires canonical identity and a database-held end-to-end witness',()=>{
 assert.match(statusSql,/clara_native_runtime_command\(digest,w,c,p,s,'read'/);
 assert.match(statusSql,/clara_make_runtime_scope\.native_make_read_certifications/);
 assert.match(statusSql,/provider_execution_id/);
 assert.match(statusSql,/evidence_sha256/);
 assert.match(statusSql,/cert\.catalog_revision=contract_revision/);
 assert.match(statusSql,/cert\.user_id=actor/);
 assert.match(statusSql,/cert\.workspace_id=w/);
 assert.match(statusSql,/REVOKE ALL ON FUNCTION .*native_make_readiness.*FROM PUBLIC/);
});
test('status HTTP route is read-only, canonical and fails closed',()=>{
 assert.match(route,/nativeSelectors\(request\)/);
 assert.match(route,/validateMakeCloneRuntime\(\)/);
 assert.match(route,/native_make_readiness/);
 assert.match(route,/data\.certified===true/);
 assert.doesNotMatch(route,/encrypted_payload|CLARA_MAKE_API_TOKEN|\.execute\(|method:\s*'POST'/);
});
test('Make card is client-bound to actual certification status, never a constant success',()=>{
 assert.match(page,/<MakeAutomationCertification locale=\{locale\}/);
 assert.match(card,/fetch\('\/api\/native\/make\/status'/);
 assert.match(card,/data\.certified!==true/);
 assert.match(card,/uncertified:'Non certifié'/);
 assert.match(card,/certified_inactive/);
 assert.match(card,/en:|es:|de:|it:/);
 assert.doesNotMatch(card,/\/api\/connections\/make\/verify|\/api\/connections\/make\/configure/);
});
