# Registre canonique, identité et archives — rapport de revue

Statut du code : READY FOR REVIEW. Activation réelle : BLOCKED jusqu'aux opérations administratives ci-dessous. Aucun merge, déploiement, Preview Vercel, changement de configuration ou migration de production n'a été exécuté.

## Architecture et audit préalable

Audit réalisé avant les nouveaux ajouts sur OS `00b6324` (PR #171) et Live `d2e9ede` (PR #294, base `deploy/clara-live-api`, qui contient les acquis récents). Les bases et branches de ces PR sont conservées ; les fondations sont isolées dans `feat/canonical-registry-v1` et `feat/canonical-links-v1`.

OS possède déjà `clara_auth_users`, `clara_auth_workspaces`, `clara_workspace_memberships`, `clara_auth_sessions` (empreinte SHA-256, expiration/révocation) et `clara_auth_identities` (issuer/subject vérifiés). Le registre ne crée ni compte, ni session, ni adhésion. Les contacts issus de l'intake ne sont pas une autorité de clientèle et ne sont pas importés. Le workspace historique `default` est refusé.

Live possède `Project.id` et `Project.user_id`, des routes CRUD vérifiant ces deux champs, et `current_user` réutilisant les sessions existantes ou JWT. `Project.client` est un texte libre, sans identifiant commercial canonique ; aucune clôture métier probante n'existait. L'événement `clara.unified-core.event.v1` désigne les identifiants Live, sans constituer une correspondance OS. Les callbacks/capabilities existants authentifient un produit, pas les droits d'un utilisateur OS sur un client. Aucun nom ni email n'est utilisé pour établir un lien.

OS devient l'autorité des clients, projets administratifs, ACL et historique d'archives. Live reste l'autorité du propriétaire, des projets techniques et du cycle de clôture attesté. Les seuls liens sont explicites, persistants, uniques et révocables ; aucun contenu technique n'est copié.

## Modèles ajoutés

Migration 008, additive : `clara_registry_clients`, `clara_registry_projects`, `clara_registry_client_access`, `clara_registry_project_access`, `clara_registry_identity_links`, `clara_registry_project_links`, `clara_registry_link_challenges`, `clara_registry_audit`. Un client peut avoir plusieurs projets. Les uniques empêchent de déplacer silencieusement un projet Live vers un autre projet/client ou de partager la même identité Live entre deux comptes OS dans un workspace.

Migration 009 : `clara_registry_authority_tickets` et provisionnement explicite de `clara_live_archive_references`, compatible avec le format existant. Les références sont immuables et rejouables ; le statut Live courant est séparé de l'historique administratif. Aucun runtime DDL n'est utilisé par le nouveau raccord.

Collections Live : `canonical_link_proofs` et `canonical_business_lifecycle`, indépendantes de `projects`. La clé Mongo `_id` protège l'unicité ; chaque consentement ou transition et son audit sont écrits atomiquement dans un document. Aucun index, backfill ou modèle technique existant n'est modifié.

## Identité et consentement

1. Une session OS déjà vérifiée commence une demande liée à son utilisateur, workspace, session et éventuellement client/projet. Nonce aléatoire 256 bits, expiration 5 minutes ; seule son empreinte est persistée.
2. L'utilisateur Live authentifié approuve explicitement ce nonce et, pour un projet, sélectionne un projet dont il est effectivement propriétaire. Le backend inspecte le scope OS puis persiste la preuve et propose celle-ci à OS.
3. La même session OS confirme explicitement. OS récupère une preuve fraîche côté serveur auprès de Live et vérifie empreinte, scope, propriétaire et expiration avant la transaction SQL d'activation/audit.

Le jeton produit peut inspecter/proposer seulement avec le nonce imprévisible ; il ne peut approuver ni attribuer un compte/projet. HTTP borné, délai total 5 secondes pour les transports, pas de redirection ni exposition de credentials. Les écritures OS vérifient l'Origin avec le mécanisme existant ; les écritures Live utilisant un cookie appliquent la liste CORS existante même si un Bearer est fourni en parallèle.

La révocation OS d'identité révoque également ses liens de projets et neutralise ses challenges. Recréer le lien d'identité ne réactive pas ces projets : un nouveau consentement est nécessaire. La révocation Live de preuve est vérifiée lors des grants futurs, même après expiration initiale de la preuve ; l'expiration de 5 minutes concerne l'établissement, pas une autorisation perpétuelle.

Périmètre minimal : l'utilisateur OS actif doit être lié au propriétaire Live du projet. Aucune délégation non présente dans Live n'est inventée ; un collaborateur OS ayant une ACL mais sans ce lien reçoit un refus.

## Cycle métier approuvé

Décision validée explicitement par l'utilisateur : registre de clôture séparé du modèle Project. Sans attestation, état effectif actif et non archivable. Clôture/réouverture par le propriétaire authentifié uniquement, avec approbation, requestId, révision attendue, horodatage et audit. Écriture atomique avec contrôle de révision ; conflit concurrent 409. Réouverture : nouveaux grants archive refusés ; lecture autorisée de l'histoire OS avec statut Live actif, après vérification des droits.

## Contrats et endpoints

OS :

- `GET /api/canonical/registry` : workspaces issus des sessions/adhésions vérifiées.
- `POST /api/canonical/registry` : `list`, `listProjects`, `createClient`, `createProject`, `grantClient`, `grantProject`, révocations, demandes de liaison et `confirmLink`. Pagination par identifiant, 1–100 éléments ; noms commerciaux affichés.
- `POST /api/core/canonical/links` : produit existant + capacité explicite `canonical-links:v1`; opérations `inspect`, `propose`, `redeem`. Workspace pris dans la configuration du produit, jamais accepté du caller.
- `GET /api/documents/live-archives?workspaceId=…&clientId=…&projectId=…` : session OS, preuve Live fraîche et ACL actuelles ; référence historique et statut actualisé.
- `POST /api/documents/live-archives` : uniquement ces trois sélecteurs ; métadonnées et URL proviennent du serveur. Ticket 256 bits, session/scope/opération liés, TTL 45 secondes ; Live redemande les droits OS et vérifie consentement/propriétaire/clôture. Transaction de persistance recontrôlant les droits OS et audit, ticket consommé à l'écriture.

Live :

- `POST /api/canonical/link-proofs` : consentement authentifié, `challenge`, `approve:true`, `liveProjectId` explicite pour une liaison projet.
- `DELETE /api/canonical/link-proofs/{proofId}` : révocation par son utilisateur Live.
- `POST /api/core/canonical/link-proofs/verify` : transport produit, proofId/empreinte, preuve fraîche sans donnée technique.
- `GET|POST /api/canonical/projects/{id}/lifecycle` : lecture du propriétaire, transition explicite avec `state`, `expectedRevision`, `requestId`, `approve:true`.
- `POST /api/core/projects/{id}/archive-authorization` : contrat v1 existant enrichi d'`authorizationTicket`; absence de ticket interdit toute réponse positive. Lecture active permise pour l'histoire ; archive exige completed attesté. Grant ≤30 secondes et ≤expiration du ticket.
- `POST /api/core/documents/archive-candidates` : même ticket scoped, maximum un projet explicitement sélectionné, noms canoniques, seulement completed ; `nextCursor:null`. La découverte de plusieurs clients/projets est paginée dans le registre OS, plutôt que par un jeton produit global. Un cursor est refusé dans ce périmètre minimal.

URL originale autorisée : `https://live.melodie.digital/projects/{id encodé}`, toujours soumise à l'authentification et à la propriété Live habituelles. L'interface retire la référence et le lien si la nouvelle vérification échoue ; ce lien n'est pas un accès public.

## Fichiers ciblés et modifiés

OS : migrations 008/009 ; `src/lib/canonical/{registry,http,live-bridge,archive-authority,archive-service}.ts` ; `src/app/api/canonical/registry/route.ts` ; `src/app/api/core/canonical/links/route.ts` ; `src/app/api/documents/live-archives/route.ts` ; `src/lib/documents/live-archive-authorization.ts` ; `src/components/documents/CanonicalArchivesPanel.tsx` ; import/montage isolé dans `src/app/documents/page.tsx` ; tests canonical registry/service/browser et actualisation du test archive existant ; rapports implementation/validation/vercel-gate et contrat d'archivage.

Live : `backend/canonical_bridge.py`, `canonical_authority_routes.py`, `canonical_archive_authority.py`, branchement d'autorité dans `live_archive_routes.py`, imports/montages uniquement dans `server.py`, `backend/tests/test_canonical_authority.py`, rapport de fondations. Aucun changement dans Stage, géométrie, équipements, pages métier, bibliothèque, GDTF/MVR, DMX, connecteurs, navigation/authentification existantes ou fichiers Unified Core.

## Opérations administratives requises, sans activation implicite

Après revue et autorisation de rollout uniquement : appliquer 008 puis 009 sur Neon, avec sauvegarde ; arrêter si l'index unique révèle une contradiction existante, sans supprimer les lignes. Vérifier les droits du rôle applicatif : fonctions SECURITY INVOKER, EXECUTE public révoqué ; le rôle propriétaire fonctionne, un autre rôle nécessite des grants minimaux explicites. Aucun GRANT global au public.

Configurer la capacité additive `canonical-links:v1` dans le produit Clara Live déjà configuré et son callback HTTPS ; conserver ses identifiants et credential existants. Cette capacité n'a pas été activée ici. Vérifier les URLs/authentifications réelles des deux plateformes hors chat ; aucune valeur secrète n'est attendue dans le rapport.

Un owner/admin OS crée explicitement les clients/projets, donne les ACL aux utilisateurs à identité vérifiée et adhésion active, puis chaque propriétaire établit les doubles consentements. Aucun peuplement initial automatique. Le propriétaire Live atteste explicitement la clôture ; pas d'inférence depuis une date, un nom ou un statut technique.

Prévoir la purge administrative des tickets/challenges expirés après conservation de l'audit ; aucune tâche cron/config Vercel n'est ajoutée. Les historiques de lifecycle sont dans un document Mongo : contrôler leur croissance avant la limite BSON ; une stratégie d'archivage de cet audit serait une intervention séparée.

## Retour arrière vérifié et limites

Retour arrière non destructif : restaurer les codes des branches existantes #171/#294, désactiver la capacité canonique lors du rollout autorisé, conserver toutes les nouvelles tables/collections et l'historique pour analyse/reprise. Aucun DROP ni suppression de projet. Les anciens endpoints verrouillés ont été retestés sur snapshot OS et factory Live sans autorité ; leurs refus empêchent l'usage des données nouvelles. Les migrations s'appliquent et se rejouent dans PostgreSQL isolé. Elles n'ont pas été appliquées à Neon réel.

Il n'existe pas de transaction distribuée entre PostgreSQL et Mongo : chaque nouveau grant relit la clôture, et le commit OS recontrôle les droits OS. Une réouverture concurrente après le contrôle Live peut croiser une écriture déjà en vol ; aucune garantie d'atomicité inter-plateformes n'est annoncée. L'historique n'est pas supprimé ; sa lecture actualise le statut. Si l'on exige de bloquer aussi les opérations déjà en vol au même instant, un protocole de réservation/commit coordonné supplémentaire doit être spécifié avant activation.

Les tests utilisent des comptes, DB et API synthétiques isolés. Connexions Neon/Live de production, Drive réel, matériel/connecteurs physiques et déploiements réels ne sont pas validés. Les résultats exacts sont consignés dans `canonical-registry-validation.md`.
