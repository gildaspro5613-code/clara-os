# Reprise opérationnelle après #197 — dossier de promotion

## Référence et périmètre

Départ vérifié : #197 Draft, `2b676e7a002508f9d29ceea4e297c19772d1bb11`, base `chore/recette-176-integration-audit-20261018`. Branche corrective dédiée : `fix/recette-operational-auth-context-197`. #176 est toujours Draft à `ac835b6c4ebf770ce6decf953df51d82392ea1c8`. Réutilisation de ses stores natifs, ACL, reçus 017, Documents, sélecteur et Journal ; aucune fusion de piles #183/#177 ni nouveau runtime.

`origin/main` observé : `a4d865a3d4a307425c057e69ea2132c9e0361f00`. **Ce n'est pas une attestation du code Production déployé.** Aucun accès aux métadonnées Vercel effectives dans ce contexte. Ne pas promouvoir toute la pile en supposant que main ou la base de #176 est le déclencheur Production : établir ce déclencheur et revoir les différences cumulées avant autorisation.

## Causes démontrées et correction

1. Google sign-in refusait le POST d'échange et le GET JWKS en Recette. Exception limitée à ces points d'exécution et à la génération de l'URL d'authentification. Les endpoints sont constants ; aucun renouvellement de jeton ni scope Workspace. Redirections de transport refusées, timeout 15 s. State/nonce atomiques, RS256, issuer, audience, azp, expiration et nonce conservés.
2. Le bootstrap Google existant pouvait inscrire une identité inconnue et octroyer owner sur correspondance d'email. En Recette, **identité inconnue refusée**, y compris avec bootstrap configuré. Aucune inscription ni attribution de droits nouvelle. Hors Recette, comportement d'inscription existant préservé.
3. Le sélecteur vide absorbait l'erreur de session et ne proposait aucun accès Google. Le 401 affiche maintenant le lien de connexion existant ; absence de droits et erreurs sont signalées sans exposer d'identifiants. Aucun workspace/client/projet/session par défaut.
4. La validation de binding était réservée aux fonctions d'attestation. Sa même implémentation pure est désormais réutilisée avant toute construction du client SQL partagé en Recette : host isolé autorisé, branche attendue, base/rôle, TLS, absence de POSTGRES_URL et paramètres ambigus. Rejet aussi des fragments/ports inattendus. Le target Recette active également les refus externes, même si les autres marqueurs manquent. Hors Recette, priorité DATABASE_URL puis POSTGRES_URL inchangée.

L'exception Google exige le projet isolé, target `clara-os-recette`, mode `isolated-v1`, binding valide, origine HTTPS du projet Recette et callback de même origine exactement `/api/auth/google/callback`. **Ces validations ne remplacent pas une attestation des bindings effectifs ni la vérification indépendante endpoint → branche Neon.** Aucune nouvelle route de diagnostic ni clé de contrôle dans l'application.

## Preuves exécutées et limites

- Sécurité/authentification/contrats : 51 tests passés, 0 échec, 0 ignoré. Signature réellement générée/vérifiée ; mauvais issuer/audience/azp/nonce/expiration/signature refusés. Aucun transport métier autorisé par l'exception. Production/incohérences refusées avant transport ; entrée SQL refusée avant construction Neon.
- PostgreSQL jetable : 16 tests natifs passés, 0 ignoré (runtime, conversations, documents, commercial), plus 1 test canonique d'authentification passé. Sessions durables, appartenances, expiration, révocation, reprise du consommateur OAuth, refus inter-workspaces et état OAuth consommé une seule fois. Mission immuable, historique >100 messages, concurrence, acquittement perdu, reprise des reçus et contrôle au commit vérifiés par les tests existants.
- TypeScript et lint ciblé : réussis. Build Next 16.3.8 optimisé local, webpack, polices synthétiques hors réseau : réussi.
- Navigateur local : résultat consigné à la fin de ce document. PostgreSQL réel jetable ; identités synthétiques et fournisseurs simulés. Les tests métier existants n'activent pas le profil du déploiement Vercel et **ne certifient pas les accès Google/OpenAI réels ni leurs disponibilités en Recette**.
- Les validations distantes sont celles du HEAD de cette PR corrective, consultables dans ses Checks ; un lancement seul n'est pas un succès.
- Aucun changement de dépendance. Les limites lint/Vitest et les 8 alertes de développement documentées dans #196 restent une référence distincte ; aucune nouvelle campagne générale ni affirmation de succès global.

## État réel et blocages de réception

**NON ATTESTÉ** : l'environnement cloud courant n'a aucun secret, variable runtime, identité sortante ni capacité Vercel/Neon configurés selon son état courant. Aucun accès SQL Neon ni appel Google effectué. Les valeurs effectives, droits et présence des migrations sur le runtime déployé ne sont donc pas certifiés par cette intervention.

Avant les essais réels :

1. L'administrateur confirme dans le seul projet `clara-os-recette` le custom Environment attendu, le mode/binding et la provenance des valeurs effectives. Réutiliser l'action owner/admin et les collecteurs existants de #197 ; leur verdict reste NON ATTESTÉ sans preuve indépendante de branche et de déploiement. Ne jamais introduire de jetons Vercel/Neon dans l'app ni copier de secret dans GitHub/ChatGPT.
2. Vérifier les **noms et scopes**, sans exporter les valeurs : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLARA_AUTH_GOOGLE_REDIRECT_URI`, `CLARA_AUTH_APP_ORIGIN`, les quatre bindings Recette déjà prévus et les métadonnées système Vercel project/target. Google Console : callback exact du déploiement/alias approuvé, uniquement `openid profile email`, utilisateur de test autorisé si consentement en mode test. Origines admises : domaine stable `clara-os-recette.vercel.app` ou URL de déploiement `clara-os-recette-<id>-melodie-digital.vercel.app`. Aucun callback Production réutilisé implicitement.
3. Confirmer par le registre existant l'association **issuer + subject Google vérifiés → utilisateur existant**, ses memberships et ACL client/projet. La session fictive antérieure ne prouve pas l'inscription de l'identité Google réelle. Si association absente : STOP, inscription administrative canonique séparément autorisée ; aucune déduction par email ou attribution owner automatique.
4. Les opérations métier Google/IONOS/Make/Live et OpenAI restent refusées en Recette. **La conversation générative et le téléchargement Drive réels ne sont pas rouverts par cette PR.** Les tests locaux utilisent le simulateur déjà existant ; celui-ci n'est pas un fournisseur déployé. Pour recevoir ces capacités réelles, une décision de sécurité explicite sur les appels autorisés/données de test est indispensable. Ne pas annoncer une réponse générative ou un import Drive réussi lorsque le garde les refuse. Aucun nouvel adaptateur de simulation permanent proposé.

## Schéma, permissions et absence de DDL runtime natif

Aucune migration nouvelle et aucun GRANT exécuté. Préconditions : 001, 002, **003 (transactions de connexion)** ; dépendances 007, 008 puis 012 → 013 → 014 → 015 → 016 → 017 → 018 → 019 → 020 pour le parcours natif existant. Les succès historiques 012–020 ne prouvent pas à eux seuls la présence de 003 ou les droits actuels. 009/010 restent propres à l'archivage canonique, non activé ici.

Requêtes en lecture seule à exécuter ultérieurement dans le contexte autorisé, sans montrer de chaîne de connexion :

```sql
BEGIN READ ONLY;
SELECT current_database()='neondb' AS expected_database,
       current_user='clara_os_recette_limited' AS expected_role,
       NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication) AS limited
FROM pg_roles WHERE rolname=current_user;
SELECT name, to_regclass('public.'||name) IS NOT NULL AS present
FROM unnest(ARRAY['clara_auth_users','clara_auth_workspaces',
 'clara_auth_identities','clara_workspace_memberships','clara_auth_sessions',
 'clara_auth_sign_in_transactions']) AS name;
SELECT p.oid::regprocedure::text AS function,
       has_function_privilege(current_user,p.oid,'EXECUTE') AS executable
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'clara_native_%';
ROLLBACK;
```

Avant un nouvel essai, vérifier CONNECT neondb, USAGE public, SELECT users/identities/workspaces/memberships ; SELECT/INSERT/UPDATE sessions et transactions OAuth. Vérifier les permissions DML des tables natives et EXECUTE des fonctions/dépendances invoquées (dont `clara_native_google_work_command`), ainsi que `requested_scopes` si grants par colonne. Aucun droit CREATE, propriétaire, SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE requis par la connexion utilisateur. Un catalogue absent ou un privilège manquant est un refus, pas une raison d'élargir le rôle.

`instrumentation.ts` n'hydrate aucun runtime global. Les stores historiques conservent du CREATE TABLE hors contexte natif ; les pages sélectionnées passent par `nativePage` / `withNativeScope` et utilisent les fonctions natives et les branches natives des stores avant ces initialisations. Le preload navigateur existant refuse tout chargeur global/DDL ; les tests locaux vérifient ce chemin. Aucun nettoyage destructif ni attribution d'historique ancien.

## Séquence de réception et promotion du même code

1. Revue du HEAD immuable de la PR corrective et des CI ; identifier les dépendances Draft #176/#196/#197. Aucun merge implicite.
2. Obtenir les preuves et décisions ci-dessus. Autorisation distincte pour **un** déploiement volontaire du HEAD approuvé vers le projet indépendant et target `clara-os-recette` ; aucune Preview automatique ni Production. Utiliser le workflow/CLI existant après vérification du checkout/projet/target.
3. Attester ce nouveau déploiement et sa base effective, puis autoriser l'essai navigateur : sans cookie/refus ; Google de l'utilisateur inscrit ; choix explicite workspace/client/projet ; fil neuf ; mission ; Clara avec résultat réel ou refus explicite ; référence documentaire autorisée ; Journal ; rafraîchissement puis reconnexion ; second projet/utilisateur et révocation. Rejouer le protocole HTTP #176 sur **ce SHA**, pas sur une ancienne URL. Pas de communication ni commande externe réelle non autorisée.
4. GO fonctionnel uniquement si le parcours complet demandé est effectivement exécuté et les données retrouvées sans fuite. Si une capacité nécessaire reste refusée ou non testée : NO-GO, même avec CI verte.
5. Avant Production (intervention future) : relever déploiement, SHA et déclencheur Production réels ; comparer la pile validée, les migrations déjà présentes et les seuls paramètres propres aux environnements. Les corrections métier restent le **même code**, sans copie de données, jetons, credentials ni identités de Recette. Les marqueurs Recette doivent être absents en Production ; les ACL, confirmations, approbations et reçus restent actifs.
6. Autoriser séparément sauvegarde/restauration isolée et éventuelles migrations réellement manquantes, dans l'ordre des dépendances ci-dessus. Une branche Neon conservée n'est pas un export externe restauré : documenter rétention/PITR, point de récupération, clés, opérateur, RPO/RTO et essai de restauration. Drainer/remplacer les anciens workers avant toute préparation Google.
7. Seulement sur accord explicite : déploiement du code approuvé ; recette minimale connexion → sélection → mission → chat idempotent → documents autorisés → Journal → reprise et refus inter-projets. Maintenir les capacités non certifiées indisponibles.
8. Retour arrière : revenir au déploiement approuvé précédent, suspendre les mutations/workers, conserver schéma additif, reçus, approbations et historiques. Ne pas supprimer de tables ni restaurer aveuglément une base ancienne après effets externes : risque de doublons, réconciliation préalable des issues incertaines et des reçus. Une restauration exige sa propre autorisation.

## Décision

**NO-GO pour une réception métier réelle et pour Production à ce stade** : identité/permissions/configuration effectives non attestées, aucun essai réel et capacités génératives/documentaires externes toujours fermées. Le correctif technique peut être soumis en Draft ; il n'autorise ni déploiement ni essais réels. La prochaine autorisation doit porter sur un SHA concret et distinguer déploiement Recette, authentification Google et capacités métier externes.

## Réception navigateur locale exécutée

Deux recettes réussies :

- `native-documents-browser.e2e.mjs` : sélection → mission → OAuth documentaire simulé → document/PDF/Brain → Journal/Cockpit → reprise et révocation, 1/1 passé.
- `native-runtime-browser.e2e.mjs` : lien Google visible sans session, refus natif, sélection canonique, mission/chat persistés, cinq langues, reprise et refus inter-utilisateurs/projets, 1/1 passé. Le premier passage de la nouvelle assertion anonyme dépendait de la langue détectée du navigateur ; le test fixe désormais explicitement le cookie FR, comme les autres scénarios. Aucune assertion ni barrière retirée.

Ces recettes emploient le serveur Next compilé, Chromium et PostgreSQL jetable, avec transport Neon adapté au conteneur et réponses fournisseurs synthétiques existantes. Elles ne sont **ni un login Google réel, ni une réception HTTP du déploiement Vercel**. Aucune donnée Neon réelle n'a été créée ni lue.

## Fichiers modifiés (exhaustif)

- `.github/workflows/clara-os-recette-security.yml`
- `.github/workflows/native-authority-validation.yml`
- `src/app/api/auth/google/start/route.ts`
- `src/components/native/NativeScopeSelector.tsx`
- `src/lib/auth/google-sign-in.ts`
- `src/lib/auth/google-sign-in-policy.ts`
- `src/lib/core/store/database.ts`
- `src/lib/recette/database-binding.ts`
- `src/lib/recette/deployment-evidence.ts`
- `src/lib/recette/external-execution-guard.ts`
- `src/tests/google-sign-in-postgres.test.ts`
- `src/tests/recette-google-sign-in.test.ts`
- `src/tests/native-runtime-browser.e2e.mjs`
- `src/tests/recette-network-provider-denials.test.ts`
- `docs/recette/pr-197-operational-promotion.md`
