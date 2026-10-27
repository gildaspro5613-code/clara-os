# Validation — récupération opérationnelle

Base applicative : 4ac86b9760f88477cfe5d5fcb89f64a8e139c502. Les résultats concernent le diff de cette PR ; le commit de clôture est identifié par la PR et l'historique, pas par une empreinte auto-référente dans son propre fichier.

## Commandes reproductibles

```sh
node --import tsx --test src/tests/operational-recovery.test.ts
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/operational-recovery-postgres.test.ts
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test --test-concurrency=1 src/tests/native-runtime-postgres.test.ts src/tests/native-mission-contact-postgres.test.ts src/tests/native-conversation-postgres.test.ts src/tests/native-mail-postgres.test.ts src/tests/native-google-work-postgres.test.ts src/tests/native-document-continuity-postgres.test.ts src/tests/recette-external-execution-guard.test.ts src/tests/native-cognitive-scope.test.ts
npx tsc --noEmit
npm run build
```

Préconditions SQL : conteneur PostgreSQL local déjà décrit dans la validation native existante ; bases aléatoires préfixées native_browser_, supprimées après les tests. Aucun endpoint Neon. L'application des migrations inclut 030 uniquement dans la fixture locale. Le transport Neon HTTP est remplacé par un adaptateur PostgreSQL de test ; ce n'est pas une certification Neon HTTP ni une mesure de permissions Production.

Lint ciblé : les fichiers TypeScript/TSX/MJS modifiés et les nouveaux tests ; aucune exclusion ajoutée au lint global. Build optimisé local avec réponses de polices synthétiques du harnais historique, aucun TLS désactivé ; dépendances identiques au lock du candidat. L'usage initial d'un lien node_modules hors checkout a été refusé par Turbopack ; les dépendances ont été recopiées dans le checkout isolé avant le build, sans modification du lock.

## Recette navigateur locale
Réutiliser le démarrage Next, le proxy HTTPS local épinglé et native-runtime-browser-preload.mjs décrits dans .github/workflows/native-authority-validation.yml, avec une base fixture neuve contenant 030. Le preload exige l'URL PostgreSQL factice et la clé OpenAI synthétique exactes ; les fournisseurs sont interceptés. Le navigateur bloque les origines externes. Aucun cookie Production.

```sh
DOCUMENTS_E2E_ORIGIN=https://127.0.0.1:3060 DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium node --test src/tests/operational-recovery-browser.e2e.mjs
# Arrêter effectivement le processus Next, le relancer sur le même PostgreSQL,
# conserver les seuls cookies synthétiques enregistrés localement, puis :
RECOVERY_BROWSER_RESUME=1 DOCUMENTS_E2E_ORIGIN=https://127.0.0.1:3060 DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium node --test src/tests/operational-recovery-browser.e2e.mjs
```

La première passe vérifie deux consultations, la conversation durable sans mission, le code Drive affiché, une création explicite via le contrôle existant, une consultation sans modification de la mission puis le refresh. La seconde passe utilise un nouveau navigateur après un arrêt/redémarrage applicatif réel : elle relit le fil de consultation initial sans mission et son historique. Les cookies synthétiques restent dans /tmp, jamais dans Git.

## Limites et tentatives de qualification
Les premières tentatives ont reproduit la dépendance SQL des fils sans mission. Les tests ont aussi détecté une logique SQL NULL non fermée, corrigée par COALESCE(...,false). Les tentatives intermédiaires ne sont pas additionnées aux tests finaux. Des erreurs de fixture ont été corrigées : snapshot d'historique non réattesté, sélection avant commit du binding calendrier et test de révocation sans commit à déclencher. Les assertions de refus, CAS et préservation sont conservées. La première recette navigateur a démontré que le useEffect de chargement initial Documents masquait encore le code d'erreur, indépendamment de la recherche manuelle ; ce second chemin a été corrigé et l'assertion navigateur est conservée.

La première préparation navigateur a été arrêtée après qu'une reconstruction locale concurrente eut supprimé le build en cours d'utilisation ; la réception finale est séquencée après la fin du build. Aucun retry applicatif, fournisseur ou modification de timeout n'a été introduit pour masquer un échec.

Les résultats finaux et logs sont conservés dans evidence/. Une réussite isolée n'atteste ni la configuration Production, ni le défaut Drive réel, ni la qualité sémantique d'un fournisseur réel. Aucun appel IONOS, Google, OpenAI, Twilio, ElevenLabs, Make/Brevo ou Live réel effectué.

## Résultats finaux exécutés

| Contrôle | Résultat | Preuve |
|---|---|---|
| Nouveaux contrôles, handlers et PostgreSQL | 15 PASS, 0 FAIL, 0 skip | evidence/targeted.log |
| Non-régression native, documents, Google, IONOS, contacts, conversations et gardes Recette | 62 PASS, 0 FAIL, 0 skip | evidence/non-regression.log |
| P0 et continuité commerciale | 18 PASS, 0 FAIL, 0 skip | evidence/production-p0-local.log |
| Navigateur sur build optimisé, puis nouveau navigateur après arrêt/redémarrage Next | 2 PASS, 0 FAIL, 0 skip | evidence/browser-and-restart.log |
| TypeScript | PASS, exit 0 | evidence/typescript.log et build.log |
| Lint ciblé des fichiers modifiés | PASS, exit 0 | evidence/lint-targeted.log |
| Build optimisé Next.js 16.4.3 | PASS, exit 0 | evidence/build.log |
| git diff --check et scan de motifs de credentials nouveaux | PASS | contrôle avant commit ; aucune fixture réelle ni secret |

Les erreurs SQL NATIVE_SCOPE_DENIED / NATIVE_NEW_SESSION_REQUIRED et conflits CAS imprimés dans non-regression.log sont les refus attendus des tests négatifs réussis. Les tentatives intermédiaires restent locales ; les résultats finaux ci-dessus ne les effacent pas et ne les additionnent pas.

**GO technique isolé pour revue de la PR. NO-GO pour merge/déploiement/réception Production sans autorisation distincte**, cible SQL attestée, sauvegarde propre et application approuvée de 030. Les contrôles GitHub de la PR sont à consulter sur son SHA final ; aucun résultat CI futur n'est présumé ici.

Normalisation documentaire finale : seuls les retours chariot/espaces de progression du journal de build ont été normalisés après la campagne ; aucun résultat ni message de test modifié. git diff --check est rejoué sur le diff complet avant publication.

## Correction ciblée des deux échecs CI — PR #214

Référence avant correction : de21095ac0bf4aa975bbbb8d276e2b7e09d29a7e. Run natif 40465494188, job 122059756743. Les logs complets sont refusés par le point de téléchargement GitHub ; les annotations officielles du check et la reproduction locale retrouvent exactement les deux assertions. Les quatre autres recettes du groupe CI étaient déjà réussies.

| Recette | Cause reproduite | Correction limitée au test |
|---|---|---|
| native-commercial-browser.e2e.mjs:34 | Le marqueur de dialogue était retrouvé dans le Cockpit parce qu'une consultation renommait implicitement la mission. Le Cockpit compact présente intentionnellement un lien d'historique, pas le corps des messages. | Vérifier la mission intégralement inchangée, son titre explicite dans le Cockpit, puis ouvrir le lien réel vers l'historique et vérifier le message persisté. Le brouillon, son CAS, le refus d'envoi, les permissions, la révocation et la reprise restent testés. |
| native-runtime-browser.e2e.mjs:29 | Le test attendait qu'un message informatif crée un plan et une tâche manuelle. L'absence de tâche est le nouveau comportement correct. | Vérifier la mission inchangée après consultation, demander explicitement la planification dans la même autorité, vérifier l'identité canonique conservée, puis tester le basculement durable des tâches manuelles comme précédemment. Tous les refus étrangers sont conservés. |

Aucun code applicatif, migration, mock fournisseur, timeout, retry, garde, permission ou paramètre de déploiement changé. Les données restent synthétiques, les stores PostgreSQL réels et jetables, les fournisseurs simulés. Les assertions obsolètes sont remplacées par des assertions plus directes sur les contrats reçus ; aucune assertion de sécurité n'est retirée. Les campagnes déjà reçues ne sont pas réexécutées localement sans nécessité ; le workflow natif existant qualifie le diff complet sur le nouveau SHA.

Résultats de cette correction : reproduction avant modification **0/2 PASS**, avec les deux mêmes échecs qu'en CI ; après correction **2/2 recettes concernées PASS** ; non-régression consultation/commande et arrêt/redémarrage **2/2 PASS** ; tests ciblés **3/3 PASS** ; lint des deux fichiers modifiés et diff check **PASS**. Preuves ci214-*.log et annotations officielles dans evidence/. Aucun rebuild nécessaire pour ce diff strictement tests/documentation : l'application testée est celle de de21095. La CI existante sera évaluée sur le nouveau SHA publié, sans présumer son résultat ni relancer de workflow de déploiement.
