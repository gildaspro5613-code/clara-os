# PR #221 — assertion Native Authority

Base : `f623e43f644410710d0c2df9ee956626481210d6`. Même branche, même PR. Aucun changement applicatif, graphique, d'ACL, de migration, de connecteur ou de workflow.

## Reproduction et cause

`native-runtime-postgres.test.ts:40` échoue exactement sur `sources.every(s => !s.available && s.data === null)`. La nouvelle source `native-missions` est disponible et contient la mission de l'acteur A dans W/C1/P1 ; les fournisseurs externes non certifiés restent indisponibles.

Une simple exemption de cette source révélait un second problème de montage du test : il consultait le registre avant le commit de la mission créée par la fixture. La revérification rejetait correctement cette lecture non encore persistée (`NATIVE_MISSION_CONTEXT_CHANGED`). La création est maintenant finalisée avant de tester la consultation, en contexte de lecture seule. Aucun garde n'est désactivé ni modifié.

## Assertion renforcée

- Une seule source disponible : `native-missions` ; données et scope exacts, mission sélectionnée, compteur et indicateur de liste complète vérifiés.
- Tous les autres fournisseurs restent indisponibles, avec `data === null`.
- Pour l'autre propriétaire, le deuxième projet et le deuxième client : registre natif autorisé mais vide, aucune donnée privée de A/P1.
- Aucun historique non rattaché exposé ; mémoire globale toujours absente.
- Accès révoqué : refus 403 avant construction des sources.
- Contrôles préexistants de persistance, concurrence, CAS, historiques et révocation conservés.

## Résultats

**52 tests PASS, 0 FAIL, 0 SKIP**, sur PostgreSQL jetable. Inclus : test CI reproduit, autorités PostgreSQL, conversations durables, consultation native, révocation intercalée et les deux ordres réellement concurrents de finalisation/révocation. TypeScript et lint ciblé : PASS. Aucun fournisseur réel contacté. Build et recette navigateur du correctif f623 restent des preuves antérieures : aucun code applicatif ne change ici, ils ne sont pas recomptés comme nouvelles exécutions.

Le workflow existant est déclenché par `pull_request` et couvre `src/tests/native-runtime*` ; il n'a pas de `workflow_dispatch`. La publication sur la branche de #221 doit donc provoquer la validation du nouveau SHA via la synchronisation de PR, sans modifier le workflow ni relancer l'ancien SHA. Les lectures GitHub disponibles ont répondu `Forbidden` ; le statut distant sera communiqué sans inférer du vert à partir des résultats locaux.

**GO technique local. La CI verte distante reste à constater avant toute étape suivante. Aucun merge ni déploiement.**
