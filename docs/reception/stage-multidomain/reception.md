# Autorité Stage multimétier — réception isolée, non déployée

## Base vérifiée avant modification

OS Draft #205 : `e4b55fc400cfc74812a58c41c83fc0485f9a3e41`, base `integration/p0-stage-approval-ui` (#204, `cbb683d85e291415b4616aab6eb28eb7692c77a6`), dépendance #203. Live #328 : `0c8cc46e1d1de5409402a09e34bf028f4595c9bc`. Les PR amont restent Draft et inchangées. Branche OS dédiée `reception/stage-multidomain-authority` ; Live dédiée `reception/stage-multidomain-structure`.

La proposition #205 n'activait aucun droit. L'audit initial a confirmé : `stage-authority.ts` et les vrais handlers n'acceptaient que Light v1 ; migration027 vérifiait `can_mutate_light` ; le writer Live exigeait un run Light pour chaque mutation. La classification d'un projet en cinq métiers ne confère aucune autorité spatiale.

## Contrat effectivement implémenté

- v1 inchangé : `clara.stage-intent.v1` / `stage:light:mutate:v1` / `grantLight`.
- v2 distinct : `clara.stage-intent.v2`, capability exacte `stage:<light|sound|video|structure|production>:mutate:v2`, opération fermée `create`, `pose`, `support` ou `retire`.
- Migration028 additive : table de grants par workspace/projet/utilisateur/métier/opération, **vide par défaut**, aucune conversion des droits Light, d'abonnement ou de rôle en grant v2.
- `grantSpatial` explicite : acteur natif owner/admin, droits de gestion client ET projet, cible disposant des droits projet, d’une identité vérifiée et d’une appartenance workspace active. Un appel porte sur un seul métier et une seule opération. Pas de grant global.
- `approve` inspecte l'intention réelle auprès de Live, puis vérifie le grant en SQL. Le produit doit également posséder la capability exacte de l'intention avant toute redemption ; posséder Light v1 n'autorise jamais Sound v2.
- Même fonction SQL `clara_registry_stage_command`, même table de décisions, même nonce haché à usage unique, même expiration45s, sessions natives et liens révoquables. Le writer Mongo Live reste `CanonicalStageMutation.apply` avec CAS tête/historique/reçus ; aucun autre writer.
- Prévisualisation OS du métier/opération et du diff exact. Bouton distinct pour l'octroi de son propre droit si l'acteur peut administrer ; aucune permission automatique. L'approbation reste une seconde action.
- Désactiver un grant ou révoquer un accès parent exige d'abord la clôture des décisions v2 en attente, via le mécanisme de cancellation Live existant. Les triggers de révocation parent effacent ensuite les délégations ; restaurer l'accès parent ne les réactive pas.

## Limites fermées

Light crée ses implantations attestées par le v1 existant. La création générique Light v2, duplication globale, suppression d'instance projet, modification de mode/configuration seule et modification dimensionnelle d'un objet existant restent refusées. Les nouveaux objets des autres métiers proviennent d'une feuille sauvegardée et autorisée. Production est limitée aux annotations de coordination/contraintes. Un retrait spatial conserve patchs, programmes, feuilles, documents et historique ; les identifiants retirés ne sont pas réutilisés.

Les supports sont des relations spatiales ; aucune approbation structurelle, de levage, d'accrochage, de capacité ou de stabilité. La configuration ne peut pas être introduite artificiellement par une pose : Live refuse un rattachement de mode/run, d'équipement ou de type non autorisé. Une future opération de configuration devra lier le run/patch exact et une revue explicite des cues, sans faux déplacement.

## SQL et rôle d'exécution

Migration testée uniquement sur PostgreSQL jetable. Réapplication : décisions et audit conservés. Tables et nouvelles fonctions sans privilèges PUBLIC. L'approbation v2 est testée sous rôle non-superuser, sans BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION ni CREATE sur public ; insertion directe dans les grants et DDL refusés pour ce rôle approbateur.

Avant une éventuelle réception d'environnement : prévoir explicitement EXECUTE sur `clara_stage_permission(text,text,text,jsonb)` et les privilèges de table nécessaires au rôle applicatif selon ses opérations. L'administration des grants et la révocation parent nécessitent INSERT/UPDATE sur le store de grants ; ne pas donner ces droits au rôle approbateur limité utilisé par le test. Aucun rôle distant, secret ou fournisseur n'est modifié par cette PR. Aucun privilège n'est accordé à PUBLIC pour faciliter une recette.

## Vérifications exécutées

`CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/stage-approval-ui.test.ts src/tests/canonical-stage-routes.test.ts src/tests/canonical-stage-postgres.test.ts src/tests/canonical-stage-multidomain-postgres.test.ts src/tests/canonical-stage-multidomain-boundary.test.ts src/tests/canonical-registry-postgres.test.ts src/tests/voice-route-security.test.ts`

**9 PASS** : grants par métier, opération différente refusée, expiration, périmètre étranger, révocation/reprise, ACL restaurée sans réactivation, migration réappliquée, rôle limité, v1 et registre, origines et sécurité vocale. `tsc --noEmit` et ESLint ciblé : PASS. Logs joints.

La recette bilatérale Live utilise les vrais handlers OS/Live avec PostgreSQL/Mongo/stockage disque isolés et navigateur ; les preuves détaillées sont dans la PR Live dépendante, `docs/reception/stage-structure/`. Le transport Neon HTTP est adapté localement vers PostgreSQL réel : pas de certification du fournisseur distant. Aucun appel Google, connecteur, matériel ou show.

CI globale OS non revendiquée : les échecs Google historiques signalés sur la base sont hors périmètre, non modifiés ni masqués. CI ciblée de publication à relever dans la PR après le push stabilisé.

## Gouvernance et décision

AntiPreview exact de la branche ajouté avant publication. Draft uniquement ; aucun merge, Ready, migration distante ou déploiement. GO isolation limité aux opérations reçues par la recette bilatérale dépendante. NO-GO configuration/mode seul et suppression globale. NO-GO Production tant que migrations, rôle réel, capabilities produit, consentements et parcours fournisseur n'ont pas été reçus séparément.

## Annulation ergonomique reçue

La page native d'approbation offre maintenant une liste explicite, bornée au projet/utilisateur courant et au batch100 existant, des autorisations en attente. « Annuler cette autorisation » utilise `native/stage revoke` et la cancellation atomique Live existante ; aucun retrait de modèle ni retour arrière implicite. Une décision déjà committée reste non annulable. La recette navigateur Live clique cette commande, vérifie le refus de redemption et conserve les données. Aucun nouveau pouvoir serveur n'est introduit par cette interface. Le dernier passage bilatéral compte 3 tests PASS (Structure, premier Stage Sound sans Light, PDF unitaires), avec les 9 tests OS ciblés toujours PASS.
