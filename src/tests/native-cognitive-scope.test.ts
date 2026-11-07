import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNativeCognitiveScope, authenticatedNativeCognitiveScope } from '@/lib/native/cognitive-scope';

test('native cognitive scope uses explicit authorized selectors without inventing a mission', () => {
  const scope = formatNativeCognitiveScope({
    workspaceId: 'melodie-digital',
    clientId: 'melodie-digital-interne',
    projectId: 'clara-os-exploitation',
    sessionId: 'native:verified-one',
  });
  assert.match(scope, /Espace de travail : melodie-digital/);
  assert.match(scope, /Client interne ou autorisé : melodie-digital-interne/);
  assert.match(scope, /Projet canonique sélectionné : clara-os-exploitation/);
  assert.match(scope, /Fil sélectionné : native:verified-one/);
  assert.match(scope, /mission métier ne doit être déclarée active que si elle est effectivement présente/);
  assert.doesNotMatch(scope, /CLARA_CHAT|accueil \/ identification du contexte courant/);
});

test('native context never falls back to a different request or to global context', () => {
  assert.equal(authenticatedNativeCognitiveScope(), null);
  const other = formatNativeCognitiveScope({
    workspaceId: 'another-workspace',
    clientId: 'another-client',
    projectId: 'another-project',
    sessionId: 'native:verified-two',
  });
  assert.match(other, /another-project/);
  assert.doesNotMatch(other, /melodie-digital|clara-os-exploitation|native:verified-one/);
});
