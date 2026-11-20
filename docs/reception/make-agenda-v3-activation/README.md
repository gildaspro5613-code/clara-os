# Make Agenda V3 — audit complémentaire du 20 novembre 2026

**NO-GO conservé après audit ; aucun nouveau correctif applicatif.**
La PR #289 existante reste l'unique Draft de préparation. Elle n'est pas fusionnée.
L'absence d'OIDC Make est désormais une limite fournisseur confirmée dans la réponse
du support du 19 novembre rapportée par l'utilisateur, pas une anomalie API à réparer.
L'ancien diagnostic du 16 novembre est conservé plus bas comme historique et ne doit
plus être lu comme une exigence de créer une attestation OIDC Make inexistante.

## État GitHub réellement vérifié avant modification

Branche distante `delivery/clara-os-v1-20261025` :
`fbddadd6b8fd84083910450714e564763f7daaa9`, parent applicatif de cette Draft.

| PR | Statut GitHub | Commit de fusion |
| --- | --- | --- |
| #282 — onboarding natif Make | fusionnée | `728662f9fc74b62047e0f32c800d3369ef1a1616` |
| #283 — diagnostics HTTP | fusionnée | `71c86f4f84c0aa3444344424a6bcf44889f27a15` |
| #286 — contrat cognitif Drive | fusionnée | `2a8490c51a15cbb1f206a87dc302813250ae4eb6` |
| #288 — continuité des dossiers Drive | fusionnée | `4ebb0f6c4d9311732812e79d35dcf49bd92e6bff` |
| #287 — Calendar V3 et correctif de négation | fusionnée après #288 | `fbddadd6b8fd84083910450714e564763f7daaa9` |
| #289 — préparation interrompue | ouverte, Draft, non fusionnée | aucun |

Vérification par les métadonnées PR GitHub et fetch de la branche de livraison.
Ce constat ne constitue pas une nouvelle vérification du déploiement Vercel.

## Audit technique : identité native et autorisation Make distinctes

Les références ci-dessous concernent le code de la base applicative :

- `src/lib/connectors/make/native-calendar-read.ts:15` impose la présence d'un
  googleSubject dans calendarReadBinding ; `authorizeMakeCalendarResource`,
  lignes 48–60, compare le proof natif : userId/owner, issuer Google, subject,
  connexion ACTIVE, workspace, sélection et binding durable de ressource.
- `src/lib/native/google-authority.ts` et la migration historique
  `015_native_google_document_authority.sql` maintiennent l'autorité native et
  son lien issuer/subject/user. `src/lib/auth/google-sign-in.ts` vérifie l'ID token
  RS256, audience, nonce et expiration. **Aucun de ces contrôles ne doit être retiré.**
- Le chemin Make ne tente actuellement aucun endpoint OIDC fournisseur. Il
  vérifie le numéro de connexion mappé dans le blueprint, pas un subject Google
  attesté par Make. L'impossibilité d'OIDC n'est donc pas une erreur HTTP cachée.
- Les refus connus sont l'absence/non-certification de scopes, grants Calendar,
  configurations et calendarReadBinding, fournie par le préflight antérieur.
  `validateMakeCalendarBinding`/`executeMakeCalendarRead` refusent une configuration
  absente ; le gateway refuse un grant absent avant l'exécuteur. Aucune requête
  échouée récente n'est attribuée à un code exact sans son audit ; Neon Production
  n'a pas été interrogé pendant cette reprise.

**Alternative conceptuellement admissible :** l'administrateur applicatif pourrait
accorder une délégation de service Make, distincte de l'identité OAuth Google.
Elle serait liée à l'acteur signé Clara, au propriétaire, workspace/client/projet,
à la connexion Make `7999280`, au calendrier explicitement lié et aux seuls
scénarios `7295113` et `7295055`. Elle conserverait grants révoquables, révisions,
expiration, audit, validation de blueprint LIVE, reçus et interdiction de retry.
Une telle délégation ne certifierait jamais le subject Google utilisé dans Make.
L'administration native (`nativeBuilderAdmin`/`native_admin`) constitue le point
à réutiliser pour les grants ; une adresse ou un label ne crée aucun droit.

## Pourquoi cette alternative ne peut pas être déclarée concluante ici

L'exigence de mission inclut le refus des changements inattendus **de compte**,
pas seulement d'ID de connexion, de scénario ou de calendrier.

La [documentation officielle Connections](https://developers.make.com/api-documentation/api-reference/connections)
expose des métadonnées, scopes et champs tels que uid/connectedSystemId. Elle ne
fournit pas, dans le contrat consulté, de garantie reliant leur changement à toute
substitution du compte Google ou réautorisation. Le
[guide de métadonnées](https://developers.make.com/custom-apps-documentation/best-practices/connections/connection-metadata)
les présente comme informations permettant de distinguer les connexions, pas
comme une identité OIDC certifiée. Aucun signal documenté de révision du compte
n'a été établi par cet audit.

Conséquence technique : une empreinte des métadonnées refuse un changement visible,
mais ne peut distinguer deux états dont les données exposées seraient identiques.
C'est une limite de preuve du mécanisme envisagé, **pas l'affirmation qu'une telle
substitution a eu lieu**, ni que Make conserve toujours ces valeurs lors d'un
changement. Les garanties précises de uid ne sont pas déduites de son nom.
Une expiration courte, le bouton Verify, un nouveau grant ou une réautorisation
ne suffisent pas à démontrer la détection exigée entre deux contrôles.

**Le blocage actuel n'est donc plus « obtenir OIDC dans Make ».** Il faut établir
un signal opérationnel non OIDC, documenté et vérifiable pour cette connexion,
qui invalide l'approbation en cas de changement de compte/réautorisation, ou
faire revoir explicitement le périmètre de confiance accepté pour une connexion
Make opaque. Aucun abaissement de cette exigence n'est implicite dans le GO de
développement isolé. Aucun endpoint de révision supposé ou hash de libellé n'est
implémenté pour donner l'apparence d'une garantie absente.

Cette incertitude empêche de qualifier l'ensemble des contrôles de concluant.
Conformément au garde-fou « en cas de blocage, s'arrêter », la préparation s'arrête
à l'audit. Pas de nouvelle table, migration, commande d'activation ou faux test
d'autorisation administrative valide. Aucune nouvelle PR concurrente à #289.

## Vérifications réelles et simulations : périmètre exact

**Make réel, métadonnées seulement :** environment_get, scenario_get des deux
scénarios, puis module_get du module Calendar dans chacun : cinq lectures au total.
Les deux scénarios sont actifs, on-demand, connexion `7999280` déclarée ok ; les
mappings ciblent le même calendrier fixe et les modules READ attendus. Aucun
scénario, Verify ou appel de données Google n'a été déclenché. Cette lecture ne
revalide pas la session OS courante ni le subject du compte dans Make.

**Tests locaux, réseau bloqué, fournisseurs et SQL simulés :**

```sh
node --import ./src/tests/helpers/make-calendar-offline.mjs --import tsx --test \
 src/tests/make-native-calendar-contract.test.ts \
 src/tests/make-native-calendar-read.test.ts \
 src/tests/make-native-calendar-selection.test.ts \
 src/tests/make-native-calendar-activation-blocked.test.ts \
 src/tests/make-native-drive-input.test.ts \
 src/tests/make-native-selector-contract.test.ts \
 src/tests/native-google-oauth.test.ts \
 src/tests/connector-builder-native-gateway.test.ts \
 src/tests/connector-builder-read-reception.test.ts
```

**57 pass, 0 fail, 0 skipped.** Sont couverts les contrats Calendar, mauvaise
identité native/absence de contexte, grants et inter-scopes, configuration ou
scénario refusé, sorties invalides/hors plage, révocation, Drive, routage natif,
composants communs des autres connecteurs et validateur OAuth natif (RS256,
issuer/subject, nonce, audience, expiration et substitution avant mutation).
Les fixtures de READ valides ne sont pas une certification d'une nouvelle
délégation administrative, d'une identité Make ou d'une réception fournisseur.
Les contrôles actuels des sorties portent sur forme, plage et reçu ; ils ne
constituent pas une attestation indépendante de fraîcheur Google/Make.

TypeScript sans émission passe. ESLint ciblé et git diff --check passent.
Aucune modification applicative par rapport à `fbddadd6`, aucune modification de
Clara Live. Cette reprise ne modifie que ce rapport et la description de #289.
L'exclusion Preview déjà présente sur la branche est conservée. Dépendances locales
existantes réutilisées, pas d'installation propre ou de build général certifié.

## Suite administrative et réception

Pas d'action de configuration ou de grant à lancer actuellement. L'élément utile
pour reprendre est la garantie technique non OIDC décrite ci-dessus : provenance
et sémantique du signal, disponibilité sur `7999280`, invalidation à chaque changement
et droits de lecture nécessaires, sans token ni secret exposé. Si ce contrat est
établi, le futur correctif pourra coupler cette observation à une approbation
administrative révocable et contextualisée. Les autorisations natives Google
resteront séparées ; la fusion contrôlée via CredentialStore préservera Drive,
API et champs existants. Les étapes d'implémentation conditionnelles ci-dessous
ne sont pas considérées réalisées.

Le protocole réel demeure suspendu : après correctif revu et GO séparés, une seule
recherche d'événements `7295113`, puis un seul contrôle de disponibilité `7295055`,
dans la session et le projet approuvés, avec dates absolues, offset et fuseau.
Corréler reçu et audit, arrêter au premier refus, aucun retry/fallback/WRITE/SEND.
La recherche reste partielle ; une disponibilité vide reste non certifiée. Aucune
réception Google Calendar n'est annoncée sans cette preuve réelle autorisée.

**Coût de cette reprise :** 0 appel cognitif payant, 0 scénario exécuté,
0 accès Google Calendar et 0 opération Neon Production. Cinq lectures de
métadonnées Make et consultation de documentation publique ; facturation non
mesurée. Aucun secret lu, exporté ou journalisé, aucune réautorisation ni mutation
Make, aucun Ready/fusion, Preview ou déploiement. NO-GO maintenu.

---

## Historique du 16 novembre — diagnostic initial et plan suspendu

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
