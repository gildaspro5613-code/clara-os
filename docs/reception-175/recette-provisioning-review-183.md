# PR #183 — Revue corrective avant autorisation Neon

Référence examinée : `d176bbfa3ef9ab0e0187a8edf6821c93d6137b65`, branche existante `fix/recette-canonical-session-onboarding`. PR conservée Draft. Aucun accès Neon, changement de droits, migration, déploiement ou appel fournisseur effectué. Les fichiers locaux non suivis préexistants restent hors changement.

## Décision : NO-GO pour exécuter actuellement le provisionnement Neon

Deux preuves distantes restent absentes : compatibilité du batch avec le service HTTP Neon et droits effectifs du rôle sur cette branche. Les tests locaux ne remplacent aucune de ces preuves. Aucun défaut démontré n'impose de remplacer le transport HTTP par un autre runtime.

## Compatibilité et corrections

- SDK installé `@neondatabase/serverless` **1.1.0** : README, section `transaction()`, documente un batch HTTP dans une transaction non interactive. `index.mjs`, fonctions `cs`/`execute`, sérialise les cinq requêtes en **un POST**, avec `Neon-Batch-Isolation-Level: Serializable`. L'option réelle est `isolationLevel` ; le nom `isolationMode` de CONFIG.md ne correspond pas au code installé. Aucun changement de version.
- Le verrou est transactionnel ; `set_config(..., true)` et `current_setting` s'utilisent dans le même batch. Les blocs DO n'effectuent ni contrôle de transaction interne ni DDL. Les paramètres restent en dehors des blocs dollar-quoted. PostgreSQL local valide ces constructions. Le SDK accepte des résultats DO/INSERT sans lignes et le type `void` du verrou dans notre simulation du protocole.
- **NON VÉRIFIÉ** : acceptation effective de ces commandes et format des réponses du service HTTP Neon. Aucun proxy local ne prouve ce comportement distant.
- `preflightRecetteFixture()` vérifie désormais aussi CONNECT, USAGE du schéma et du langage plpgsql, EXECUTE des fonctions du verrou/GUC/horloge, et absence de propriété effective des cinq tables. Les requêtes de provisionnement ciblent explicitement `public` : le contrôle de privilèges et l'écriture portent sur les mêmes objets, indépendamment du search_path.
- Le test PostgreSQL utilise maintenant les grants **par colonne**, et un adaptateur asynchrone permettant deux vraies transactions concurrentes. Aucun de ces grants n'est appliqué à Neon.

### Permissions minimales de cette opération, pas de l'application entière

| Objet | SELECT | INSERT |
|---|---|---|
| clara_auth_users, clara_auth_workspaces | id | id |
| clara_auth_identities | issuer, subject, user_id | issuer, subject, user_id |
| clara_workspace_memberships | user_id, workspace_id, role, revoked_at | user_id, workspace_id, role |
| clara_auth_sessions | token_hash, user_id, expires_at, revoked_at | token_hash, user_id, expires_at |

CONNECT sur neondb, USAGE public et plpgsql ; EXECUTE sur `pg_catalog.pg_advisory_xact_lock(bigint)`, `hashtext(text)`, `set_config(text,text,boolean)`, `current_setting(text)` et `now()`. Les catalogues et fonctions de consultation des privilèges doivent être accessibles pour le précontrôle. Les contraintes/defaults du schéma réel doivent correspondre aux migrations versionnées 001/002 ; toute divergence ou dépendance supplémentaire doit interrompre l'opération. Aucun UPDATE, DELETE, séquence, CREATE, propriété ou privilège administrateur nécessaire au seed.

Les attributs administratifs et CREATE public/base sont refusés. Ce contrôle n'est pas un inventaire exhaustif des privilèges du rôle applicatif : il peut légitimement disposer de DML sur d'autres tables métier. Son inventaire réel et les éventuels grants hérités restent NON VÉRIFIÉS ; ne rien accorder automatiquement. Les SELECT de catalogues sont visibles dans `preflightRecetteFixture()` et peuvent être examinés avant autorisation.

## Échec, concurrence, reprise

Le batch est tout-ou-rien selon le contrat transactionnel documenté ; rollback effectivement vérifié sur PostgreSQL jetable après échec de l'insertion finale. Collision de namespace ou session active différente : refus. Membership révoqué/absent et session révoquée/expirée : refus sans résurrection ni renouvellement.

Sous Serializable, le verrou n'assure pas que deux snapshots concurrents réussissent : un conflit peut provoquer `40001`. Aucun retry automatique. Après conflit ou perte d'acquittement, conserver **le même jeton** et refaire le précontrôle avant une relance explicitement autorisée. Une nouvelle instance SDK retrouve la session unique et son expiration d'origine ; la reprise ne repose pas sur la mémoire du processus. Un jeton expiré exige une nouvelle autorisation d'opérateur pour une nouvelle session, jamais un allongement silencieux. Une session différente encore active reste bloquante.

## Procédure 100 % Cloud proposée — non exécutée

Aucun téléchargement Mac, aucun artefact de session, aucune variable Production. Réutiliser GitHub Actions et la CLI de cette branche ; **aucun nouveau workflow n'est ajouté par cette correction**. Toute mise en place et exécution ci-dessous nécessite une autorisation explicite distincte.

1. Faire approuver le SHA final de #183 et un workflow manuel ponctuel sur runner GitHub hébergé, sans intégration de déploiement. `workflow_dispatch` uniquement ; Environment GitHub dédié à cette opération, reviewers obligatoires, pas d'approbation par l'initiateur ; `permissions: contents: read`, aucune commande Vercel. Épingler le checkout au SHA approuvé, vérifier `git rev-parse HEAD`, installer via le lockfile et utiliser une concurrence unique sans annuler une exécution en cours. Ne pas traiter les variables GITHUB_* comme preuve d'autorisation : elles sont seulement des garde-fous CLI, l'approbation doit être imposée par GitHub.
2. Après autorisation de configuration de cet Environment **non Production**, fournir uniquement les secrets nécessaires : `DATABASE_URL` de recette limitée, `NEON_API_KEY` dont le périmètre réel permet la seule lecture des métadonnées requises, `RECETTE_FIXTURE_SESSION_TOKEN`. Générer ce dernier avec un générateur cryptographique Cloud/coffre approuvé : 32 octets aléatoires encodés base64url (43 caractères), conservés dans le coffre de l'opérateur puis dans le secret GitHub chiffré. Ne jamais le passer dans les inputs workflow_dispatch, arguments, URL, logs, résumé ou artefacts. Ne pas modifier les secrets Vercel. La session utilise le mécanisme canonique existant, liée exclusivement à l'identité fictive, expirant en une heure ; ce n'est pas un mot de passe universel.
3. Paramètres opérateur du job uniquement : `VERCEL=1`, `VERCEL_ENV=preview`, `VERCEL_TARGET_ENV=clara-os-recette`, `CLARA_RECETTE_MODE=isolated-v1`, `CLARA_RECETTE_NEON_BRANCH_ID=br-crimson-feather-b2zr00sf`, `CLARA_RECETTE_NEON_HOST` correspondant à l'endpoint exact de cette branche. Ces marqueurs servent à satisfaire la politique existante, sans créer de déploiement Preview. `POSTGRES_URL` absent. Aucune copie automatique des paramètres Production. Le précontrôle exige la correspondance exacte hôte/branche dans les métadonnées du projet `fragrant-dream-31652403` ; un hôte poolé absent de cette réponse sera refusé, sans normalisation conjecturale.
4. Autoriser d'abord **uniquement les lectures** API de métadonnées et SQL, puis exécuter dans ce job, secrets injectés seulement sur le step, sans `set -x`, dump d'environnement ni logs SDK :

   ```sh
   node --import tsx src/scripts/provision-recette-fictional.mts --check-cloud --confirm=br-crimson-feather-b2zr00sf
   ```

   Le contrôle s'arrête avant tout seed. Si un droit manque : arrêt, rapport sans secret, nouvelle décision humaine ; aucun fallback owner et aucun GRANT. Un succès ne prouve toujours pas la compatibilité du batch Neon.
5. Après examen du résultat, demander séparément l'autorisation d'essai du batch sur **cette branche isolée uniquement**, avec DML limité aux cinq tables et au namespace fictif, puis :

   ```sh
   node --import tsx src/scripts/provision-recette-fictional.mts --apply-cloud --confirm=br-crimson-feather-b2zr00sf
   ```

   Le succès distant puis une relance autorisée du même jeton, avec constat en lecture de l'unicité et de l'expiration inchangée, fourniront les preuves HTTP manquantes. Si l'opérateur impose un essai à rollback forcé préalable, le préparer et le faire approuver séparément ; aucun tel essai n'est implémenté ou lancé ici. Une erreur générique ne suffit jamais à conclure à une absence de commit.
6. L'opérateur ouvre `/recette` sur l'URL de recette approuvée et renseigne l'espace fixe `recette-176-fictional-workspace-v1` et le jeton depuis son coffre, dans le champ mot de passe. Aucun fichier local à télécharger. Supprimer le secret d'opérateur de l'Environment après la fenêtre de reprise approuvée. La suppression du secret ne révoque pas une session : utiliser la révocation canonique si nécessaire, sous autorisation séparée. Expiration/revocation restent contrôlées en base.

La création du client/projet fictifs puis de la mission reste un parcours canonique séparé, décrit dans `recette-authentication-onboarding.md`. Le seed ne fabrique pas une Mission ni un rattachement historique. Le test métier complet sur l'URL réelle reste NON VÉRIFIÉ.

## Preuves ciblées de cette revue

- `node --import tsx --test src/tests/recette-auth-provisioning.test.ts src/tests/recette-provisioning-http-contract.test.ts src/tests/recette-isolation.test.ts` : **41 tests réussis, 0 échec, 0 ignoré** (10 incluant le conteneur PostgreSQL parent, 3 SDK/Cloud, 28 protections existantes). PostgreSQL 17 jetable uniquement ; endpoint SDK et métadonnées simulés, aucun fournisseur réel.
- Tests : rollback tardif ; concurrence réelle SQL ; acquittement perdu/reprise avec nouvelle instance SDK ; permissions minimales par colonne et EXECUTE manquant ; expiry/révocation/collision ; handlers canoniques réels ; batch HTTP sérialisé/décodé par SDK réel avec réponse simulée ; CLI réelle fail-closed, sans secret dans ses sorties ; protections transports existantes.
- TypeScript et ESLint ciblé ; aucun changement UI/Next runtime, donc aucune reconstruction générale ni campagne navigateur répétée. Les validations antérieures restent antérieures, pas une certification Neon.

Résultats finaux : TypeScript `npx tsc --noEmit` réussi ; ESLint des quatre fichiers TypeScript modifiés/ajoutés réussi ; `git diff --check` réussi. Les tests précédents du lot ne sont pas rejoués sans modification correspondante.
