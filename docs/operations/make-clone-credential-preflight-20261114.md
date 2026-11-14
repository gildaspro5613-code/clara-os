# Make → Clara OS — préflight du coffre sur clone isolé (14/11/2026)

**État : PRÉPARÉ / NON EXÉCUTÉ.** Aucun jeton fournisseur dans GitHub, aucun appel Make, aucune activation, aucun changement Production.

## Périmètre strict
- Projet Neon : `fragrant-dream-31652403`; branche : `br-nameless-dew-b2v6asgj`; base : `neondb`.
- Endpoint connu du clone : `ep-morning-frog-b2pbns02.c-6.eu-central-1.aws.neon.tech`.
- Premier scénario uniquement : `find-drive-document` → Make `7295042` ; effet **READ**.
- Connexion existante à réutiliser, statut `RECONNECT_REQUIRED` sur clone : ne pas créer une seconde connexion pour le même workspace.
- Les huit autres scénarios restent sans scope actif, et **tous** les scénarios du catalogue `enabled=false` tant que leur certification n'est pas obtenue.
- Aucune permission par simple présence d'un token.

## 1. Résultat du contrôle minimal (effectué)
Rôle LOGIN isolé `clara_make_runtime_login` dans le schéma vide `clara_make_runtime_scope` :
- `EXECUTE` **uniquement** sur `public.clara_native_make_read_resolve(text,text,text,text,text,text)`.
- Aucun `EXECUTE` sur `public.clara_native_make_admin_command(...)`.
- Aucun `SELECT` sur `public.clara_connections` et `public.clara_connection_credentials`.
- Aucun droit direct d'INSERT sur `clara_native_make_read_authority`.
- Aucun SUPERUSER, CREATEDB, CREATEROLE, BYPASSRLS, CREATE sur public.

Ce rôle est **insuffisant pour le runtime complet** : la création d'une session Clara authentifiée et la résolution des credentials nécessitent une architecture d'autorisation supplémentaire. Ne pas élargir arbitrairement les privilèges sur les ~50 tables public.

## 2. Blocage recette indépendant
`src/lib/recette/database-binding.ts` lie actuellement la recette Vercel au projet `clara-os-recette` et au clone `br-crimson-feather-b2zr00sf`, pas à ce clone Make. `src/lib/recette/external-execution-guard.ts` bloque **toutes** les exécutions Make en mode recette.

**Interdictions :** ne pas supprimer/renommer les marqueurs de recette, ne pas changer le host hard-codé, ne pas choisir la Production comme environnement de repli et ne pas créer de Preview Vercel. Pour une exécution réelle Clara OS ↔ Make, préparer une réception isolée distincte autorisée explicitement et auditée ; les appels directs Codespaces → Make déjà réalisés ne valent pas recette Clara.

## 3. Préparation de l'enregistrement chiffré (sans jeton)
Le contrat de code existant est :
```json
{
  "api": {"token": "<secret-injected-only-at-runtime>", "zone": "eu1"},
  "scenarios": {"find-drive-document": {"transport": "api", "scenarioId": 7295042}}
}
```
Ce bloc est **un schéma**, pas un secret à committer.

- Déployer une clé AES-256-GCM **spécifique au clone** sous `CLARA_CREDENTIALS_ENCRYPTION_KEY`, compatible avec `src/lib/connections/credential-store.ts`. Ne pas réutiliser la clé Codespaces actuelle sans preuve de sa provenance. Conserver la clé à part du chiffrement et de la base.
- Injecter le jeton Make uniquement depuis un canal secret autorisé au moment de l'opération, jamais dans un message, un commit, une issue, un log, une commande passée en argument, une URL, ni en clair dans la base.
- Utiliser `CredentialStore.set(connectionId, credentials)` et une connexion `provider='make'`, `workspace_id='melodie-digital'`, `scopes=['make:scenario:find-drive-document']` en statut **CONFIGURED**, pas ACTIVE.
- Un provisionneur séparé, ponctuel et étroitement autorisé doit écrire à la fois métadonnées et ciphertext en **une transaction**, après préflight strict du host, de la branche Neon, de l'identité et de l'absence de credential précédent ; il ne doit pas utiliser `clara_make_runtime_login`, volontairement sans droits sur ces tables.
- Ne jamais déposer de jeton tant que l'identité SQL du provisionneur, la concordance de la clé isolée et la transaction atomique ne sont pas attestées.
- L'activation nécessite une approbation native, un catalogue certifié READ, les scopes workspace/client/projet/utilisateur, et des contrôles grant → READ → revoke. Ne pas basculer en ACTIVE par SQL direct.

## 4. Check de réception à venir
1. Attester un environnement authentifié branché **effectivement** au clone, avec une identité SQL limitée et non propriétaire ; la valeur effective de DATABASE_URL n'est jamais imprimée.
2. Tester les refus de session invalide, cross-workspace/client/project/user et les refus de WRITE/SEND.
3. Provisionner le ciphertext en isolation, puis confirmer lecture/déchiffrement **sans afficher le secret**.
4. Certifier et activer un seul scénario READ, attribuer puis révoquer le grant de session authentifiée.
5. Exécuter **une seule fois** `find-drive-document` après approbation explicite ; journaliser l'ID d'exécution, le succès et les coûts.
6. Maintenir NO-GO pour Ready, merge et Production jusqu'à autorisation explicite.

### État vérifié au 14/11
L'API Make a répondu HTTP 200, puis une exécution réelle du scénario Drive a réussi : ID `74fbfad4ac3a4ee9a37b741708c569a1`, 1 crédit, résultat `status=completed` sans fichier trouvé. Il s'agit de preuves côté fournisseur, **pas** d'une exécution depuis le Brain Clara OS.


## Vérification complémentaire — 14 novembre 2026

- Rôle `clara_make_provisioner_login` créé sur le clone, limité au schéma `clara_make_runtime_scope`. Aucun droit direct sur les connexions, les credentials ou les grants.
- Fonction `clara_make_runtime_scope.provision_make_read_ciphertext_once(text)` **installée** dans une transaction CREATE/REVOKE/GRANT. SQL source : `docs/operations/make-clone-once-provisioner-20261114.sql`.
- Droits vérifiés : seule l'identité `clara_make_provisioner_login` possède EXECUTE en plus du propriétaire ; PUBLIC et `clara_make_runtime_login` : refusés.
- Fonction : connexion fixe `make-read-fixture-249-20261106`, workspace `melodie-digital`, scope unique `find-drive-document`, exige `RECONNECT_REQUIRED`, aucun credential préexistant, n'accepte qu'une enveloppe AES-256-GCM structurée, enregistre le chiffré et fixe le statut **CONFIGURED** (jamais ACTIVE), en une transaction verrouillée.
- Test négatif : enveloppe invalide → rejet ; runtime Clara → permission denied.
- Après tous les tests, connexion toujours `RECONNECT_REQUIRED`, zéro credential Make enregistré.
- **Pas de test positif de provisionnement** (le jeton n'est pas présent et aucune clé clone n'est encore établie). Le rôle PostgreSQL LOGIN ne doit pas être utilisé pour démarrer le runtime complet de Clara OS.
- Ne pas exposer de chaîne PostgreSQL, mot de passe, ciphertext ou jeton dans les journaux, scripts suivis ou la conversation. Le provisionnement reste **NO-GO** sans canal secret attesté et clé clone dédiée.
