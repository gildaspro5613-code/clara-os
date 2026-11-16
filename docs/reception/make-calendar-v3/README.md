# Make V3 — Google Calendar READ (Draft)

Base : `2a8490c5` (PR #286 fusionnée), branche cible
`delivery/clara-os-v1-20261025`. Validation isolée uniquement ; aucun GO Production.

## Audit en lecture seule

Consultation des métadonnées Make (environnement, deux scénarios, configurations
des modules et spécifications des modules), sans exécution ni modification.

| Capacité ajoutée | Scénario fixe / clé Clara | Entrées Make | Sorties Make |
| --- | --- | --- | --- |
| `make.calendar.availability.read` | `7295055` / `check-calendar-availability` | workspaceId, start, end obligatoires ; missionId facultatif | status, provider, busyRanges, start, end |
| `make.calendar.events.search` | `7295113` / `search-calendar-events` | mêmes champs ; query facultatif | status, provider, eventId, eventTitle, start, end, location, htmlLink |

Les deux scénarios sont actifs, on-demand, sans exécution incomplète lors de
l'audit. Chaîne exacte : StartSubscenario v2 → module Google Calendar v5 →
ReturnData v2. Connexion Make Google `7999280`, déclarée `ok` ; même calendrier
Google de groupe fixe dans les deux modules. Aucun secret lu ou enregistré.
Le nom de connexion n'est pas une preuve d'identité OAuth ou d'autorité métier.

Availability utilise `getFreeBusyInformation`, timeMin/start, timeMax/end et un
seul item calendrier. ReturnData expose `{{2.result}}` comme busyRanges.
Search utilise `searchEvents`, q/query, singleEvents=true, orderBy=startTime,
eventTypes=default et limit=10. Il n'y a **aucun agrégateur** avant ReturnData.

Deux limites réelles du contrat restent conservées, sans modifier Make :

- Search renvoie un événement sans reçu d'exhaustivité : `partial:true`. Une
  sortie vide/absente est non confirmée, jamais « aucun événement ».
- Availability ne transmet pas les erreurs FreeBusy par calendrier. Des plages
  occupées valides peuvent être présentées ; un tableau vide donne
  `availability:unconfirmed`, jamais une certification de créneau libre.
  Une certification du libre/exhaustivité nécessiterait un contrat fournisseur
  plus riche, chantier hors de cette PR et soumis à un GO distinct.

## Comportement et sécurité

Réutilisation du catalogue natif, de la découverte des grants existants, du
sélecteur cognitif, du tool bridge/gateway, de l'adaptateur Make, du CredentialStore
et de l'audit REQUESTED/SUCCEEDED/FAILED/DENIED. Aucun nouveau moteur ou adapter.

Le contrat cognitif est transmis depuis les définitions de capacités. Dates
RFC3339 avec offset explicite cohérent avec un fuseau IANA obligatoire, fin
exclusive après début, plage limitée à 31 jours. Dates impossibles, heure locale
sans offset, trous DST et fuseaux inconnus sont refusés. Query facultatif sur
Search uniquement, texte ≤200 caractères ; absent/null/vide signifie pas de
filtre. Toute autre clé (identité, calendrier, mission, scénario, token…) est
refusée. Clara valide le fuseau et le garde pour la présentation ; Make reçoit
seulement workspaceId canonique, start, end et query éventuel.

Les demandes Calendar ordinaires gardent le connecteur Google Calendar natif
existant et n'entraînent aucun appel cognitif Make. Pour utiliser Make, demander
explicitement une lecture « via Make » / « avec Make ». Une telle demande ne
peut pas sélectionner Drive à la place de Calendar. Le parcours natif Calendar
est alors exclu, y compris en cas d'échec Make ; aucun fallback automatique.
Un verrou en mémoire de requête empêche les appels Make Calendar en double ou
après la sélection native. Ce verrou n'accorde aucune autorité et n'est pas
persisté. Les anciens parcours hors contexte natif ne sont pas modifiés.

Chaque lecture exige simultanément :

1. Session native valide et grant READ exact utilisateur/workspace/client/projet,
   catalogué, non révoqué, sur la connexion Make unique.
2. Configuration backend revue `calendarReadBinding` dans les credentials chiffrés :
   googleConnectionId, googleSubject, calendarId explicite (jamais primary),
   calendarName de référence et makeConnectionId. Aucune de ces valeurs ne vient
   du modèle. Le label sert seulement à refuser une demande nommant un autre
   calendrier, jamais à octroyer un accès.
3. Connexion et calendrier déjà sélectionnés dans la session OS ; identité Google
   native correspondante (issuer, subject, owner/user, statut et workspace) et
   binding durable du calendrier dans le client/projet exact. Vérifications par
   les commandes natives existantes, sans requête Google supplémentaire.
4. Trois GET Make sur le scénario fixe : détails, interface et blueprint LIVE
   (`draft=false`). Modules, versions, absence de routes/filtres/error handlers,
   entrées/sorties, connexion, calendrier et mappings doivent correspondre
   exactement au contrat revu. Un changement refuse le lancement.
5. Nouvelle vérification du binding avant le POST ; après réponse, revalidation
   du binding et du grant ; hook natif de revalidation avant commit de conversation.
   Révocation ou changement de révision empêche la restitution.

Aucune preuve de correspondance OAuth de la connexion Google **dans Make** n'a
été extraite lors de l'audit : il n'a pas lu ses credentials. La configuration
backend doit être revue par l'administrateur comme délégation de service vers
le calendrier exact. La preuve métier reste l'identité et le binding natifs,
plus le grant spécifique ; une simple connexion Make saine ne suffit pas.

Les réponses sont bornées, validées et marquées comme données non fiables ;
les titres ne deviennent jamais des instructions ou des permissions. Dates ou
fuseau invalides, binding absent/inaccessible, blueprint changé et échec fournisseur
ont des codes fixes audités et des messages explicites pour le compositeur de
réponse. Aucun corps d'erreur fournisseur, SQL, subject ou secret n'est exposé.
Aucune tentative automatique, écriture Calendar, action SEND ou scénario libre.

## Fichiers modifiés (périmètre exact)

| Fichiers | Rôle |
| --- | --- |
| `src/lib/connectors/make/definition.ts`, `src/lib/capabilities/make-scenario/capability.ts`, `src/lib/capabilities/capability-registry.ts` | Deux déclarations READ et contrats cognitifs |
| `src/lib/connectors/make/types.ts` | Binding backend explicite dans le CredentialStore existant |
| `src/lib/connectors/make/native-calendar-read-contract.ts` | Validation entrée/sortie, routage explicite et messages sûrs |
| `src/lib/connectors/make/native-calendar-scenario.ts` | Vérification du blueprint LIVE approuvé |
| `src/lib/connectors/make/native-calendar-read.ts` | Autorité ressource native et exécution via l'adaptateur existant |
| `src/lib/connectors/core/native-connector-builder-selection.ts`, `src/lib/connectors/core/native-connector-builder-runtime.ts`, `src/lib/connectors/core/native-connector-read-gateway.ts` | Raccord aux contrats, à l'exécuteur natif et aux codes d'audit |
| `src/lib/brain/brain-source-registry.ts` | Priorité native par défaut, exclusion des doublons et restitution des refus |
| `src/tests/make-native-calendar-contract.test.ts`, `src/tests/make-native-calendar-read.test.ts`, `src/tests/make-native-calendar-selection.test.ts` | Tests des contrats, refus, sélection et parcours authentifié simulé |
| `src/tests/helpers/make-calendar-fixture.ts`, `src/tests/helpers/make-calendar-offline.mjs` | Fixtures synthétiques et blocage réseau reproductible |
| `.github/workflows/make-on-demand-reception.yml` | Réutilisation de la CI Make existante pour les tests Calendar et non-régressions Drive, sans nouveau workflow |
| `vercel.json` | Déploiement Git désactivé sur `fix/make-calendar-read-v3` avant push |
| `docs/reception/make-calendar-v3/README.md` | Ce rapport |

Aucun changement du validateur Drive, de sa vérification de scénario, de ses
credentials d'onboarding, de ses tests #286 ou de sa branche d'exécution. La
sélection reste identique pour les demandes Drive ; les contrats Drive ajoutés
par #286 sont conservés. Aucun fichier Clara Live, migration, route de gestion,
schéma de persistance ou fichier package/lockfile modifié.

## Validation et coût

Commande locale principale (réseau interdit ; autorité SQL et fournisseurs simulés) :

```sh
node --import ./src/tests/helpers/make-calendar-offline.mjs --import tsx --test \
 src/tests/make-native-calendar-contract.test.ts \
 src/tests/make-native-calendar-read.test.ts \
 src/tests/make-native-calendar-selection.test.ts \
 src/tests/make-native-drive-input.test.ts \
 src/tests/make-native-selector-contract.test.ts \
 src/tests/make-native-api-onboarding.test.ts \
 src/tests/make-native-read-handoff.test.ts \
 src/tests/connector-builder-native-selection.test.ts \
 src/tests/connector-builder-native-gateway.test.ts \
 src/tests/connector-builder-read-reception.test.ts \
 src/tests/connector-builder-database-binding.test.ts \
 src/tests/make-connector.test.ts \
 src/tests/make-on-demand-contract.test.ts \
 src/tests/operational-recovery.test.ts \
 src/tests/google-native-hub.test.ts
```

**100 pass, 0 fail, 0 skipped**, dont 18 nouveaux tests Calendar. Complément
correspondant aux autres tests du workflow Make existant :

```sh
node --import ./src/tests/helpers/make-calendar-offline.mjs --import tsx --test \
 src/tests/make-native-admin-command.test.ts \
 src/tests/make-scenario-catalog-inventory.test.ts
```

**4 pass, 0 fail, 0 skipped**. Total : **104 tests réussis**.
TypeScript (`tsc --noEmit --pretty false`), ESLint ciblé sur tous les fichiers
TS/JS ajoutés/modifiés et `git diff --check` passent. Commande de lint exacte
également intégrée au workflow Make existant.

Preuves : contrats valides/invalides/facultatifs, DST, tentative WRITE ou scénario
arbitraire, changement de calendrier/connexion, inter-utilisateurs et inter-scopes,
révocation avant/après fournisseur et avant restitution finale, panne d'audit,
erreurs fournisseur, sorties vides, limites d'exhaustivité et zéro fallback natif.
Le test authentifié traverse le vrai contexte natif, la sélection (sortie cognitive
simulée), le vrai tool/gateway, les commandes d'autorité SQL simulées et les helpers
Calendar. Un autre test traverse l'adaptateur et le client Make API réels avec
transport injecté ; ils effectuent exactement un POST simulé sur chaque ID fixe.

Limites : aucun test navigateur ou PostgreSQL réel, aucune génération OpenAI ou
requête Google Calendar réelle. Dépendances déjà présentes réutilisées (lien local
vers le checkout voisin) ; pas de nouvelle installation propre certifiée. Le
lockfile n'est pas retouché. Pas de build général. Ces tests ne certifient ni les
grants Production ni la forme réelle des réponses d'exécution fournisseur.

Coût des essais : **0 appel cognitif payant, 0 scénario Make lancé**, 0 appel
Google Calendar et 0 opération Neon Production. Huit lectures de métadonnées Make
ont servi à l'audit ; aucun coût facturé n'est mesuré. La CI consomme seulement
son temps d'exécution habituel, sans secrets fournisseur. Après un futur GO,
chaque demande explicite Make implique au plus une sélection cognitive, trois
GET de vérification et un run, sans polling ni retry. Aucun run de réception réel
n'est autorisé par cette PR.

## Prérequis et réception minimale après GO séparé

État actuel : **implémenté et validé en isolation ; non activé en Production**.
La présence des deux scénarios actifs n'installe aucun grant automatiquement.

Avant tout essai réel, après revue puis GO explicite :

1. Faire vérifier l'identité native propriétaire et le calendrier de groupe exact,
   son binding durable au bon client/projet et sa sélection dans Clara OS. Revoir
   la connexion Google de service dans Make sans confondre un label avec une
   identité ; le dossier de délégation doit autoriser le calendrier cible.
2. Préparer les entrées des deux READ dans le catalogue existant avec leurs scopes
   distincts `make:scenario:check-calendar-availability` et
   `make:scenario:search-calendar-events`, puis grants utilisateur/client/projet
   via l'administration native existante. Aucun SQL exécuté ou migration fourni
   par cette PR. Configuration et activation Production requièrent leur propre GO.
3. Fusionner **sans remplacer** les credentials existants : conserver intégralement
   `find-drive-document`, ajouter uniquement les deux scénarios API fixes et le
   `calendarReadBinding` revu, étendre les scopes correspondants. Le flux actuel
   d'onboarding Drive n'est pas un installateur Calendar et ne doit pas être
   relancé pour remplacer ces credentials. Aucun nouvel écran de configuration
   ni auto-provisionnement n'est ajouté dans cette PR.
4. Après GO de livraison et de recette réelle : dans une conversation authentifiée
   sur ce projet, demander une seule fois par capacité, avec calendrier déjà
   sélectionné, dates absolues et fuseau explicite. Exemples à adapter au créneau
   autorisé : « Cherche les événements RTSE dans le calendrier sélectionné via
   Make, du 17 novembre 2026 à 09:00 +01:00 au 17 novembre 2026 à 12:00 +01:00,
   Europe/Paris » puis « Vérifie la disponibilité du calendrier sélectionné via
   Make sur cette même plage explicite ». Reformuler les dates intégralement
   si le modèle demande une précision ; ne pas déclencher de retry automatique.
5. Corréler chaque appel avec l'audit natif exact et un seul run du scénario prévu
   dans Make ; vérifier la ressource, l'identité et le contenu de réponse.
   Attendre une réponse naturellement formulée mentionnant les limites (recherche
   partielle ; tableau busy vide non certifiant le libre). Comparer une demande
   Calendar ordinaire avec le parcours natif, sans second appel Make.

Aucun passage Ready, fusion, Preview Vercel, déploiement, modification Make,
migration/configuration Neon Production ou modification Clara Live dans ce travail.
