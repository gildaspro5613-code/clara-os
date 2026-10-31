import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticatedWorkspaceResolver } from '../lib/auth/authenticated-workspace-session';

const token = 'a'.repeat(43);
const workspace = 'recette-workspace';

test('Recette attestation authorization: existing owner/admin management permission is required', async () => {
  for (const role of ['owner', 'admin', 'member', 'viewer'] as const) {
    let calls = 0;
    const query = (async () => {
      calls++;
      return calls === 1 ? [{ user_id: 'fixture-user' }] : [{ workspace_id: workspace, role }];
    }) as Parameters<typeof createAuthenticatedWorkspaceResolver>[0];
    const resolve = createAuthenticatedWorkspaceResolver(query);
    const result = await resolve(token, workspace, 'connections:manage');
    assert.equal(Boolean(result), role === 'owner' || role === 'admin');
    assert.equal(calls, 2);
  }
});

test('Recette attestation authorization: invalid or missing session does not reach SQL', async () => {
  let calls = 0;
  const query = (async () => { calls++; return []; }) as Parameters<typeof createAuthenticatedWorkspaceResolver>[0];
  const resolve = createAuthenticatedWorkspaceResolver(query);
  assert.equal(await resolve(undefined, workspace, 'connections:manage'), null);
  assert.equal(await resolve('invalid', workspace, 'connections:manage'), null);
  assert.equal(await resolve(token, 'default', 'connections:manage'), null);
  assert.equal(calls, 0);
});

test('Recette attestation authorization: expired/revoked session or missing membership is denied', async () => {
  for (const sessionExists of [false, true]) {
    let calls = 0;
    const query = (async () => {
      calls++;
      return calls === 1 ? (sessionExists ? [{user_id:'fixture-user'}] : []) : [];
    }) as Parameters<typeof createAuthenticatedWorkspaceResolver>[0];
    assert.equal(await createAuthenticatedWorkspaceResolver(query)(token, workspace, 'connections:manage'), null);
    assert.equal(calls, sessionExists ? 2 : 1);
  }
});
