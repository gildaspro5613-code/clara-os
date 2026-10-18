# Authentification fictive de recette — préparation, pas initialisation réelle

Base `5a97bdb60dc9284c4e11d18f3ec5103901c6778b`. Projet indépendant et target `clara-os-recette`, branche Neon unique `br-crimson-feather-b2zr00sf`. Aucun workflow, déploiement, variable Vercel ou permission Neon modifiés dans cette PR.

## Phase A — mécanisme et diagnostic

Le 401 observé sur GET `/api/canonical/registry` établit l'absence d'un cookie canonique utilisable syntaxiquement sur ce domaine ; ce n'est pas une preuve de panne SQL. Le login Vercel ne crée pas de session OS. Une session posée sur une autre URL de déploiement ne se transfère pas automatiquement au nouveau domaine.

Contrats réutilisés : `createOpaqueSessionToken()` produit un aléa cryptographique ; `sessionTokenDigest()` produit l'empreinte persistée dans `clara_auth_sessions`. `/api/auth/recette/session` vérifie la session, son expiration/révocation et le membership avec `resolveAuthenticatedWorkspace()`, puis émet le cookie existant Secure/HttpOnly/SameSite. Le registre exige aussi une identité dans `clara_auth_identities`. Aucun email, nom ou session récente n'est utilisé comme preuve. La route ne crée aucune session et ne gagne aucun nouveau droit dans cette PR.

Le manque est le provisionnement préalable de l'identité fictive et de sa session. Le mode isolated-v1 et `/recette` ne le font pas automatiquement ; OAuth reste refusé. La liste des espaces peut être vide aussi pour une session expirée ou des droits révoqués (GET retourne alors success avec liste vide), ce que le nouveau message explique sans fausse distinction serveur.

## Phase B — préparation technique

- `fixture-provisioning.ts` : outillage **opérateur hors HTTP**, pas un adaptateur de fournisseur. Namespace fictif versionné, aucun renseignement personnel et aucun appel à `enrollVerifiedIdentity()` avec de fausses revendications Google/Microsoft. C'est le modèle de fixture existant, limité au test isolé, dans les mêmes tables canoniques.
- `provision-recette-fictional.mts` : aucune écriture ni requête par défaut/`--plan`. L'application exige un consentement explicite futur `--apply --confirm=<branche>`, une cible conforme au validateur Recette existant et une vérification des métadonnées Neon **avant** SQL. Le programme n'est appelé par aucune route, aucun startup ou workflow.
- Le préflight GET du projet Neon fixe vérifie une correspondance exacte endpoint.host / branch_id. Pas de déduction depuis un nom de branche ou l'existence de neondb. Une variante poolée non retournée par les métadonnées reste refusée, pas normalisée implicitement. Ensuite vérification réelle current_database/current_user, absence d'attributs administratifs et de CREATE sur base/schéma, puis droits SELECT/INSERT par colonnes des cinq tables. Une preuve manquante arrête l'outil.
- Le seed transactionnel sérialisable crée seulement utilisateur, identité, workspace, membership et session. Une collision avec une identité, un workspace ou un membership incohérent est refusée ; aucun historique réattribué et aucun droit révoqué réactivé. Les initialiseurs concurrents partagent un verrou transactionnel de fixture. Le membership owner est **applicatif dans l'espace fictif**, pas le rôle SQL neondb_owner, qui reste interdit.
- Session aléatoire, durée **une heure**, empreinte seule en base. Le token est conservé dans un fichier opérateur privé (répertoire propriétaire mode 0700, fichier nouveau mode 0600, sans suivi de lien symbolique), jamais en sortie console. Même fichier réutilisé : pas de nouveau token ni prolongation. Un autre token actif est refusé ; un token expiré/révoqué n'est jamais ressuscité. En cas d'acquittement perdu, conserver le fichier pour rejouer la même opération ; ne pas le supprimer pour provoquer une nouvelle émission.
- Sélecteur existant : chargement, 401, liste vide, erreur réseau/serveur et liste autorisée sont explicites. Menu désactivé sans choix utilisable. Le lien `/recette` est affiché seulement dans le contexte Recette. Les cinq langues sont conservées. Les ACL, protections serveur, Brain et stores restent inchangés.

## Autorisations supplémentaires nécessaires AVANT toute exécution réelle

| Opération | Autorisation / limite |
|---|---|
| Lecture des métadonnées Neon | Autoriser un opérateur et un accès `NEON_API_KEY` limité à la lecture des endpoints du projet `fragrant-dream-31652403`. Credential opérateur hors runtime Web : ne pas l'ajouter aux variables de l'application Vercel. Aucune génération/export de connection string. Aucun appel réel effectué ici. |
| Vérification SQL recette | Autoriser les seules lectures de catalogues sur la branche dédiée, sous `clara_os_recette_limited`. Ne pas transmettre la valeur de DATABASE_URL ; fournir la configuration via le mécanisme sécurisé opérateur existant. |
| Initialisation fictive | Autoriser explicitement les INSERT dans les cinq tables ci-dessous et la création du fichier de session privé. Aucun DDL, aucune migration, aucun changement de branche ou de configuration serveur. |
| Droits manquants | **Arrêter.** Le rôle limité n'est pas présumé provisionneur. Ne pas lui donner ALL/CREATE/attributs admin. Faire approuver séparément soit les droits de colonnes justifiés, soit un opérateur distinct. L'outil actuel accepte seulement le rôle limité : un rôle distinct nécessiterait une adaptation revue de son préflight, pas l'emploi de neondb_owner ou un contournement. |
| Client et projet fictifs | Autoriser séparément leurs deux créations par l'API canonique sous le compte fictif owner. Ce n'est pas effectué implicitement par le seed d'authentification. |
| Publication de l'interface | Nouvelle source à approuver puis adaptation éventuelle du workflow épinglé et déploiement recette, chacun sur accord distinct. Les workflows restent inchangés ici. |

Droits du seed : SELECT sur `id` users/workspaces ; SELECT et INSERT sur issuer/subject/user_id des identités, user_id/workspace_id/role des memberships et token_hash/user_id/expires_at des sessions ; SELECT aussi sur revoked_at des memberships/sessions. INSERT sur id users/workspaces. Les droits de runtime et des commandes registre restent à contrôler séparément (dont UPDATE approprié aux verrous FOR UPDATE). Aucune extension de permissions n'est exécutée par l'outil.

## Procédure préparée pour l'opérateur — NE PAS exécuter sans accord

1. Faire approuver la lecture metadata et le préflight ; confirmer endpoint → branche dédiée, base neondb et rôle limité. Ne pas utiliser main ou une branche de sauvegarde. Injecter hors logs les credentials nécessaires et les paramètres de recette exacts. Le validateur requiert le contexte de recette explicite ; ces déclarations seules ne constituent pas une preuve de branche, d'où la vérification API indépendante. Aucun paramètre Production n'est changé.
2. Commande sans effet déjà vérifiée : `node --import tsx src/scripts/provision-recette-fictional.mts --plan`.
3. Après autorisation des écritures, depuis le checkout approuvé et dans un répertoire opérateur privé préparé : `node --import tsx src/scripts/provision-recette-fictional.mts --apply --confirm=br-crimson-feather-b2zr00sf /chemin-prive/session.json`. Le préflight reste obligatoire avant toute écriture. Ne pas ajouter `set -x`, ne pas ouvrir le fichier dans les logs et ne pas joindre de fichier secret à GitHub.
4. Ouvrir `/recette` sur **l'URL générée exacte** du projet indépendant. Espace : `recette-176-fictional-workspace-v1`. Utiliser le token du fichier via un canal local sécurisé/gestionnaire de secrets vers le champ password ; ne pas l'afficher dans le terminal, le chat ou une URL. La route existante revalide tout et pose le cookie. Ce raccord est compatible avec le serveur déjà au SHA 5a97bdb : un redéploiement n'est pas intrinsèquement nécessaire pour l'authentifier après provisionnement autorisé. La correction UX, elle, nécessitera un futur déploiement approuvé.
5. Après autorisation des objets métier fictifs, dans la session navigateur authentifiée et avec sa même origine, utiliser les commandes existantes POST `/api/canonical/registry` :

```json
{"action":"createClient","workspaceId":"recette-176-fictional-workspace-v1","id":"recette-176-fictional-client-v1","displayName":"Client fictif de recette"}
{"action":"createProject","workspaceId":"recette-176-fictional-workspace-v1","clientId":"recette-176-fictional-client-v1","projectId":"recette-176-fictional-project-v1","displayName":"Projet fictif de recette"}
```

Ces contrats existants contrôlent les droits, créent les ACL explicites du créateur et journalisent. Ne pas réutiliser un client/projet historique. Vérifier les réponses ; une collision/refus n'autorise pas à réattribuer les données.

6. Depuis l'interface : sélectionner Espace → Client → Projet → créer un fil natif → créer une mission fictive → Clara simulée → Journal → rafraîchir et reprendre. Aucune mission n'est créée par l'initialisation d'authentification. Aucune action fournisseur ne doit être demandée. Les refus Google/IONOS/Live/matériel restent actifs.
7. Au besoin, vérifier la cohérence de l'indicateur de connexion global : il utilise l'espace configuré par CLARA_MD_WORKSPACE_ID/CLARA_WORKSPACE_ID. Ne pas modifier ces variables aujourd'hui ; le sélecteur natif liste ses memberships sans dépendre de ce défaut. Toute adaptation d'affichage/configuration doit rester limitée à la recette et être autorisée.

## Tests et limites de réception

Tests PostgreSQL **réel jetable local**, rôle limité, schéma d'authentification minimal de test créé uniquement dans le conteneur : aucune migration du dépôt exécutée, aucune connexion Neon. Métadonnées Neon remplacées par réponses contrôlées ; SDK SQL réel traduit vers PostgreSQL local. Tests des vrais handlers registre et reprise de session : 401 absent, accès autorisé, répétition idempotente et échéance conservée, token différent refusé, séparation des espaces, membership absent/révoqué et session expirée/révoquée refusés. Tests de branche/Production incohérentes arrêtés avant SQL et de privilège manquant avant écriture.

Navigateur sur Next compilé : chargement, 401/lien, vide, erreur 503, erreur réseau, liste autorisée et options retrouvées après reload. Réponses API navigateur contrôlées : ce test **ne certifie pas un parcours Mission complet sur Neon**. Les protections réseau/fournisseurs et la lecture Mission existantes sont rejouées séparément. Résultats : **6 tests PostgreSQL** (cinq sous-scénarios plus le scénario parent), **28 tests de diagnostic/isolation existants**, **1 recette navigateur**, tous réussis sans échec/ignoré ; TypeScript, lint ciblé et build Next webpack réussis, polices simulées localement. Commande `--plan` exécutée sans accès réseau/SQL. La recette métier complète reste à exécuter après les autorisations de provisionnement, création client/projet et connexion sur le domaine réel.

Les premières tentatives ont révélé un readiness PostgreSQL trop précoce (corrigé par attente TCP) et des sélecteurs navigateur ne correspondant pas aux labels/options natifs (corrigés sans retirer d'assertion). Chromium système existant utilisé ; aucune nouvelle dépendance installée. Pas de nouvelle architecture d'authentification, de token universel ou de session permanente.

**Décision : préparation technique reviewable en PR Draft ; NO-GO pour déclarer la recette réelle reçue tant que le préflight, le provisionnement fictif et le parcours navigateur réel n'ont pas été autorisés puis vérifiés. Aucune initialisation Neon, permission, variable, migration, déploiement ou merge exécutés.**
