# Précontrôle Cloud Neon — lecture seule, activation non autorisée

PR distincte empilée sur #183, qui reste inchangée et Draft. Référence d'étude approuvée : `b6cdfe3574c5e413e03d6cef09d3ce7d67b89f78`. Aucun workflow exécuté, secret configuré, accès Neon, migration ou déploiement effectué dans ce chantier.

## Sources et exécution

Workflow : `.github/workflows/clara-os-recette-neon-preflight.yml`, exclusivement `workflow_dispatch`, sans input, un job, permissions `contents: read`, concurrence globale avec `cancel-in-progress: false`. Aucune commande de provisionnement, migration, GRANT ou déploiement. Actions tierces épinglées à des SHA complets. Installation sans lifecycle scripts et sans secrets ; secrets injectés seulement au dernier step.

Deux checkouts immuables, vérifiés avant toute connexion :

- `reference` : SHA approuvé `b6cdfe3574c5e413e03d6cef09d3ce7d67b89f78`.
- `preflight-tool` : correction `e176cf5baa8cbf41f7cc1444b7fc4debdc6f87a8`, **à approuver séparément avant activation**. Son parent doit être exactement la référence ; manifests et lockfile doivent être identiques. Ce second checkout est nécessaire car le SHA de référence exige encore un jeton de session. Il ne remplace ni ne déploie l'application.

Le workflow exécute uniquement :

```sh
node --import tsx src/scripts/check-recette-neon-cloud.mts --check-cloud --confirm=br-crimson-feather-b2zr00sf
```

Entrée autonome sans import du seed ou d'un émetteur de sessions. L'ancien `provision-recette-fictional.mts --check-cloud` délègue au même mécanisme corrigé ; le workflow ne l'utilise pas. Aucune dépendance Docker pour l'exécution Cloud.

## Environment à créer/configurer sous autorisation distincte

GitHub → dépôt → Settings → Environments → **clara-os-recette-neon-preflight** :

1. Required reviewers : propriétaire/reviewer autorisé ; **Prevent self-review** activé ; **Allow administrators to bypass configured protection rules** désactivé. Si le plan GitHub ne permet pas ces protections : **STOP, ne pas lancer**.
2. Deployment branches and tags : Selected branches and tags, uniquement `fix/recette-neon-readonly-preflight`. Aucun tag, wildcard, branche Production ou fork. Ce nom d'Environment est un gate GitHub, pas un déploiement Vercel.
3. Vérifier explicitement l'existence de l'Environment protégé avant tout dispatch : le seul champ `environment:` du YAML ne crée pas des reviewers. Ne pas laisser GitHub créer automatiquement un Environment sans protection. Les variables d'attestation ci-dessous ne remplacent pas les réglages réels.
4. Vérifier que les deux secrets sont réellement définis **dans cet Environment** : GitHub peut résoudre un secret homonyme de dépôt/organisation si l'Environment n'en définit pas. Ne pas recopier automatiquement des secrets Production, ne pas les consulter ou les afficher, et ne pas utiliser une valeur de Production comme fallback.

Secrets Environment, et seulement ceux-ci :

| Nom | Provenance et usage |
|---|---|
| `DATABASE_URL` | Connexion déjà autorisée de la branche de recette, base `neondb`, rôle `clara_os_recette_limited`, TLS requis. Aucun owner. |
| `NEON_API_KEY` | Clé de métadonnées dont les permissions effectives ont été vérifiées ci-dessous. Jamais transmise à l'application Vercel. |

**Aucun `RECETTE_FIXTURE_SESSION_TOKEN`** : non demandé, non créé, non lu par le chemin de contrôle ; sa présence dans le processus fait refuser le contrôle. `POSTGRES_URL` doit être absent, y compris vide ; aucun fallback SQL.

Variables non secrètes, propres à cet Environment :

| Nom | Valeur/condition |
|---|---|
| `CLARA_RECETTE_NEON_HOST` | Hôte exact de l'endpoint de recette recensé ; sans URL, identifiant ou mot de passe. |
| `RECETTE_PREFLIGHT_TOOLING_SHA_APPROVED` | `e176cf5baa8cbf41f7cc1444b7fc4debdc6f87a8`, seulement après revue et approbation de cette correction. |
| `RECETTE_PREFLIGHT_ENVIRONMENT_REVIEW` | `required-reviewers-no-self-review-no-bypass-v1`, seulement après vérification effective des réglages. |
| `NEON_API_KEY_PERMISSION_REVIEW` | `project-read-only-confirmed`, seulement après vérification administrative des permissions effectives. |
| `NEON_API_KEY_REVIEW_PROJECT` | `fragrant-dream-31652403`. |

Les constantes d'isolation sont fixées par le YAML : VERCEL=1, VERCEL_ENV=preview, VERCEL_TARGET_ENV=clara-os-recette, CLARA_RECETTE_MODE=isolated-v1, branche `br-crimson-feather-b2zr00sf`. Ce sont des marqueurs du processus opérateur, aucun Preview n'est créé. Pas de modification des paramètres Vercel.

## Vérification de la clé API — bloquante et NON RÉALISÉE

Un GET réussi n'atteste pas les permissions de la clé. Le workflow ne dispose pas d'une introspection fiable de son propre jeton et ne tente **aucune écriture de contrôle**. Il n'affiche aucune clé ni réponse API brute.

Avant de définir l'attestation, l'administrateur vérifie dans Neon Console (gestion des clés du compte/de l'organisation selon leur type) : identifiant de clé sans sa valeur, propriétaire, type, périmètre de projets, rôle/droits effectifs hérités, expiration/révocation et opérations permises. Conserver une preuve administrative expurgée, datée, avec reviewer, associée à la configuration de cet Environment et à la revue du run. La clé ne doit autoriser que la lecture nécessaire au projet `fragrant-dream-31652403` ; sa capacité à lister les endpoints doit être vérifiée sous autorisation de lecture ultérieure.

Si la Console/documentation applicable ne permet pas de prouver ce périmètre, si la clé hérite d'accès en écriture ou de droits plus larges, ou si les droits sont inconnus : **ne pas définir l'attestation, ne pas lancer**. Demander une décision spécifique sur une identité/clé adaptée ; aucune création ou modification de clé n'est réalisée ici. Le logiciel contrôle la présence de l'attestation mais ne prétend pas l'avoir démontrée : le rapport indique explicitement `HUMAN_ATTESTED_ONLY`.

## Contrôles et rapport

1. Valider la configuration locale avant transport : mode/cible exacts, rôle/base/host dans l'URL, TLS, options strictes et absence de POSTGRES_URL. L'URL n'est jamais affichée.
2. GET unique vers `/api/v2/projects/fragrant-dream-31652403/endpoints`, sans suivi de redirection : l'hôte de DATABASE_URL doit avoir **une seule** correspondance, sur `br-crimson-feather-b2zr00sf`. Toute ambiguïté, branche différente ou injection de connexion automatique est refusée **avant la première requête SQL**. Aucun accès SQL à main ou Production n'est tenté.
3. Trois SELECT de catalogues, chacun envoyé par le SDK Neon réel dans une transaction HTTP avec `Neon-Batch-Read-Only: true` :
   - base `neondb`, current_user `clara_os_recette_limited`, aucun SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION, aucun CREATE public/base ;
   - CONNECT, USAGE public/plpgsql, EXECUTE des fonctions du seed et absence de propriété effective des cinq tables ;
   - SELECT/INSERT requis sur les colonnes des cinq tables d'authentification. Les fonctions `set_config` et de verrou sont seulement nommées dans `has_function_privilege`, **jamais exécutées**.
4. Rapport JSON dans le log du dernier step : statut, contrôles validés, liste limitée aux objets/permissions attendus, `writesExecuted:false`, limite sur les permissions de clé et `neonWriteBatch:NOT_VERIFIED`. Une erreur SDK/API est remplacée par un code sûr ; pas de stack, URL, réponse brute, environnement, artefact ou reçu de fournisseur. Exit 1 au moindre refus ; pas de retry automatique.

En cas de refus, conserver le rapport expurgé, ne pas élargir les droits et ne pas basculer sur un rôle propriétaire. L'inventaire de tous les droits du rôle applicatif reste distinct du minimum nécessaire au seed. Une réussite ne crée ni utilisateur, ni espace, ni mission, ni session et **ne certifie pas le batch d'écriture Neon HTTP**.

## Activation future — autorisation nécessaire

1. Revoir cette PR Draft et le SHA immuable d'outillage ; ne rien fusionner automatiquement.
2. Autoriser séparément la configuration de l'Environment et documenter les preuves de reviewers, provenance des secrets et droits de la clé. Aucune de ces opérations n'a été effectuée ici.
3. Vérifier que GitHub reconnaît le workflow : `workflow_dispatch` doit être présent sur la branche par défaut pour qu'un lancement soit disponible. Lecture GitHub effectuée pendant cette préparation : fichier absent de `main` (API contents, HTTP 404). Si toujours absent, **STOP** et faire autoriser une publication minimale du workflow, sans supposer que cette PR Draft suffit et sans fusionner #183/#176. Ne pas remplacer ce gate par un push, un schedule ou un workflow alternatif.
4. Après accord explicite pour les seules lectures Neon, sélectionner le workflow et le ref `fix/recette-neon-readonly-preflight`, vérifier les SHA/configurations, déclencher manuellement puis faire approuver le job par un autre reviewer autorisé. Aucun dispatch lancé dans ce chantier.
5. Archiver uniquement le résultat expurgé avec SHA/run/reviewer. L'éventuelle autorisation de provisionnement est une décision distincte ; ce workflow n'offre aucun input ou step pour l'exécuter.

## Validations hors ligne

SDK installé utilisé avec transports/métadonnées simulés : succès sans jeton, READ ONLY effectif dans l'enveloppe HTTP, refus Production/main/autre rôle/privilèges administratifs/clé non revue/POSTGRES_URL/arguments d'écriture, détails des droits manquants, erreurs contenant des secrets non propagées, CLI autonomes et historique. Tests statiques YAML/AST : déclencheur exclusivement manuel, deux secrets sur le dernier step, SHA constants/vérifiés, commandes allowlistées, graphe d'import sans seed/émetteur de sessions, seulement trois SELECT de catalogues.

Les tests de non-régression du seed utilisent exclusivement PostgreSQL jetable et ne sont pas exécutés par le workflow Cloud. Aucun secret Neon réel n'est utilisé. Les résultats finaux sont consignés dans la PR ; aucun test local ne constitue une preuve de droits ou de compatibilité distante.

Résultats : **9 tests ciblés réussis** (6 entrée/SDK/CLI, 3 sécurité YAML/AST), **41 tests de non-régression réussis** dans la campagne combinée de 47 tests avant ajout du workflow ; 0 échec/ignoré. TypeScript, ESLint ciblé et `git diff --check` réussis. Aucune campagne générale ni build Vercel relancé.
