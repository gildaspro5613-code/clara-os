# Validation des fondations canoniques — 2026-10-11

Toutes les validations ci-dessous ont été exécutées. Elles utilisent uniquement des DB, comptes et réponses synthétiques isolés. Aucun service de production ni matériel réel n'est annoncé comme validé.

| Vérification | Résultat |
|---|---|
| Migrations OS 001/002/008/009, PostgreSQL 17 Docker isolé | Application et répétition réussies ; pas de migration Neon réelle |
| Test PostgreSQL registre/consentements/tickets/archives | 1 scénario intégré réussi : plusieurs projets/client, autre client, autre utilisateur, identité non associée malgré ACL, double consentement, identité Live déjà associée, conflit de scope, révocation, tickets, archive en double et histoire conservée |
| Service OS archive/lecture | 1 scénario réussi : actif refusé, terminé archivé, scope falsifié refusé, panne refusée, droits révoqués refusés, histoire après réouverture conservée |
| Documents OS | 28 réussis, 1 test PostgreSQL historique ignoré sans son conteneur dédié ; la nouvelle persistance réelle PostgreSQL est testée séparément |
| TypeScript OS | `tsc --noEmit` réussi |
| ESLint ciblé OS | Aucun problème sur les modules/routes/composant/tests canoniques |
| Build OS optimisé Webpack | Réussi ; fichiers de polices Geist réels mis en cache local via le hook de test Next, sans changement de TLS ni des polices applicatives |
| Chromium Documents OS | 6 scénarios réussis : navigation/pagination, lecture/recommandation, erreurs PDF, création/upload, déplacement par noms, demandes tardives |
| Chromium archives OS | 1 scénario réussi : noms client/projet, actif non archivable, archive, histoire après réouverture, lien retiré après refus ; API synthétique, pas de Neon/Live réel |
| Live consentements/clôture/transport + contrat + callback | 40 réussis : 7 nouveaux tests sur Mongo réel isolé, limites/credentials existants, callback Unified Core et invariance des sources protégées |
| Non-régression backend Live, sélection 35 fichiers | 309 réussis, 9 échecs ; les 9 noms d'échec sont identiques à ceux reproduits sur le snapshot de départ `d2e9ede` (31 réussis, 9 échecs pour les trois fichiers concernés). Deux nouveaux tests supplémentaires passent dans la sélection ciblée finale |
| HTTP métier Live sur Uvicorn/Mongo isolés | 40 réussis, 20 échecs ; mêmes 20 noms reproduits sur Uvicorn du snapshot `d2e9ede` et autre DB isolée |
| Jest frontend Live, 27 suites | 26 suites / 170 tests réussis ; 1 suite / 1 test échoué, reproduit sur le snapshot de départ (6 réussis, 1 échec dans le fichier concerné) |
| Build frontend Live | `CI=true npm run build` réussi, sans changement de manifest ni de lockfile |
| Chromium Stage Model | UI optimisée : SVG 2D/zoom, canvas WebGL 3D réel, contrôles et plein écran/Escape 2D/3D réussis ; API de lecture synthétique, aucun appel externe |
| Chromium Sound/Video | 1 scénario réussi : données partagées, conflit de révision, rafraîchissement et export ; fixture HTTP locale et build réel |
| Retour arrière OS | Snapshot `00b6324` : 3 tests de route/format d'archive réussis, verrou conservé ; nouvelles tables/histoires non supprimées |
| Retour arrière Live | Factory sans autorité testée : endpoints verrouillés ; contrats et source Unified Core existants conservés |

## Échecs préexistants reproduits

Backend : six recherches/intakes de `test_library_routes`, un adapter `test_document_storage`, deux jobs `test_clara_jobs`. Liste exacte :

- `test_unified_search_resolves_prolyte_with_domain_and_preserves_evidence`
- `test_unified_search_all_is_heterogeneous_and_identity_is_not_fuzzy`
- `test_unified_search_collapses_legacy_row_missing_manufacturer_but_preserves_conflicts`
- `test_unified_equipment_pagination_reaches_rows_beyond_legacy_250_cap`
- `test_library_document_can_run_manufacturer_knowledge_intake`
- `test_prolyte_intake_calls_core_with_provenance_without_verification_promotion`
- `test_emergent_adapter_namespaces_and_accepts_canonical_path`
- `test_chat_finishes_before_document_job_then_persists_canonical_message`
- `test_ordinary_question_stays_sync_and_creates_no_job`

Frontend : `conversation pins its project when the originating project route unmounts` dans `ClaraWorkspace.test.jsx`. Les 20 échecs HTTP métier appartiennent aux mêmes tests DMX, qualification Sound/Production, capacité business et computations documentés précédemment ; les listes exactes ont été comparées et sont égales. Aucun de ces modules n'est modifié pour masquer ces échecs.

Les suites ne sont donc pas entièrement vertes. Les nouveautés ciblées passent ; les cas préexistants restent visibles. Aucun service externe, fichier Drive réel, DMX/hardware physique ou déploiement n'a été testé. Light et Production sont couvertes par leurs suites disponibles ; aucun nouveau parcours navigateur intégral de ces deux pages n'est annoncé. Auth existante et navigation ont une couverture de suites et de fixtures ; Google réel n'a pas été appelé.

## Reproduction

Les DB ne doivent jamais viser la production. PostgreSQL doit être un conteneur nommé exactement `clara-canonical-test-postgres`, avec l'utilisateur/base `postgres`, contenant 001/002/008/009. Mongo doit être accessible uniquement en loopback `mongodb://127.0.0.1:27039`; les nouveaux tests créent puis suppriment leurs propres DB `canonical_test_<uuid>`.

Depuis OS :

```sh
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/canonical-registry-postgres.test.ts src/tests/canonical-archive-service.test.ts
npm run test:documents
npx tsc --noEmit
npx eslint src/lib/canonical src/app/api/canonical src/app/api/core/canonical src/app/api/documents/live-archives src/components/documents/CanonicalArchivesPanel.tsx src/tests/canonical-*
DOCUMENTS_E2E_ORIGIN=http://127.0.0.1:3027 DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium node --test src/tests/documents-browser.e2e.mjs src/tests/canonical-archives-browser.e2e.mjs
```

Le serveur OS e2e optimisé est démarré avec le preload existant `src/tests/helpers/documents-browser-runtime.mjs` et l'URL de DB fictive qu'il exige. Le build utilise `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/clara-v2-font-responses.cjs NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack`, hook local référençant les fichiers `.woff2` réels de Geist ; aucun de ces chemins locaux n'est une configuration de production.

Depuis `Live/backend` (cwd obligatoire pour les imports existants) :

```sh
MONGO_URL=mongodb://127.0.0.1:27039 DB_NAME=canonical_test_suite /workspace/.venvs/clara-live/bin/python -m pytest -q tests/test_canonical_authority.py tests/test_live_archive_routes.py tests/test_unified_core_capability_routes.py
BUSINESS_WORKSPACE_BROWSER_E2E=1 MONGO_URL=mongodb://127.0.0.1:27039 DB_NAME=canonical_browser /workspace/.venvs/clara-live/bin/python -m pytest -q -n 0 tests/test_business_workspaces_browser.py
```

Les commandes des suites existantes et la sélection backend complète sont décrites dans le rapport Live antérieur `docs/live-archive-validation.md`. Les logs locaux sont dans `/tmp/canonical-*.log`. Les tests Jest utilisent le preload jsdom et les mappings CRA décrits dans ce même rapport, sans modification des dépendances versionnées.

## Gouvernance et blocage de publication

PR existantes : OS #171 et Live #294 confirmées en brouillon ; bases et branches d'origine intactes. Deux nouvelles branches locales dédiées contiennent les fondations. Les derniers commits des PR existantes ont un statut Vercel « Canceled by Ignored Build Step », mais la condition de ce réglage n'est pas dans les dépôts. Comme l'utilisateur interdit explicitement toute Preview et toute modification de configuration, les nouvelles branches/PR ne sont pas publiées sans confirmation que ces branches sont déjà couvertes par cette règle. Aucun déploiement/merge/configuration n'est réalisé pour contourner ce blocage.

La règle de développement a été reconfirmée par l’utilisateur. La vérification des paramètres Vercel est impossible avec les accès disponibles ; les branches restent locales conformément à sa réponse. Réglages exacts à contrôler : [canonical-registry-vercel-gate.md](canonical-registry-vercel-gate.md).
