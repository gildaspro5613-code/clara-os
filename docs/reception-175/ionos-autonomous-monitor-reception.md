# IONOS — relève autonome sécurisée (PR #176)

**Base vérifiée : `3a209fc10eab613f304b5997e980d9397b311ad0`. GO pour le mécanisme en isolation ; NO-GO Production et certification IONOS réelle.** Aucun fournisseur réel, boîte réelle, secret Production, déploiement, merge ou Clara Live touché. Branche `fix/os-operational-reception-175`, PR existante conservée Draft. Aucun workflow déclenché manuellement.

## Audit réutilisé et périmètre livré

| Migration | Contrat conservé |
| --- | --- |
| 016 | Propriétaire explicitement attesté, délégations, messages chiffrés, identité `(connexion,dossier,UIDVALIDITY,UID)`, curseur versionné, approbation SMTP exacte |
| 017 | Conversations/reçus durables, non modifiés |
| 018 | Pagination des messages, non modifiée |
| 019–020 | Contacts et Google, non modifiés |
| 021 | Allowlist des cinq adresses, sans provisionnement implicite |
| 022 | Grant de surveillance opt-in, révision/génération et autorité révocable ; réutilisés à chaque commande |
| **023** | Ajout de l'identité SQL de service et du bail/état durable sur les grants 022, fonction de relève étroite ; aucune activation ni donnée réelle créée |

Aucun second connecteur, moteur, journal ou système de missions. La fonction de service réutilise les tables messages/curseurs 016, le CredentialStore AES-GCM existant et le contrôle 022. Les messages restent non rattachés à un contact/projet tant qu'une personne autorisée ne les rattache pas via le parcours existant. Les ACL de consultation propriétaire/délégation/client/projet ne sont pas élargies.

## Identité de service et droits minimaux

L'identité est **le véritable LOGIN PostgreSQL (`session_user`)**, pas un cookie, un utilisateur fictif ou CRON_SECRET. `service_role` sur chaque grant 022 associe explicitement ce LOGIN à cette connexion et à son workspace. Plusieurs rôles peuvent séparer les propriétaires ; un rôle peut couvrir plusieurs boîtes seulement si chaque propriétaire dispose d'un grant explicite pour ce rôle. Le workspace et le propriétaire ne sont jamais déduits de l'adresse.

Un LOGIN sans lien autorisé ne peut accéder à une boîte. Chaque commande refuse les rôles administratifs (SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION), NOLOGIN, membres d'autres rôles, propriétaires/membres du rôle propriétaire de la base ou autorisés à créer dans public. `SET ROLE` ne remplace pas `session_user`. Le service ne reçoit ni DML/SELECT direct sur les tables ni droits d'exécution sur les fonctions d'envoi. La fonction 023 est SECURITY DEFINER avec search_path fixé (`pg_catalog,public,pg_temp`), références de tables qualifiées et EXECUTE révoqué à PUBLIC. Cette encapsulation évite d'accorder au LOGIN le DML que demanderait un appel direct à la fonction SECURITY INVOKER 022 ; elle ne supprime pas le contrôle 022.

Les privilèges à examiner séparément, **jamais exécutés en Production ici**, sont CONNECT à la seule base approuvée, USAGE public et EXECUTE sur `clara_native_mail_monitor_command(TEXT,JSONB)`. Aucun CREATE ni accès administratif ; aucun héritage de rôle. Le propriétaire de migration possède les objets 023. La migration n'effectue aucun CREATE ROLE, GRANT au service, provisionnement de boîte ou de grant actif. Les propriétaires/reviewers canoniques et leurs memberships doivent rester actifs.

## Déclenchement et cadence

Le GET interne `/api/internal/event-jobs-run` existant est déjà prévu chaque minute dans `vercel.json`. Ses traitements antérieurs restent présents ; la relève est appelée ensuite, dans un bloc isolé pour ne pas faire échouer les autres jobs si le service mail est indisponible. Aucun nouvel endpoint public, intervalle en mémoire, fournisseur de cron ou modification des deux crons existants.

Le rôle de CRON_SECRET reste uniquement l'authentification de ce déclencheur. Le worker utilise **exclusivement `CLARA_IONOS_MONITOR_DATABASE_URL`**, sans repli DATABASE_URL/POSTGRES_URL, pour la fonction de service. Une identité SQL non autorisée reste refusée même avec le bon secret cron.

Désactivation cumulée par défaut :

- `CLARA_IONOS_MONITOR_ENABLED` doit être exactement `true` ; sinon aucune requête de service.
- `CLARA_IONOS_NETWORK_ENABLED` demeure nécessaire séparément pour créer le transport réel.
- Le mode Recette déclaré (`CLARA_RECETTE_MODE` ou target `clara-os-recette`) refuse la relève.
- Chaque grant 022 reste désactivé par défaut, sans `service_role` attribué par la migration.
- L'URL de service et la clé de chiffrement existante doivent être fournies par un canal administrateur séparément autorisé ; aucune valeur n'est collectée dans les logs/chat.

`next_poll_at` impose cinq minutes après une tentative/validation, contrôlées par PostgreSQL. Le prochain passage du cron minute réalise la relève éligible. **Ce n'est pas une garantie de ponctualité à la seconde** : disponibilité du scheduler, charge des jobs antérieurs et durée IMAP peuvent retarder l'appel. Au plus cinq connexions par tick, un INBOX par connexion, traitement séquentiel et IMAP borné à 30 secondes par boîte. Aucun nouveau cron Vercel n'est nécessaire ; l'activation réelle de celui existant devra être certifiée sur le futur déploiement autorisé.

## Persistance, concurrence et révocation

- Bail de deux minutes par connexion, jeton aléatoire, génération 022 et révision d'autorité fixées à la prise. Reprise après expiration possible pour ces lectures uniquement ; aucun retry IMAP immédiat dans un tick.
- Activation/révocation/changement du rôle ou de l'attestation incrémente automatiquement la génération et invalide le bail. Réattribution de connexion/workspace/granted_by interdite.
- Vérification après chargement du CredentialStore, avant création du transport. Une révocation en vol ne peut annuler des octets IMAP déjà reçus : **ils sont rejetés à la persistance** si la révocation a été validée avant elle.
- Commit SQL unique recontrôlant grant, LOGIN, owner/identité/membership, connexion, génération, bail, révision de curseur sous verrous. Les révocations concurrentes sont sérialisées avec ce commit ; une simple seconde lecture applicative n'est pas la garantie.
- Insertion idempotente des messages chiffrés + curseur CAS + résultat de relève dans la même transaction. Identifiant calculé et vérifié depuis connexion/INBOX/UIDVALIDITY/UID, jamais depuis le Message-ID de l'expéditeur.
- Conflit avec une relève manuelle ou autre worker : refus du curseur obsolète, aucune écriture partielle. Une relève manuelle existante conserve son protocole.
- Acquittement de commit perdu : rapprochement **en lecture seule** par le jeton du dernier commit ; aucune répétition d'IMAP ni de commit. Si le rapprochement est impossible, compteur `uncertain`, jamais faux succès. Le tick suivant reprend le curseur durable.
- UIDVALIDITY modifié : nouvelle identité et nouveau curseur ; anciens messages conservés, marqués indisponibles selon le contrat existant, pas supprimés.

Le défaut démontré dans l'adaptateur IMAP existant (curseur avancé sur un fetch incomplet) est corrigé : le lot est refusé si des UID sélectionnés manquent, sont dupliqués ou étrangers. Cela empêche une perte silencieuse sur les parcours manuel et automatique.

## Absence d'envoi automatique

`IonosReadTransport` ne possède **aucune méthode send, même à l'exécution**. Le transport SMTP manuel existant hérite de la lecture et garde ses approbations exactes. Le worker utilise uniquement le reader ; il n'importe ni NativeMail, Brain, générateur de réponse ni exécuteur d'action. Les textes entrants sont des données chiffrées, jamais des instructions ou des permissions.

Les spies Nodemailer et transports simulés prouvent zéro SMTP dans les scénarios de monitoring, y compris contenu malveillant, concurrence, révocation et reprise. Cela ne prétend pas bloquer un attaquant qui aurait dérobé le mot de passe IONOS : les credentials du fournisseur peuvent servir aux deux protocoles ; leurs restrictions effectives devront être vérifiées lors de la certification réelle.

## Preuves exécutées

- `npm ci --cache /tmp/clara-os-196-npm-cache` : réussi, lockfile inchangé. Validation finale avec **Next installé = lockfile = 16.3.0**, Node 24.19.0. Une campagne initiale sur le node_modules hérité Next 16.3.8 (51 tests) est distinguée et ne sert pas de preuve reproductible pour #176.
- Campagne finale sur les dépendances verrouillées : **52 tests réussis, 0 échec, 0 ignoré**, commande ci-dessous. PostgreSQL réel jetable, fournisseurs simulés ; pas de services Production.
- TypeScript `tsc --noEmit --pretty false`, lint ciblé et `npm run build` : réussis.
- Migration 023 appliquée/réappliquée sur base jetable après 016–022. Sauvegarde pg_dump puis restauration SQL locale, messages/curseurs/état et privilèges EXECUTE restaurés ; accès direct aux credentials toujours refusé. Aucune restauration ou migration Production.
- Tests spécifiques finaux de sécurité : refus NOLOGIN/héritage de rôle, SET ROLE, mauvais workspace/propriétaire, absence de grant, cookies invalides sur le scheduler ; pas de SMTP. Résultats du dernier replay ciblé consignés dans la PR et le rapport final.

```sh
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test \
 src/tests/native-mail-monitor.test.ts src/tests/native-mail-monitor-postgres.test.ts \
 src/tests/native-mail-postgres.test.ts src/tests/native-mail-triage.test.ts \
 src/tests/ionos-transport.test.ts src/tests/native-commercial-postgres.test.ts \
 src/tests/native-documents-postgres.test.ts src/tests/native-conversation-postgres.test.ts \
 src/tests/live-callback-transport.test.ts src/tests/clara-live-product-auth.test.ts
```

Les tests ont exercé les cinq adresses de la fixture, deux propriétaires et deux LOGIN de service ; les sessions utilisateur révoquées n'empêchent pas la relève autorisée, mais la révocation du propriétaire/grant/connexion bloque les nouvelles validations. Deux relèves concurrentes => un bail effectif. Crash après claim => reprise avec nouveau bail, ancien jeton refusé. Acquittement perdu => pas de doublon. Les tests existants couvrent aussi les ACL inter-clients/projets, la persistance commerciale, les documents, les conversations et les contrats OS↔Live.

Le workflow CI existant est complété, pas dupliqué. Aucun lancement manuel de CI, aucune boucle de recettes CI. Les tests navigateur n'ont pas été rejoués dans ce lot (aucun composant UI modifié) ; aucune validation fournisseur ou UI réelle n'en est déduite. Lint global et Vitest global non lancés ; aucun nouvel échec de ces suites n'est affirmé ou masqué.

## Limites et actions avant certification réelle

1. **NO-GO Production maintenu.** Approuver séparément sauvegarde/migration 023, rôles/privilèges de service, grants de chacun des cinq propriétaires, configuration du scheduler et du réseau. Aucun de ces actes n'a été exécuté.
2. Rôle SQL uniquement dédié, mapping explicite dans 022, review canonique valide ; ne jamais utiliser neondb_owner ni le rôle applicatif large. Vérifier droits effectifs du propriétaire SECURITY DEFINER et absence de CREATE public/héritage/accès DML sur le service. Utiliser une connexion TLS approuvée, conserver la clé de chiffrement historique.
3. Seul **INBOX** est surveillé. Bornes héritées : 25 nouveaux messages par lot, 5 000 UID examinés et 500 messages conservés par connexion. Un dépassement échoue sans avancer le curseur ni effacer l'historique ; une politique de volume/rétention séparément approuvée est nécessaire si ces bornes ne conviennent pas aux boîtes réelles.
4. Certifier IONOS réel, séparément autorisé en lecture seule, sur chacune des cinq boîtes : propriétaire/configuration, TLS, UIDVALIDITY, messages/attachments, volumes, reprise et révocation. Vérifier la périodicité effective, latence et budget serverless. Aucun email n'est à envoyer dans cette certification de relève.
5. Aucun statut UI « temps réel » ajouté : l'overview existant reste explicitement un cache non attesté. Les horodatages/états techniques de dernière relève sont durables sur le grant 022 ; ce sont des métadonnées, pas un second Journal métier ni une attestation de fraîcheur globale.
6. Retour arrière non destructif : désactiver le flag, désactiver/révoquer les grants et invalider les LOGIN sous autorisation administrateur ; attendre la fin des lectures en vol. Leur commit sera refusé après révocation validée. Revenir au code précédent en conservant les colonnes, messages chiffrés et curseurs. Aucune suppression de migration/données nécessaire. Toute restauration doit préserver clés et curseurs et réexaminer les grants/permissions, jamais réattribuer par email.

## Clôture de validation locale

Le dernier replay des deux fichiers `native-mail-monitor*.test.ts` donne **4 tests réussis,
0 échec, 0 ignoré**, sur les dépendances verrouillées. Il couvre le garde SQL final contre
NOLOGIN/héritage/DDL/propriétaire de base, après correction d'un conflit d'alias PL/pgSQL
détecté par ce test. Le contrôle n'a pas été retiré : les refus vérifient explicitement
le statut d'autorisation, et les scénarios positifs exécutent ensuite la relève complète.
La campagne de régression de 52 tests ci-dessus a précédé ce dernier durcissement SQL ;
le replay ciblé final a réexercé migration/réapplication/restauration, concurrence,
révocation, reprise, séparation des cinq boîtes et absence de SMTP avec le garde livré.
Les autres chemins métier n'ont pas changé depuis leur campagne réussie.

TypeScript et lint ciblé ont également été revérifiés après ce replay. Le build réussi
porte sur le même code TypeScript applicatif livré ; les derniers changements concernent
uniquement le SQL de contrôle et ses tests. Ni test navigateur ni certification Neon HTTP
ou IMAP IONOS réelle ne sont annoncés : les requêtes de service ont été exercées sur
PostgreSQL jetable via psql, pas sur le transport Neon réel. Le conteneur PostgreSQL local
est remis à son état arrêté initial après les tests ; les bases et rôles de test propres
à ce lot ont été nettoyés.
