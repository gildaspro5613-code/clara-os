# Raccord d’archivage Clara Live → Clara OS : contrat proposé

Ce document définit le contrat cible de la PR #171. L'audit désormais réalisé
dans Clara Live a permis d'ajouter deux frontières authentifiées, qui retournent
`503` sans grant tant que l'autorité canonique manque. Aucun contrat positif
n'est disponible et `/api/documents/live-archives` reste verrouillé.
Le raccord existant est conservé. Voir l'actualisation d'audit ci-dessous.

## Preuves disponibles dans Clara OS

| Élément inspecté | Ce qu’il établit | Ce qu’il n’établit pas |
| --- | --- | --- |
| `src/lib/external-capabilities/config.ts` | Authentification du produit `clara-live`, workspace **OS** configuré, capacités explicites, callback HTTPS configuré | Identité de l’utilisateur, appartenance client/projet, statut terminé |
| `docs/clara-live-product-auth.md` | Credential existant coordonné avec `CLARA_OS_PRODUCT_TOKEN` côté Live | Droits client/projet |
| `src/lib/external-capabilities/external-event-handler.ts` | `clara.unified-core.event.v1`, scope product/workspace/user/session, vérification du produit | `project` est un objet libre ; scope et identifiants reçus ne constituent pas des associations canoniques. Le workspace du scope externe n’est pas automatiquement le workspace OS configuré |
| `src/lib/external-capabilities/product-callback.ts` | Callback OS → Live existant sur `/api/core/capabilities/execute`, Bearer et `x-clara-product` | Aucune capacité de vérification documentaire client/projet attestée |
| `src/lib/auth/authenticated-workspace-session.ts`, `sole-authenticated-workspace.ts` | Session opaque persistée, expiration/révocation, membership workspace | Les permissions existantes sont `connections:read/manage`, pas des ACL client/projet |
| `src/lib/auth/verified-identity.ts` | Identité serveur vérifiée via issuer/subject | Correspondance prouvée entre user OS et user Live |
| `src/app/api/contacts/route.ts` | Contact commercial provenant d’un intake ; son `id` est le `submission_id` | Identifiant de client durable partagé par plusieurs prestations |
| `src/lib/documents/live-archive-reference.ts` | Format `clara.live-archive-reference.v1` | Provenance et droits des identifiants, preuve de fin du projet |

La recherche des identifiants de projet/client dans le dépôt ne révèle pas de
registre canonique reliant `workspaceId/clientId/projectId/liveProjectId`.
Un email, un `submissionId`, un objet `project` libre, un nom de projet, un jeton
produit et un `clientId` fourni par le navigateur ne peuvent pas remplacer ce registre.
L'audit Live confirme `Project.id`, `Project.user_id` et `Project.client`
(texte libre), sans mapping canonique OS ni état de fin métier. Les détails
et limites de cette preuve sont consignés dans l'actualisation ci-dessous.

## Données indispensables

Le serveur autoritaire doit pouvoir résoudre, à partir de ses propres données :

1. Le workspace OS enregistré et son association explicite au workspace Live.
2. Le client OS durable et le projet OS, avec leur appartenance mutuelle.
3. Le projet Live correspondant exactement à ce projet OS et à ce client.
4. L’utilisateur OS authentifié et sa correspondance explicite avec un principal
   Live ; aucune égalité d’identifiants ni correspondance par email n’est présumée.
5. Les droits actuels de ce principal sur workspace, client et projet, distincts
   pour lecture et création de référence.
6. Le statut terminé et sa date enregistrée côté Live.
7. Le libellé et l’URL canonique de consultation, soumis aux droits de Live.

Si l’intégration possède déjà ces associations, l’adaptateur les réutilise. Si
elles n’existent pas, leur établissement via une opération serveur authentifiée
et explicitement autorisée est un préalable. Aucun auto-enregistrement à partir
du POST d’archivage, aucun seed de correspondances supposées, aucune seconde
copie des données métiers de Live dans OS.

## Endpoint minimal proposé côté Live

`POST /api/core/projects/{liveProjectId}/archive-authorization`

Cette opération est **en lecture seule**. Elle ne termine pas, n’archive pas,
ne déplace pas et ne supprime pas le projet Live.

Elle réutilise l’authentification serveur du raccord OS ↔ Live et sa destination
HTTPS configurée. La convention d’en-tête exacte est à reprendre du middleware
Live : l’adaptateur OS existant envoie aujourd’hui Bearer et
`x-clara-product: clara-live`. Ne pas changer cette convention pour les autres
callbacks, ne pas transmettre de jeton produit au navigateur.

Requête serveur OS → Live proposée :

```json
{
  "schemaVersion": "clara.live-archive-authorization-request.v1",
  "operation": "archive",
  "osUserId": "user-from-verified-os-session",
  "workspaceId": "registered-os-workspace",
  "clientId": "registered-os-client",
  "projectId": "registered-os-project"
}
```

`osUserId` doit provenir de la session serveur OS résolue et de son identité
vérifiée, jamais du formulaire, du scope d’un événement entrant ou d’un cookie
non vérifié. Live résout le principal correspondant via une association déjà
établie et vérifie les trois périmètres. Les identifiants sélectionnés sont des
critères de recherche, **pas des preuves** : Live doit charger son registre
autoritaire, comparer les associations et appliquer ses ACL. Un jeton produit
seul ne doit pas accorder un accès global aux clients.

Réponse autorisée proposée, définie également dans
`src/lib/documents/live-archive-authorization.ts` :

```json
{
  "schemaVersion": "clara.live-archive-authorization.v1",
  "productId": "clara-live",
  "osUserId": "user-from-verified-os-session",
  "workspaceId": "registered-os-workspace",
  "clientId": "registered-os-client",
  "projectId": "registered-os-project",
  "liveProjectId": "canonical-live-project",
  "status": "completed",
  "completedAt": "2026-10-11T08:00:00.000Z",
  "verifiedAt": "2026-10-11T10:00:00.000Z",
  "expiresAt": "2026-10-11T10:01:00.000Z",
  "displayName": "Projet terminé",
  "sourceUrl": "https://configured-live-origin.example/projects/canonical-live-project",
  "permissions": {
    "workspace": true,
    "client": true,
    "project": true,
    "read": true,
    "archive": true
  }
}
```

Toutes les associations et métadonnées de la réponse sont chargées côté Live,
pas simplement recopiées de la requête. Durée de validité : 60 secondes maximum.
Les droits sont revérifiés à chaque opération ; pas de cache global de grant.
La réponse ne contient ni Stage Model, ni équipement, ni secret. L’URL doit être
construite sur l’origine Live autorisée ; elle ne vaut pas jeton d’accès : Live
continue à vérifier ses droits lors de l’ouverture du projet original.

Résultats attendus : `401` produit invalide ; `403` droits insuffisants ou
association contradictoire ; `404` projet absent/non visible sans divulgation
inter-client ; `409` projet non terminé ; `503` vérification indisponible.
L’adaptateur OS doit refuser timeout, réponse malformée, grant expiré, mismatch
d’identité ou source HTTPS non configurée, sans écrire dans Neon.

## Sélection sans saisie d’identifiants techniques

Le endpoint de vérification suffit à protéger une référence déjà sélectionnée ;
il ne fournit pas à lui seul une interface client/projet.
Proposition complémentaire en lecture seule :
`POST /api/core/documents/archive-candidates` avec l’opération et le principal OS
résolu par le serveur. Live retourne uniquement les clients et projets terminés
autorisés, leurs noms et leurs identifiants canoniques, avec une pagination bornée.
OS présente les noms et transmet les clés sélectionnées au contrôle précédent.
Cette liste ne dispense jamais de revérifier les droits au moment d’écrire ou lire.

L’interface Documents affiche actuellement l’indisponibilité de la consultation
d’archives. Elle ne demande aucun identifiant technique et n’expose aucun lien
Live non autorisé. Il n’existe pas encore de liste d’archives accessible.

## Fichiers ciblés après audit

Chemins **Live** confirmés dans le dépôt FastAPI :

- `backend/live_archive_routes.py` : les deux frontières de lecture sont ajoutées et verrouillées.
- `backend/server.py` : import et montage du routeur uniquement ; modèles et fonctions métier inchangés.
- `backend/tests/test_live_archive_routes.py` : tests exécutés du verrou, des limites et du callback conservé.
- Futur `backend/live_archive_authority.py` : adaptateur aux associations et ACL réelles après leur établissement autorisé.
- Futurs tests d'autorité : principal invalide, ACL workspace/client/projet, projet actif, mappings absents/contradictoires, grants expirés, révocation et non-mutation du projet.
- `backend/unified_core_capability_routes.py`, `backend/clara_os_client.py`, `backend/unified_core_contracts.py` : contrats/auth existants audités, fichiers inchangés.

Fichiers **OS** concernés ensuite :

- `src/lib/documents/live-archive-authorization.ts` : gate pur déjà préparé et testé, actuellement non raccordé.
- Futur `src/lib/documents/live-archive-authority.ts` : appel serveur au raccord existant, borné en taille/temps et sans redirection de credentials.
- `src/app/api/documents/live-archives/route.ts` : session OS réelle, protection same-origin pour les écritures cookie-authentifiées, vérification autoritaire avant store. Le jeton produit entrant seul reste insuffisant.
- `src/lib/documents/live-archive-store.ts` : persistance OS uniquement, conflits immuables et isolation workspace/client ; aucun appel de mutation Live.
- `src/app/documents/page.tsx` : sélecteurs nommés, historique client, pagination et ouverture du lien Live seulement après contrôle courant.

Pour une lecture historique, le gate vérifie les identités et droits ; il ne
requiert pas que le libellé actuel soit identique au libellé archivé. Un client
revenant pour une nouvelle prestation conserve ses références antérieures.
Pour une écriture, les métadonnées sont celles du grant autoritaire.

## Conditions d’activation

Avant de lever le verrou, il faut le vrai contrat Live, les associations
client/projet/principal canoniques et une recette sur un environnement isolé :
création autorisée, relecture après persistance Neon, rejeu identique, conflit,
révocation de droits, accès inter-client/inter-workspace refusé et projet original
strictement conservé. Le test PostgreSQL synthétique présent dans cette PR
valide le store, pas ces autorisations réelles ni la connectivité Neon.

Statut actuel du raccord : **BLOCKED**. La production et les données réelles
ne sont pas modifiées. Les seules modifications Live sont la frontière
verrouillée, son câblage, ses tests et les rapports d'audit.

## Actualisation après audit Clara Live — 11 octobre 2026

Base récente inspectée : `deploy/clara-live-api`, commit
`40622e0eb830a87715431c258c109478ce74dd05`, incluant la PR #292.
La branche par défaut `main` est plus ancienne et ne contient pas les acquis
Stage Model récents ; elle n'est pas la base de l'intervention.
Branche dédiée : `feat/secure-os-live-archive-contract`.
PR Live séparée pour examen :
https://github.com/gildaspro5613-code/clara-live/pull/294 (draft, activation bloquée).
Audit et validation :
[audit Live](https://github.com/gildaspro5613-code/clara-live/blob/feat/secure-os-live-archive-contract/docs/live-archive-authorization-audit.md),
[rapport Live](https://github.com/gildaspro5613-code/clara-live/blob/feat/secure-os-live-archive-contract/docs/live-archive-validation.md).

Les chemins Live sont **Python/FastAPI**, pas les chemins Next.js hypothétiques
de la proposition initiale :

- `backend/server.py` : modèle `Project`, propriété `user_id`, `client` texte
  libre ; aucune fin métier, aucune association canonique client/projet OS.
- `backend/unified_core_capability_routes.py` : véritable callback entrant,
  jeton produit existant `CLARA_OS_PRODUCT_TOKEN`, en-têtes Bearer et
  `x-clara-product: clara-live`. Ce fichier reste inchangé.
- `backend/server.py`, `_dispatch_live_chat_to_core` : les IDs du scope sont
  des IDs Live ; `workspaceId` représente le projet Live ou `user:{user_id}`.
  Aucun passage automatique à un user/workspace OS n'est autorisé.
- Nouveau `backend/live_archive_routes.py` : les deux POST proposés sont
  authentifiés avec le même mécanisme produit, JSON borné à 16 KiB/5 s,
  validation stricte ; réponse `503 LIVE_ARCHIVE_AUTHORITY_UNAVAILABLE`, sans
  lookup ni mutation. Le routeur ne dispose d'aucun handle de base/storage.
- Nouveau `backend/tests/test_live_archive_routes.py` : identité produit,
  refus de grants basés sur les sélecteurs, limites et callback inchangé.
- `docs/live-archive-authorization-audit.md` et `docs/live-archive-validation.md`
  côté Live : audit complet et vérifications réellement exécutées.

Le corps de `archive-authorization` correspond à la requête proposée plus haut.
Le corps exact de `archive-candidates` est désormais :

```json
{
  "schemaVersion": "clara.live-archive-candidates-request.v1",
  "operation": "read",
  "osUserId": "server-resolved-os-user",
  "workspaceId": "canonical-os-workspace",
  "limit": 50,
  "cursor": null
}
```

`operation` accepte `read` ou `archive`, `limit` un entier de 1 à 100.
Cette route ne retourne aucune liste aujourd'hui. Le schéma de grant positif
`clara.live-archive-authorization.v1` reste une cible, pas une autorité active.

Les prérequis confirmés manquants sont : registre canonique client/projet OS,
associations explicites aux projets Live, liaison de principals des deux
produits, ACL actuelles et preuve métier du projet terminé. Le statut terminé
des jobs/imports/analyses n'est pas une preuve de fin de prestation.

Établissement proposé : opérations administratives authentifiées et auditées
pour les liens workspace/client/projet ; liaison des principals par preuve des
sessions existantes, challenge unique, consentement et révocation. Aucun lien
par nom/email et aucune nouvelle identité parallèle. La source du registre
client/projet et du lifecycle métier doit être définie et autorisée séparément
avant implémentation ; ne pas modifier les modèles métier pour contourner ce
préalable. Aucun mapping réel, seed ni registre supposé n'a été créé.

Prochaine intervention ciblée Live : `backend/live_archive_authority.py` puis
les handlers de `backend/live_archive_routes.py`, après mise à disposition des
associations et de la preuve métier réelles. L'adaptateur OS et la levée du
verrou restent conditionnés à la recette positive et négative de cette autorité.

Vérifications de cette intervention : 34 tests frontière/callback/invariance PASS ;
sélection backend 304 PASS/9 échecs reproduits sur base ; tests HTTP
DMX/Sound/Production 40 PASS/20 échecs identiques sur base ; frontend
170 PASS/1 échec identique sur base ; build Live PASS ; navigateur Sound/Video
PASS ; smoke Stage 2D/WebGL 3D/contrôles/plein écran synthétique PASS.
Le hardware, les assets privés et le raccord réseau réel ne sont pas validés.
Dans OS : 29 tests documentaires/store PostgreSQL isolé PASS et TypeScript PASS.
La phase 4 est **non activée**, et aucun nouveau build OS n'est revendiqué pour
ces changements exclusivement documentaires.


## Fondations canoniques préparées (2026-10-11)

Le raccord sur les nouvelles branches dédiées est décrit dans
[canonical-registry-implementation.md](canonical-registry-implementation.md).
Les descriptions historiques de verrou ci-dessus correspondent aux branches
#171/#294, conservées. Aucun contrat n'est activé en production.

Les deux requêtes Live v1 acceptent désormais `authorizationTicket` : un nonce
serveur OS scoped de 45 secondes, dont Live redemande la session et les ACL.
Sans ce ticket, le produit seul n'obtient aucun grant. Les grants de lecture
peuvent retourner `status:"active"`, `completedAt:null` et `archive:false` pour
préserver l'histoire administrative d'un projet rouvert ; l'archivage exige
`completed` attesté. Le grant comprend la révision du registre de clôture.

La découverte minimale Live concerne un seul projet sélectionné par ticket,
avec `nextCursor:null`, et ne renvoie que les projets terminés. OS fournit
séparément les pages de clients/projets autorisés (`list`/`listProjects`, noms
canoniques, curseur d'identifiant, au plus 100). Il ne s'agit pas d'une
énumération workspace obtenue avec le jeton produit seul.

Le cycle de clôture additif, indépendant de Project, a été explicitement
approuvé : seules les transitions du propriétaire authentifié et autorisé
produisent une attestation ; la réouverture invalide les nouveaux grants.

### Sérialisation de la clôture et de la persistance

Une autorisation de lecture seule n'autorise plus une écriture locale. OS appelle
`POST /api/core/projects/{liveProjectId}/archive-commit` avec le ticket serveur et
la révision de clôture vérifiée. Live réserve cette révision par CAS sur le même
document MongoDB que la réouverture, avec écriture journalisée `majority` et
lecture sur le primaire. La transition métier refuse une réservation en cours.

Live appelle ensuite le produit OS existant (`/api/core/canonical/links`, action
`archiveCommit`). La migration additive `010_canonical_archive_serialization.sql`
réunit dans une transaction PostgreSQL le contrôle actualisé des droits OS,
l'archive administrative, la consommation du ticket et le reçu lié au projet et
à la révision. L'ancien commit local est interdit. Deux appels concurrents ne
peuvent consommer le même ticket deux fois.

Si la réouverture gagne le CAS, aucune persistance n'est appelée. Si la réservation
gagne, une réouverture ne peut être validée avant la persistance ou l'annulation
confirmée. Après timeout, `archiveCancel` utilise le même verrou transactionnel
que le commit : son reçu durable interdit toute écriture retardée. Les reçus
sont immuables et ne sont pas supprimés automatiquement à expiration du ticket.

Une panne qui empêche de connaître les deux résultats conserve la réservation,
sans expiration automatique. Le propriétaire authentifié peut appeler
`POST /api/canonical/projects/{liveProjectId}/archive-reconciliation` avec
`{"approve":true}`. Le hash durable permet uniquement l'action OS
`archiveCancelHash`, jamais un commit : récupération possible après perte de la
requête initiale ou redémarrage. Un reçu `committed` est conservé ; un reçu
`cancelled` clôt définitivement l'autorisation. Sans reçu vérifié, aucune
réouverture n'est autorisée. Les données techniques Project restent intactes.

Activation ultérieure : conserver l'archivage désactivé jusqu'à installation des
deux versions compatibles et de la migration 010 par une opération séparément
autorisée. Aucun rollback ne doit restaurer un chemin de réouverture qui ignore
les réservations ; arrêter les nouvelles archives et réconcilier les opérations
pendantes en conservant les reçus et les protections de clôture.
