# Incident OS ↔ Live #276 — réception isolée

Date : 14 novembre 2026. Aucune donnée Production consultée ou modifiée par la recette.

**PASS du correctif de budget et des protections en isolation. NO-GO livraison/Production.**
Le fournisseur OpenAI réel n'a pas été appelé. La pertinence cognitive réelle reste non réceptionnée. Le build complet est bloqué localement par les polices Google ; il n'est pas déclaré PASS.

## Références vérifiées

- OS Production, branche `delivery/clara-os-v1-20261025` : `4b4821e3f760f500ea7e8d4df3a6ac7a9ca51a7d`, fusion #275. Même SHA dans la métadonnée du déploiement Vercel READY `dpl_7S76g5iA6hbABzwxvf4nBF8b2DS5`.
- Branche corrective unique : `fix/production-context-276`, basée sur ce commit ; PR Draft uniquement, base explicite sur la branche Production (le défaut GitHub est `main`).
- Live Production : `e4c7fe209db914dc7e65595f6c58ad0ed2659154`. Checkout local réutilisé : `0d96f88b6777ba52ad26317ca1270ea8ed700aab`, arbre Git identique `77e0767f464c1ef3bca74ce677aebc441d3ae53d`. Son application déjà compilée sert la recette. Aucun fichier applicatif Live modifié.
- Dimensions et erreurs de l'incident : données publiées dans [l'issue #276](https://github.com/gildaspro5613-code/clara-os/issues/276), pas un accès Neon/Vercel aux contenus privés du dossier.

## Diagnostic et reproduction avant correctif

La fixture [sanitized-event.json](sanitized-event.json) est **entièrement synthétique**, ajustée aux dimensions publiées ; elle ne prétend pas reconstituer mot pour mot le dossier confidentiel. Elle combine plusieurs métiers, des révisions, documents, états confirmés/à vérifier/manquants/périmés et un conflit montage/réglages.

| Mesure | Incident publié | Fixture |
|---|---:|---:|
| Requête sérialisée | 16 239 caractères | 16 239 |
| `businessContext` | 10 853 | 10 853 |
| Documents du contexte projet | 2 990 | 2 990 |
| Omissions | 40 / 3 627 caractères | 40 / 3 627 |

Sur la base #275 : sources OS 13 900 caractères, compression sans perte 12 913, refus `source_context_budget`, **0 appel fournisseur**. Preuve : [baseline.json](baseline.json). Les 29 tests Production de référence passent sur la base : [journal](logs/baseline-tests.log).

Causes démontrées :

1. La compression sans perte de #275 ne peut garantir une taille maximale pour des contenus distincts. Le seuil de 12 000 est conservé ; augmenter les tokens ne résout pas cette entrée.
2. Au-delà de 32 000 caractères, le lecteur générique pouvait écarter toute la préparation. Le compositeur perdait alors la matière métier avant de choisir les éléments pertinents.
3. PostgreSQL JSONB réordonne les clés : une consommation du budget par ordre d'insertion pouvait perdre identités, révisions ou planning. La recette HTTP/SQL a révélé ce défaut que la simple construction d'objet en mémoire ne couvrait pas.
4. Une sélection naïve par pertinence pouvait retenir une tâche sans son préalable. Le correctif protège maintenant les dépendances explicites connues.
5. `output_truncated` est un problème distinct, déjà refusé par la base. Son contrôle est conservé et testé même avec du JSON syntaxiquement complet.

## Trajet réel des données

| Étape | Code existant réutilisé | Présence / limite vérifiée |
|---|---|---|
| Sources Live, projet, préparation, documents | Live `backend/server.py` : `_build_production_advice_event`, `build_project_context` | Lectures propriétaires ; document associé, préparation et projet sélectionnés. Aucun accès global de repli |
| Projection métier Live | Live `backend/canonical_advice_context.py` : `build_business_context` | 18 000 octets, cible compacte 11 000 caractères ; budgets par section, lignes représentatives, révisions, statuts, `coverage` et `omissions`. Une omission ne prouve pas une absence en base |
| DTO et transport | Live `unified_core_contracts.py`, `clara_os_client.py`, `clara_conversation_jobs.py` | DTO natif, HTTP authentifié, identifiant durable et préparation conservés ; pièces jointes et références documentaires distinguées |
| Admission et durable OS | OS `external-event-handler.ts`, routes `external/event-jobs`, worker et store | Identité produit, scope, empreinte, refus de collision, commit atomique session/résultat PostgreSQL |
| Source Brain OS | OS `brain/live-project-context.ts` | Mêmes limites 24 000 de texte, 3 000 nœuds, profondeur 9, tableau 100, JSON 32 000. Priorité déterministe uniquement pour les gros contextes d'avis Live ; couverture et éventuelle projection conservatrice avant exclusion de la préparation |
| Sélection / compression | OS `brain/live-production-evidence.ts` | Compression existante d'abord. Puis retrait de **lignes/champs entiers**, indices d'origine et exclusions explicites. Aucune valeur technique, provenance ou révision d'une ligne retenue réécrite. Dépendances connues retenues avec la tâche |
| Brain | OS `brain/reasoning.ts` inchangé | Vraie fonction appelée dans la recette ; les horaires et l'équipe du conflit atteignent son prompt, même sur x16 et après JSONB |
| Composition | OS `brain/response-composer.ts` | Sources ≤ 12 000 ; cinq lots opérationnels concis, même modèle/profil 5 200 tokens, effort faible, aucune nouvelle boucle ni appel ajouté |
| Fournisseur | SDK existant, **substitué uniquement dans les tests** | Une réponse déterministe de test est produite seulement si les horaires et l'équipe figurent effectivement dans le prompt. Cela ne démontre pas une analyse OpenAI réelle |
| Affichage et acceptation Live | Live `productionProposal.js`, `ProductionWorksheet.jsx`, contexte conversation | Schéma v1 réel, scope/révision revérifiés. Cartes natives, acceptation dans le brouillon seulement, sauvegarde distincte, refus sûr si périmé ou non autorisé |

Sur x8/x16, les limites génériques peuvent encore omettre des sources. Elles sont annoncées ; le correctif ne prétend pas récupérer dans OS les données que Live n'a pas transmises. Si la sélection ou son reçu ne peut respecter les limites, le refus demeure, sans appel supplémentaire ni résultat fabriqué.

## Correctif et contrat de résultat

Contrat externe inchangé : **`clara.production.proposal.v1`**, `project_id`, `preparation_id`, `rows[].section/label/value/notes`. Aucun champ d'autorité, writer, schéma de stockage ou endpoint ajouté.

- Synthèse, actions, planning, coordination et arbitrages utilisent les sections existantes `constraints/tasks/timeline/coordination/decisions`.
- Les propositions concernées portent la mention localisée de dossier partiel dans leurs notes, y compris après acceptation d'une seule carte.
- Des lignes `constraints` déterministes portent la couverture : révision, SHA-256 des sources et de la sélection, indices retenus/exclus, nombres et états reçus, exclusions de champs, couverture/omissions amont et limites du lecteur/demande/synthèse. Ces reçus ne constituent pas des faits cognitifs ou des validations métier.
- Les reçus restent soumis aux limites v1 : 50 lignes, 25 000 caractères, notes ≤ 1 500. Ils ne réparent jamais une réponse malformée, vide, étrangère ou tronquée. Dépassement : refus, sans tronquer les notes du fournisseur.
- Aucun nouveau mécanisme de sauvegarde. L'utilisateur peut refuser les cartes ; seules les cartes acceptées vont dans le brouillon. Le writer et le CAS Live restent ceux de la Production existante.

Fichiers applicatifs OS modifiés uniquement :

1. `src/lib/brain/live-production-evidence.ts` : sélection bornée et reçus de couverture.
2. `src/lib/brain/live-project-context.ts` : priorité des gros contextes et conservation bornée avant la limite générique.
3. `src/lib/brain/response-composer.ts` : réutilisation de cette projection, scope et validation du résultat.

Tests : `production-context-276.test.ts`, `helpers/production-276-fixture.ts`, `helpers/production-276-reception.ts`, `production_context_276_reception.py` ; extensions opt-in des deux harness HTTP existants ; assertion PostgreSQL #275 adaptée à la couverture explicite sans diminuer la vérification des données et de la persistance.

Le workflow `production-p0-validation.yml` inclut les régressions dans son job existant, sans ajouter de job. `vercel.json` exclut uniquement la branche corrective. Aucun autre composant métier modifié.

## Résultats quantifiés

Mesures finales [matrix.json](matrix.json), avant le fournisseur simulé :

| Dossier | Requête | Compression intégrale du snapshot OS | Sélection fournie | Résultat structurel | Appels de composition |
|---|---:|---:|---:|---|---:|
| Dimension incident | 16 239 | 12 913 | 11 507 | PASS, partiel explicite | 1 |
| x2 | 21 440 | 17 654 | 11 753 | PASS, partiel explicite | 1 |
| x4 | 30 972 | 25 874 | 11 980 | PASS, partiel explicite | 1 |
| x8 | 50 036 | 29 969 | 11 375 | PASS, lecteur partiel explicite | 1 |
| x16 | 88 213 | 31 426 | 11 926 | PASS, lecteur partiel explicite | 1 |

Les snapshots OS des grandes tailles sont déjà bornés par le lecteur. La colonne compression ne représente donc pas la totalité de la requête d'origine. Les plafonds de sécurité n'ont pas été augmentés.

| Contrôle réellement exécuté | Résultat | Preuve |
|---|---|---|
| 7 suites OS ciblées, dont nouveaux cas #276 et PostgreSQL réel | **79 PASS, 0 FAIL, 0 SKIP** | [os-targeted.log](logs/os-targeted.log) |
| 3 suites consommatrices Live : handoff Production, conseil durable et contexte projet | **46 PASS** | [live-consumers.log](logs/live-consumers.log) |
| Deux scénarios HTTP/SQL et navigateur natifs | **2 PASS** | [journal](logs/http-live.log), [JUnit](proofs/http-live-junit.xml) |
| TypeScript `tsc --noEmit --incremental false` | **PASS** | [journal vide, exit 0](logs/typecheck.log) |
| ESLint ciblé aux fichiers applicatifs/tests concernés | **PASS** | [journal vide, exit 0](logs/eslint.log) |
| Syntaxe Python, YAML, exclusions de branche et `git diff --check` | **PASS** | Vérifications locales, aucun déclenchement Actions |
| `npm run build` / Turbopack | **NON VALIDÉ** : processus tué, exit 137, limite mémoire observée | [journal](logs/build-turbopack.log) |
| `next build --webpack` dans le sandbox | **NON VALIDÉ** : sous-processus TypeScript refusé (`spawnSync EPERM`, sortie vide) | [journal](logs/build-webpack-sandbox.log) |
| `next build --webpack` avec exécution locale autorisée | **BLOCKED** : téléchargement des polices Geist / Geist Mono par `next/font` impossible | [journal](logs/build-webpack-fonts.log) |
| Fournisseur cognitif réel, Production, matériel | **NON EXÉCUTÉS** | Pas d'autorisation ni d'appel |

Les entrées de build `src/app/layout.tsx`, `next.config.ts`, `package.json` et le lockfile sont identiques à la base. Aucun remplacement de police ni contournement réseau ajouté. Ces échecs de build ne sont pas présentés comme un succès ni comme une régression applicative prouvée.

## Preuves HTTP, stockage et validations

[http-postgres.json](proofs/http-postgres.json) : cinq tailles traitées par les vraies routes OS, lecteur, raisonnement et compositeur ; exactement un raisonnement et une composition par job. État/résultat/session réellement stockés dans PostgreSQL 17.11. Rejeu identique sans cognition supplémentaire ; contenu différent avec même job → **409**, produit non éligible → **403**, portée étrangère → **404**, préparation incohérente → **400**. Après redémarrage du serveur HTTP OS, le reçu reste consultable sans nouvelle exécution.

Trois sorties négatives : fournisseur `incomplete/max_output_tokens` malgré JSON complet, JSON coupé, autre projet. Toutes terminent `failed`, résultat SQL nul, conversation assainie sans fragment exploitable ; aucun retry automatique. Les anciens tests couvrent aussi le propriétaire atomique, les commits session/job et la protection contre une écriture tardive.

[live-reception.json](proofs/live-reception.json) : vrai client Live vers le serveur OS local, JWT, MongoDB natif jetable, stockage disque et Chromium `/usr/bin/chromium`, application Live compilée. Import TXT réel, données enregistrées, conflit plateau 09–12 / 11–13 ; réception sans écriture métier ; acceptation sans écriture ; sauvegarde explicite **R1 → R2** ; réouverture HTTP ; échec fournisseur visible sans carte partielle ; aucun nouvel envoi automatique ; droit retiré pendant la revue → **403**, aucune intégration ; modification concurrente **R3** conservée et acceptation périmée refusée ; nouvelle session navigateur restituant R3 et les octets du document d'origine. La consultation ne crée ni Stage ni run Light.

Substitutions déclarées : fournisseur cognitif, identifiants de test et dispatch du runtime Core dans le harness OS existant. Le dispatch appelle les vraies fonctions de source et de raisonnement ; il n'exécute aucune mission. Les routes, contrôles, worker, projection/composition et transactions PostgreSQL sont les modules applicatifs réels. Les anciennes suites P0 vérifient séparément les barrières du runtime d'avis et l'isolation des sessions.

PostgreSQL est lancé sans réseau et sans volume persistant, sur tmpfs ; MongoDB est natif, limité à loopback et à une base de test. La reprise démontrée concerne le processus HTTP OS et une nouvelle session navigateur, pas une certification de restauration PostgreSQL ou un essai matériel.

### Captures réelles

- [Cartes Production desktop](proofs/live-proposals-desktop.png).
- [Cartes et couverture mobile 390 px](proofs/live-proposals-mobile.png).
- [Sauvegarde explicite et rechargement](proofs/live-explicit-save-reopened.png).
- [Réponse incomplète refusée, brouillon conservé](proofs/live-incomplete-refused.png).
- [Droit retiré : refus](proofs/live-revoked-access-refused.png).
- [Proposition périmée : refus](proofs/live-stale-preview-refused.png).
- [Nouvelle session navigateur](proofs/live-fresh-session-reopened.png).

## Rejouer localement, sans fournisseur payant

Suites OS : commande du job `production-p0-validation.yml`, avec `DOCUMENT_OPERATION_TEST_CONTAINER` pointant uniquement vers un conteneur local nommé `clara-document-registry-test-…`. Appliquer dans cette base jetable la migration existante 007 et la table de sessions existante ; aucune migration nouvelle. La recette HTTP exige le même adaptateur SQL verrouillé sur Docker local.

Recette optionnelle OS ↔ Live :

```sh
ISSUE_276_RECEPTION=1 \
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-276 \
CLARA_LIVE_RECEPTION_ROOT=/chemin/checkout-live-verifie \
ROADBOOK_TEST_MONGOD=/chemin/mongod-local \
PYTHONDONTWRITEBYTECODE=1 TMPDIR=/chemin/temporaire-local \
python -m pytest -q -s src/tests/production_context_276_reception.py \
  --basetemp=/chemin/fixture-jetable \
  --junitxml=docs/reception/issue-276/proofs/http-live-junit.xml
```

Prérequis : dépendances Python de tests Live, frontend déjà compilé correspondant au checkout, Chromium et binaire MongoDB local. Le test n'installe rien dans le cloud et ne remplace pas ces prérequis par de fausses données de succès.

## Gouvernance et décision

- Exclusion AntiPreview explicite de `fix/production-context-276`, avant toute publication ; production Vercel vérifiée par métadonnées, [preuve initiale](antipreview-before.json).
- Commit `[skip ci]` : aucune campagne Actions payante autorisée ou déclenchée ; aucun dispatch, relance, Ready, merge ou déploiement demandé.
- Uniquement une PR Draft OS. Pas de PR/modification Live, ni migration, Stage Model, cockpit, Connector Core, autorité ou données réelles.
- **GO isolation** pour le correctif de contexte sur les dimensions reproduites et les cinq tailles, avec les refus sûrs démontrés.
- **NO-GO livraison/Production** : build complet non reçu dans cet environnement ; fournisseur réel non appelé, qualité cognitive réelle non certifiée. Les très gros dossiers restent partiels et les contextes irréductibles continuent d'être refusés. Une réception réelle exige une autorisation distincte, sans répétitions payantes automatiques.
