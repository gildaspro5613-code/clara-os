# Raccord d’archivage Clara Live → Clara OS : contrat proposé

Ce document est une proposition ciblée pour la PR #171. Aucun fichier Clara Live
n’a été modifié, aucun endpoint nouveau n’est annoncé comme existant, et
`/api/documents/live-archives` reste verrouillé. Le raccord existant est conservé.

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
Les noms de champs réellement stockés dans Clara Live doivent être confirmés
dans son dépôt avant toute implémentation. Ils ne sont pas déduits ici.

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

## Fichiers ciblés pour une future intervention autorisée

Les chemins **Live** suivants sont proposés comme nouveaux fichiers ; ils ne
sont pas présentés comme les chemins existants d’un dépôt Live non inspecté :

- `src/app/api/core/projects/[liveProjectId]/archive-authorization/route.ts` : contrôle serveur en lecture seule.
- `src/app/api/core/documents/archive-candidates/route.ts` : découverte autorisée et paginée.
- `src/lib/documents/live-archive-authority.ts` : adaptateur aux registres et ACL Live réels, sans nouvelle architecture métier.
- Tests correspondants : principal invalide, ACL workspace/client/projet, projet actif, mappings absents/contradictoires, grants expirés et non-mutation du projet.
- Middleware produit et repositories projet/client/ACL **existants** : chemins à identifier lors de l’audit autorisé du dépôt Live.

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

Statut actuel du raccord : **BLOCKED**. La production, les données réelles et
Clara Live ne sont pas modifiés.
