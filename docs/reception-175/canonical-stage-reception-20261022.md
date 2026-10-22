# Réception du contrat spatial canonique — Clara OS

Branche `fix/canonical-stage-authority-20261022`, base vérifiée #202 `01e3d253ea435d99462e5f80ba68c9c5e0582986`, conservant #199/#176 et les correctifs 624fc09/b2a3959. Branche Live couplée `fix/canonical-stage-mutation-20261022`, base #316 `c027db8a4f2dbb8496a5a8f1e939c6f300e74b76`. Les PR et branches de référence restent intactes. Aucun merge/déploiement/fournisseur réel.

Contrat : [canonical-stage-mutation-v1.md](canonical-stage-mutation-v1.md). Matrice : [matrix.csv](canonical-stage-proof/matrix.csv). Sources testées : [tested-source-sha256.json](canonical-stage-proof/tested-source-sha256.json). Les preuves bilatérales, PDF et captures sont versionnées côté Live dans docs/reception/canonical-stage-proof/. Les logs OS ciblés sont versionnés côté OS dans docs/reception-175/canonical-stage-proof/.

## Cause racine et choix

Le chemin existant sait lire/exporter un Stage et préparer un patch, mais ne porte aucune capacité autorisant une mutation spatiale initiale/révisée. Le callback MVR refuse justement `MVR_APPLICATION_REQUIRES_VERSIONED_CORE_DECISION`. Réutiliser read/archive aurait confondu les autorités. L’extension `stage:light:mutate:v1` conserve les calculs/adaptateurs Live et ajoute une décision à usage unique dans le registre canonique OS existant, sans deuxième moteur.

## Réception exécutée en isolation

- 353 tests backend Live réussis + 1 SKIP fabricant maintenu, dédupliqués par classe/nom ; les 337 cas historiques ont tous été rejoués (336 PASS + 1 SKIP). 91 tests frontend réussis et build frontend réussi. Cinq recettes navigateur historiques ont été réellement rejouées.
- 23 tests OS ciblés réussis (4 SQL/routes/registre + 19 contrats/voix/Unified Core), TypeScript, lint ciblé et build Next réussis. Les quatre tests SQL/routes du dernier passage n’ont aucun skip. Le rôle SQL testé est distinct du propriétaire et sans privilèges administratifs/DDL.
- Les trois tests spatiaux finaux passent. Le premier simule explicitement OS et exerce HTTP/Mongo réels. Le second utilise les vrais handlers OS et Live, PostgreSQL/Mongo jetables et Chromium/WebGL. Le troisième protège les chemins de transport existants links/conversations/stage.
- Le projet et la préparation partent sans Stage, sans surface ni coordonnées dans le run Light. Le GDTF synthétique est importé, résolu via Library, reparsé, lié à la fixture, au mode DMX et au patch. Une déclaration spatiale explicite est approuvée par OS puis persistée.
- Deux décisions authentiquement OS atteignent simultanément le CAS Mongo : matched_count [0,1], réponses 200/409. Un acteur étranger concurrent est refusé ; les projets Live restent mono-propriétaire, aucun droit collaboratif n’est inventé.
- Première révision parent null, deuxième révision parent exact, reçu et historique atomiques. Les contributions Sound/Video/Production sont comparées byte pour byte via BSON. A→B→A garde des révisions décisionnelles distinctes, sans écraser l’ancien reçu.
- Révocation après claim, avant persistance : l’annulation durable gagne et le writer retardé échoue. Acquittements perdus après claim SQL et après settlement SQL : 503 injectés intentionnellement, reprise explicite avec les mêmes identifiants, aucun doublon.
- MongoDB et le processus Node OS sont réellement arrêtés/redémarrés. Un nouveau navigateur relit la même révision, puis un refresh la conserve. Position/matrice de rotation 3D et vue 2D sont contrôlées. Le PDF généré, archivé via Documents et téléchargé après redémarrage est strictement identique (SHA-256 dans bilateral-result.json).

## Résultats et limites des campagnes

Les dix erreurs initiales d’une campagne historique provenaient d’une URL Mongo de fixture non conforme à son contrat de sécurité ; ces cas ont été rejoués sur le conteneur jetable attendu et réussissent. Aucun test/assertion n’a été supprimé. Un premier build OS refusait un node_modules symbolique hors racine Turbopack ; une copie locale des mêmes dépendances a permis le build sans modification de configuration. Les dépréciations FastAPI/websockets restent non bloquantes. Les réserves HTTP 503 historiques OS restent maintenues et ne sont pas confondues avec les pertes d’acquittement volontairement injectées ici.

## Risques résiduels

- P0 Production : aucune migration, configuration produit, attestation Neon distante ni réception infrastructure distante n’est exécutée. Production reste NO-GO.
- P1 : la révocation d’une décision en cours utilise le fence explicite OS→Live. Les ACL et sessions sont contrôlées à l’approbation/claim ; aucune atomicité distribuée générale de toute modification administrative SQL après claim n’est revendiquée. Avant retrait d’un grant Light, réconcilier les décisions pendantes par list/revoke.
- P1 : écriture opérationnelle reçue par endpoints opérateur authentifiés, pas par un nouvel éditeur graphique ; le visualiseur existant reste en lecture seule. Les anciens modèles sans preuve GDTF ne sont pas automatiquement réattribués.
- P2 : limites explicites 48 Ko d’intent / 15 Mo d’historique ; dépassement refusé sans purge silencieuse. La recette fabricant authentique reste distincte et non reçue.
- NON TESTÉ : fournisseur réel, commandes matérielles, show, voix réelle, Neon HTTP réel. Le shim HTTP SQL des tests appelle PostgreSQL réel ; il ne certifie pas le transport Neon distant.

## Conditions d’intégration ultérieure

OS : migration additive 027 après les fondations canoniques/natives et 025/026 de la branche empilée ; droits runtime explicites, aucun propriétaire/CREATE requis. Live : index unique owner/projet existant obligatoire, persistance majority/journal et stockage GDTF existants. Configurer explicitement la capacité produit dédiée et des callbacks isolés, sans remplacer les secrets ici. Read/archive/voice ne suffisent jamais. Ne pas retirer le refus MVR. Revoir séparément les branches empilées, sauvegardes, droits et preuves distantes avant toute autorisation de déploiement.

**Décision : GO pour le contrat technique/API en isolation, NO-GO Production.** Le raccord des deux côtés est réellement exercé localement ; ce GO ne certifie ni l’ergonomie d’un éditeur spatial absent, ni une archive fabricant authentique, ni un déploiement distant.

Les logs texte publiés ont uniquement leurs espaces de fin de ligne normalisés.

## Fichiers modifiés (liste exhaustive à ce commit)

- `.github/workflows/native-authority-validation.yml`
- `db/migrations/027_canonical_stage_decisions.sql`
- `docs/reception-175/canonical-stage-mutation-v1.md`
- `docs/reception-175/canonical-stage-proof/matrix.csv`
- `docs/reception-175/canonical-stage-proof/os-build.log`
- `docs/reception-175/canonical-stage-proof/os-contracts.log`
- `docs/reception-175/canonical-stage-proof/os-eslint.log`
- `docs/reception-175/canonical-stage-proof/os-final.log`
- `docs/reception-175/canonical-stage-proof/os-tsc.log`
- `docs/reception-175/canonical-stage-proof/test-summary.json`
- `docs/reception-175/canonical-stage-proof/tested-source-sha256.json`
- `docs/reception-175/canonical-stage-reception-20261022.md`
- `src/app/api/core/canonical/stage/route.ts`
- `src/app/api/native/stage/route.ts`
- `src/lib/canonical/stage-authority.ts`
- `src/tests/canonical-stage-postgres.test.ts`
- `src/tests/canonical-stage-routes.test.ts`
- `src/tests/helpers/stage-authority-http.mts`
- `vercel.json`
