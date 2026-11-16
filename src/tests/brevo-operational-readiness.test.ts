import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {brevoReadOAuthStatus,BREVO_ALLOWED_READ_SCOPES} from '@/lib/connectors/brevo/read-oauth-status';
test('Brevo direct OAuth read-only status never reports ready before all config exists',()=>{
 const base={BREVO_CLIENT_ID:'test',BREVO_CLIENT_SECRET:'not-a-real-secret',BREVO_REDIRECT_URI:'https://os.example.test/api/connections/brevo/callback'};
 assert.equal(brevoReadOAuthStatus({}).ready,false);
 assert.equal(brevoReadOAuthStatus({...base,BREVO_OAUTH_SCOPES:'contacts:read'}).ready,false);
 assert.equal(brevoReadOAuthStatus({...base,BREVO_OAUTH_SCOPES:BREVO_ALLOWED_READ_SCOPES.join(' ')}).ready,true);
 assert.equal(brevoReadOAuthStatus({...base,BREVO_OAUTH_SCOPES:BREVO_ALLOWED_READ_SCOPES.join(' ')+' campaigns.email:write'}).ready,false);
 assert.equal(brevoReadOAuthStatus({...base,BREVO_OAUTH_SCOPES:'contacts:read campaigns.email:read transactional.email:read contacts:write'}).ready,false);
 assert.equal(brevoReadOAuthStatus({...base,BREVO_CLIENT_SECRET:'',BREVO_OAUTH_SCOPES:BREVO_ALLOWED_READ_SCOPES.join(' ')}).ready,false);
 assert.deepEqual(brevoReadOAuthStatus({}).scopes,[]);
});

test('native Brevo key-status route is scoped, no provider call and no credential disclosure',async()=>{
 const route=readFileSync('src/app/api/native/brevo/status/route.ts','utf8');
 assert.match(route,/withNativeScope\(request,false/);
 assert.match(route,/context\.scope\.workspaceId!==CURRENT_WORKSPACE_ID/);
 assert.match(route,/apiKeyConfigured:configured/);
 assert.doesNotMatch(route,/readBrevoBounded\(|new BrevoClient\(|headers.*api-key/i);
 assert.match(route,/Cache-Control.*private, no-store/);
 const hub=readFileSync('src/components/connections/ConnectionsHub.tsx','utf8');
 assert.match(hub,/endpoint: "\/api\/native\/brevo\/status"/);
 assert.doesNotMatch(hub,/endpoint: "\/api\/connections\/brevo"/);
});
