import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const workflow = readFileSync(new URL('../workflows/clara-os-independent-recette.yml',import.meta.url),'utf8');
test('manual preflight verifies the approved delivery source, never a default branch', () => {
  const section=workflow.split('      - name: Checkout approved source')[1].split('      - name: Set up deployment controller')[0];
  assert.match(section,/ref: 4cb5f2e226eb118ba772a68671590fd7c8d1cd82/);
  assert.match(section,/test "\$\(git rev-parse HEAD\)" = "4cb5f2e226eb118ba772a68671590fd7c8d1cd82"/);
  assert.match(section,/persist-credentials: false/);
  assert.equal(execFileSync('git',['cat-file','-t','4cb5f2e226eb118ba772a68671590fd7c8d1cd82'],{encoding:'utf8'}).trim(),'commit');
});
test('preflight never activates the historical write controller or weakens its identity checks', () => {
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/default: true/);
  assert.match(workflow,/environment: clara-os-recette/);
  assert.match(workflow,/REST_WRITES_DISABLED/);
  assert.match(workflow,/Deploy only custom recette environment through official REST API\n        if: \$\{\{ false \}\}/);
  assert.match(workflow,/secrets\.VERCEL_RECETTE_TOKEN/);
  assert.doesNotMatch(workflow,/secrets\.VERCEL_TOKEN/);
});
