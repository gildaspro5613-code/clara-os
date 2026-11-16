# Make Agenda V3 — préparation interrompue sur la preuve d'identité

Base Production : `fbddadd6b8fd84083910450714e564763f7daaa9`.
Branche : `prep/make-agenda-v3-activation-isolated`.

**BLOQUÉ — aucune activation ni implémentation de mutation livrée.**
La consigne de mission impose : « Si la vérification sécurisée de l'identité Make
est impossible, arrêter la préparation à ce point et documenter le blocage exact. »
Cette condition s'applique aux interfaces disponibles dans cette session.

## Ce qui est établi et ce qui manque

Le préflight fourni par l'utilisateur est repris comme contexte confirmé, sans
nouveau run ni relecture des données Calendar : scénarios actifs `7295113` et
`7295055`, connexion Google Make `7999280`, calendrier correspondant à la sélection
OS et binding natif dans le périmètre utilisateur/client/projet. L'absence ou la
non-certification des scopes, grants et calendarReadBinding vient de ce préflight ;
aucune inspection ou modification de Neon Production n'est effectuée ici.

L'examen du code et des schémas des outils Make établit cette limite :

| Élément | Preuve disponible | Limite |
| --- | --- | --- |
| `scenario_get.connections` | id, app, label, status, modules utilisant la connexion | Aucun issuer/subject Google attesté |
| `scenario_module_get` | référence `__IMTCONN__` et calendrier mappé | Aucun utilisateur OAuth vérifié |
| `connection_get` | état/scopes/id après une demande `connection_create` | Nécessite un requestId d'autorisation ; aucun issuer/subject attesté retourné |
| `custom_app_connection_list` | définition de connexion d'une app custom | Ne renseigne pas l'identité du compte Google standard `7999280` |
| Binding natif et `googleAuthority` | identité Google et droits côté Clara | Ne prouvent pas l'identité portée par la connexion dans Make |

Le `googleSubject` du `calendarReadBinding` actuel est comparé à l'autorité native.
La vérification du blueprint contrôle le numéro de connexion Make. **Ces deux
contrôles ne constituent pas une preuve reliant le sujet OAuth réellement utilisé
par Make à l'identité ou à une délégation de service approuvée.** Renseigner ce
subject en le copiant depuis Clara, un nom de connexion ou un email ne résout pas
le blocage. Une connexion `ok` ne le résout pas non plus.

La recherche d'outils ne révèle pas d'opération permettant d'obtenir une telle
attestation pour la connexion existante, sans ajout/exécution de scénario ni accès
aux credentials fournisseur. Aucune tentative de contournement n'est faite : pas
de nouveau scénario HTTP/userinfo, run, réautorisation Make, nouvelle connexion,
export de token, lecture de secrets ou de données d'exécution. Ce constat est
limité aux moyens disponibles ici ; il ne prétend pas que toute vérification
sécurisée est impossible dans Make.

**Pour lever le blocage :** établir un mécanisme serveur de preuve d'identité lié
à la connexion `7999280` (provenance authentifiée, sujet stable Google, fraîcheur et
lien avec sa révision/réautorisation), puis sa comparaison à l'identité native ou
à une délégation explicite revue. La preuve doit rester côté serveur, sans
transiter par conversation, libellé, champ libre ou secret exporté. La faisabilité
et le contrat de ce mécanisme doivent être revus avant reprise ; aucun endpoint
fournisseur supposé, champ fictif ou attestation simplement déclarative n'est
ajouté pour rendre artificiellement l'activation possible.

## Changements prévus après levée du blocage (non implémentés)

- Réutiliser `CredentialStore` et son format AES-GCM, avec persistance limitée à
  la connexion Make existante dans une commande native authentifiée. Le chemin
  d'onboarding Drive actuel refuse une connexion déjà présente : ne pas le
  détourner pour la remplacer. Aucun nouveau token ou secret soumis par le modèle.
- Lire/verrouiller l'état courant, vérifier identité, propriétaire, sélection du
  calendrier, binding exact, droits de gestion client/projet et non-révocation.
  Revalider les blueprints LIVE sans exécution. Refuser tout conflit concurrent
  ou configuration Calendar existante contradictoire.
- Fusionner seulement les deux scénarios API fixes et le binding vérifié :
  `search-calendar-events` → `7295113`, `check-calendar-availability` → `7295055`.
  Préserver intégralement `find-drive-document`, l'objet API dont le token, les
  autres scénarios et tous les champs inconnus. Un simple get/set non protégé
  contre une mise à jour concurrente n'est pas une fusion contrôlée.
- Préparer les deux entrées READ revues du catalogue existant, avec scopes
  distincts `make:scenario:search-calendar-events` et
  `make:scenario:check-calendar-availability`, sans changer les scopes Drive.
  `native_admin` gère grant/revoke, pas la certification/création du catalogue :
  son provisionnement devra lui aussi être borné et revu, sans accès modèle.
- Attribuer les grants uniquement par l'administration native existante :
  `POST /api/native/connectors` → `nativeBuilderAdmin` → `native_admin`.
  L'acteur vient de la session signée ; les droits owner/admin, client/projet,
  propriétaire cible et révocation restent contrôlés. Aucun INSERT de grant
  direct. Les scopes de connexion ne sont pas des grants métier.
- Prévoir validation avant toute écriture, transaction/contrôle de version et
  reprise : aucun état partiellement configuré ou autorisé, credentials/scopes
  initiaux intacts après échec, audit sans secret. `CredentialStore.set` seul
  ne fournit pas cette atomicité avec scopes, catalogue et grants ; ne pas
  annoncer qu'elle existe sans implémentation et preuve isolée.

Aucun de ces changements d'activation n'est amorcé dans cette Draft. Les tests
ne certifient donc ni une fusion réussie ni le rollback d'une future transaction.
L'état de Google Agenda natif, Drive et la règle d'un seul Make READ par demande
explicite restent ceux de la base Production, sans modification applicative.

## Périmètre livré et preuves isolées

Quatre fichiers seulement :

- `src/tests/make-native-calendar-activation-blocked.test.ts` : cinq tests
  supplémentaires des refus existants, avec un vrai CredentialStore et une
  persistance mémoire, clé et credentials entièrement synthétiques.
- `.github/workflows/make-on-demand-reception.yml` : une ligne pour inclure ce
  fichier dans le workflow Make existant, sans nouveau workflow.
- `vercel.json` : exclusion du déploiement Git sur cette branche avant push.
- Ce rapport. Aucun fichier applicatif, schéma SQL ou package/lockfile modifié.

Les nouveaux tests démontrent : binding manquant refusé ; mauvaise identité
native/propriétaire/subject/workspace refusée ; grant manquant refusé avant lecture
des credentials ; label ou connexion saine insuffisants pour former un binding ;
grant/revoke refusés hors session native authentifiée. Après les échecs concernés,
le ciphertext reste **identique octet pour octet**, aucun save supplémentaire, et
la relecture chiffrée préserve Drive, API et champs inconnus. Aucun contenu de
credential n'est affiché, y compris dans les assertions d'échec.

```sh
node --import ./src/tests/helpers/make-calendar-offline.mjs --import tsx --test \
 src/tests/make-native-calendar-activation-blocked.test.ts \
 src/tests/make-native-calendar-read.test.ts \
 src/tests/make-native-calendar-selection.test.ts \
 src/tests/make-native-drive-input.test.ts \
 src/tests/make-native-selector-contract.test.ts \
 src/tests/connector-builder-native-gateway.test.ts
```

Résultat : **42 tests réussis, 0 échec, 0 ignoré**, dont cinq nouveaux tests.
TypeScript (`tsc --noEmit --pretty false`), ESLint ciblé sur le nouveau fichier et
`git diff --check` passent. Réseau bloqué par le preload existant ; fournisseurs,
autorité SQL et session sont simulés. Les non-régressions exécutées couvrent Drive,
sélection Calendar native/Make, droits inter-scopes, révocation et absence de retry.
Pas de test PostgreSQL ou navigateur réel, ni de certification Production.
Dépendances locales déjà installées réutilisées ; pas d'installation propre
certifiée ni de build ou batterie générale.

**Coût :** aucun appel cognitif payant, aucun scénario exécuté, aucune requête
Google Calendar ni opération Neon. Une lecture `environment_get` pour orienter
l'audit Make ; aucun coût facturé mesuré. Aucun token de production lu/exporté.

## Protocole de réception réelle futur — deux runs maximum

Ce protocole est **suspendu**, non exécutable avant levée du blocage, implémentation
revue puis GO explicites de fusion, de configuration/activation et d'essai réel.

1. Dans le bon projet OS, vérifier la session propriétaire et la sélection exacte
   du calendrier. Faire valider la preuve d'identité Make sans secret affiché,
   le lien natif et les droits client/projet. Obtenir l'approbation native
   explicite pour les deux capacités, sans SQL direct de grant. Confirmer par
   contrôle serveur la préservation de Drive et de l'API après fusion contrôlée.
2. **Un seul Search** : demander les événements via Make sur une courte plage de
   dates absolues avec offset et fuseau IANA explicites, filtre facultatif connu.
   Vérifier le scénario `7295113`, la ressource et l'audit REQUESTED → SUCCEEDED
   ou le refus exact. Une réponse est partielle ; absence de sortie ne signifie
   pas absence d'événement.
3. **Un seul Availability** sur la même plage explicitée à nouveau : vérifier
   `7295055` et son audit, sans autre appel Make ou fallback natif. Des plages
   occupées sont des preuves ; un tableau vide reste une disponibilité non
   confirmée, puisque le scénario n'expose pas les erreurs par calendrier.
4. Au premier refus ou résultat inattendu, arrêter et examiner l'audit sans
   réexécution automatique. Au plus deux runs, aucun WRITE/SEND/DELETE. Les
   chemins Agenda natif et Drive sont protégés par la recette isolée ci-dessus ;
   aucun run Drive supplémentaire n'est requis par ce protocole.

**Statut final attendu : Draft bloquée sur preuve d'identité Make.** Aucun Ready,
fusion, déploiement, Preview, modification Make, grant, configuration de credentials,
activation ou migration/modification Production dans ce travail.
