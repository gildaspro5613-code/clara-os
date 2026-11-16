# Clara Voice Lot 3 — association conversationnelle canonique v1

## Décision et périmètre

Décision propriétaire du 21 octobre 2026 : OS approuve et révoque l'association ; Live conserve l'autorité sur son utilisateur, projet et conversation. Implémentation serveur, sans interface vocale ni appel fournisseur. **GO contrat/backend en isolation uniquement après les preuves ci-dessous ; NO-GO activation vocale, déploiement et Production.**

Références de départ vérifiées : OS #176 `22ee77e03701c6d581678a5b309a431074d7e7b7`, Live #314 `f273ebfef0b2b2fe37fdbbc87b8c69efea42d222`, Live #317 `1eb2fd1e15e056e326e2ff807989a4f9fb58529f`. Branches dédiées `feat/canonical-conversation-link-v1` et `feat/live-canonical-conversation-link-v1`, PR Draft empilées sur #176 et #317, sans modifier leurs branches.

## Contrat

Capacité exclusive **`conversation:link`**, distincte de `voice:conversation`, `read`, `archive` et toute commande matérielle. Une association est une référence entre deux conversations, jamais une fusion ni une réattribution d'historique.

Le `binding` immuable contient :

- `schemaVersion: clara.conversation-link.v1`, `capability: conversation:link`, `productId: clara-live`, `associationId` ;
- `osUserId`, `workspaceId`, `clientId`, `projectId`, `missionId`, `nativeSessionId` ;
- `liveUserId`, `liveProjectId`, `liveConversationId` ;
- `identityProofId`, `projectProofId`, `expiresAt` (date ISO avec fuseau).

Le résultat associe ce binding à `decision` (`pending`, `approved`, `revoking`, `revoked`), une `revision`, une preuve Live et un éventuel reçu d'arrêt. La preuve porte la version `clara.conversation-link-proof.v1`, une décision `verified`, le binding exact, un identifiant aléatoire et une expiration. Elle est récupérée par un canal HTTPS serveur-à-serveur authentifié et vérifiée en base Live ; **son identifiant seul n'est pas un bearer token**. Le navigateur ne fournit jamais la preuve à approuver.

Politique bornée implémentée : demande valable 5 minutes, preuve Live au plus 5 minutes, association 15 minutes depuis la demande. L'expiration de la session d'authentification OS initiatrice peut fermer l'accès avant cette échéance. Aucun renouvellement implicite ; nouveau consentement/demande pour une nouvelle association. Le statut historique `approved` ne dispense jamais d'une autorisation fraîche.

## Autorités réutilisées

OS réutilise `clara_registry_authority(...,'read')` **pour résoudre les associations existantes et ACL**, sans émettre ni réinterpréter un ticket read/archive. Il contrôle aussi `clara_native_read_session` : propriétaire, attestations de session/mission, ACL client/projet et mission certifiée (`nativeMissionId`). Création/approbation et autorisation d'utilisation exigent les droits de gestion existants client **et** projet. La révocation peut être demandée par le propriétaire conservant son accès natif, même après perte des droits de gestion.

Live exige un utilisateur existant, la propriété réelle du projet et une conversation déjà persistée dans `clara_messages` sous ce même utilisateur/projet. Un identifiant de session rencontré sous plusieurs propriétaires/projets est refusé. Les deux preuves canoniques identité/projet doivent être non révoquées et correspondre à OS. Aucun nom/email, dernière mission, workspace par défaut ou session globale n'est employé.

Les sessions `external:…` restent refusées comme sessions natives. Le contrat conserve explicitement les deux identifiants et ne change ni le partitionnement Unified Core, ni les historiques, ni le Brain. Il n'octroie aucune opération technique, matérielle ou de show.

## Parcours API

1. **OS** `POST /api/native/conversation-links`, cookie d'authentification canonique et sélection explicite workspace/client/projet/session existante, Origin configuré :
   `{"action":"request","requestId":"operation-unique-0001","liveConversationId":"conversation-live-existante"}`.
   OS dérive les autres identifiants ; résultat `pending`, révision 1. Le requestId est unique par workspace/utilisateur ; même contenu = même association, contenu différent = conflit.
2. **Live**, utilisateur réellement authentifié : `POST /api/canonical/conversation-links`, `{"associationId":"…","approve":true}`. Cookie = Origin explicitement autorisé ; bearer = mécanisme d'authentification existant. Live inspecte la demande auprès d'OS, contrôle ses données et persiste son consentement dans `canonical_link_proofs` (`kind=conversation`, `_id=conversation:<associationId>`).
3. **OS**, confirmation humaine : même endpoint natif avec `{"action":"approve","id":"…","expectedRevision":1,"approve":true}`. OS récupère la preuve par `POST /api/core/conversation-links/verify` côté Live, puis revalide les autorités en transaction et persiste `approved`, révision 2. La perte d'acquittement rejoue la décision persistée sans nouvel accord ni doublon.
4. **Consultation/reprise** : OS `GET /api/native/conversation-links?id=…` avec la sélection native ; Live `GET /api/canonical/conversation-links/{id}` avec son utilisateur. Live recontrôle la propriété, le consentement et appelle OS pour autoriser la relation. Le résultat ne contient que les références et `conversation:link`, jamais un accès vocal ou une copie des messages.
5. **Révocation OS** : POST natif `{"action":"revoke","id":"…","expectedRevision":2,"approve":true}`. La transaction OS persiste d'abord `revoking`, révision 3. Les autorisations ultérieures sont déjà refusées. OS contacte ensuite `POST /api/core/conversation-links/stop` côté Live.
6. **Confirmation Live** : Live vérifie auprès d'OS la décision de révocation exacte, persiste son refus, puis renvoie un reçu `clara.conversation-link-stop.v1` correspondant au binding et à la révision. OS ne passe à `revoked` qu'après ce reçu. Un timeout ou une panne laisse `revoking` ; réessayer explicitement la même révocation pour réconcilier. Aucune répétition automatique d'effet fournisseur.

Canal produit distinct : OS `POST /api/core/canonical/conversations`, actions strictement `inspect`, `authorize`, `stop`, avec authentification produit existante, header `x-clara-product: clara-live` et capacité configurée `conversation:link`. Le workspace est celui du produit configuré, jamais une valeur soumise par le produit. `stop` permet la réconciliation d'une révocation déjà décidée, sans réactiver la session initiatrice expirée. Les autres actions recontrôlent la session initiatrice, le contexte natif et les ACL/preuves canoniques.

## Sens exact de l'arrêt

Ce lot ne crée **aucune session vocale**. Le reçu `stopped=true` concerne uniquement `conversation:link` : accès associé bloqué côté OS et Live, pas l'arrêt d'un flux ElevenLabs. Le champ fournisseur dit `not_established_by_this_capability`.

Si une session vocale est enregistrée pour l'association, Live renvoie **503 sans reçu**, même si son simple état en base vaut `stopped`. Il faudra un canal de contrôle fournisseur et un acquittement vérifiable dans un autre raccordement avant de certifier l'arrêt physique du flux. Aucune donnée en base n'est présentée comme cette preuve. Les conversations textuelles indépendantes et jobs métier Live ne sont pas supprimés ou annulés par une révocation de l'association.

## Persistance, concurrence, audit et migration

Migration additive **024**, dans le registre canonique existant : `clara_registry_conversation_links` et deux fonctions `SECURITY INVOKER`, PUBLIC révoqué. Aucun backfill ni DDL de démarrage. Ordre numérique après 023 ; dépend des autorités 008/009/012 et de la version de lecture native 014. Les anciennes migrations restent intactes.

Les mutations et leur entrée dans `clara_registry_audit` sont atomiques. Le verrou workspace-first reprend l'ordre existant ; révisions et requestId empêchent doublons et réapprobations silencieuses. Le Journal de conversation, les messages et les missions ne sont pas copiés : les décisions d'autorité utilisent le journal canonique existant. Live conserve les preuves et l'historique de révocation dans sa collection canonique existante, avec write concern majority+journal. Aucun index/rejeu vocal de #317 n'est modifié.

Droits à faire revoir avant une migration autorisée : EXECUTE des deux fonctions nouvelles, SELECT/INSERT/UPDATE de la nouvelle table (UPDATE pour les verrous), et droits existants sur les autorités natives/canoniques, audit et sa séquence. Aucun GRANT exécuté hors bases jetables ; rôle limité réel non certifié. Sauvegarder tables/receipts/audit avant une opération ultérieure ; retour arrière applicatif conserve la table et les historiques. Ne jamais restaurer une ancienne base pour prétendre annuler un effet externe.

## Réception exécutée

- **12 PASS** : nouveaux tests OS de routes et PostgreSQL (sous-tests compris), deux utilisateurs, deux workspaces, quatre projets/sessions, refus interprojets/utilisateurs/sessions, preuve erronée, expiration, droits de gestion/membership/preuves révoqués, idempotence et huit approbations réellement concurrentes.
- Dans ces 12 : parcours couplé service TypeScript OS → vrais handlers ASGI Live → fonctions SQL OS, avec **PostgreSQL et MongoDB locaux réels**. Un nouveau processus Python/client Live à chaque étape prouve la reprise applicative sans cache. L'identification utilisateur HTTP du harnais est synthétique ; l'autorité native SQL, propriété Live, preuves et persistance sont réellement exercées. Ce n'est pas une connexion Google ni un test navigateur.
- Migration 024 appliquée et réappliquée ; dump/restauration sur une nouvelle base PostgreSQL jetable, comparaison des bindings, décisions, preuves, reçus. Pas de redémarrage du serveur PostgreSQL/Mongo ni de test d'élection de réplica.
- **49 PASS Python** : primitives #314/#317, intégration Mongo, nouveaux handlers Live et transport borné. Refus d'un faux arrêt basé uniquement sur l'état `stopped`, reprise après perte d'acquittement, concurrence de consentements et conservation des messages.
- **27 PASS de non-régression OS** : registre canonique et ordre des verrous, barrières natives, chat PostgreSQL (plus de 100 messages, concurrence, reçus, reprise, restauration), routes vocales existantes.
- **10 PASS React Live** : conversation projet et advice/jobs. API/fournisseurs simulés ; pas une E2E navigateur.
- TypeScript, lint ciblé, compilation Python et build Next.js local : contrôles exécutés ; voir rapport de PR pour leur résultat final. Aucun build Vercel.

Les modifications n'affectent pas les composants frontend, les quatre métiers Live, le Stage/GDTF ni les connecteurs matériels. Ces modules ne sont pas nouvellement certifiés par l'absence de diff. Les vérifications CI sur les commits publiés sont distinctes des tests locaux ; ne pas les déduire de ce rapport.

## Reproduction hors fournisseurs

```sh
# Docker local jetable seulement ; aucun .env métier à charger.
# Dépendances Python des requirements existants, plus pytest/pytest-asyncio.
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres \
CONVERSATION_LIVE_REPO=/chemin/clara-live \
CONVERSATION_TEST_PYTHON=/chemin/venv/bin/python \
CONVERSATION_TEST_MONGO_URL=mongodb://127.0.0.1:27039 \
node --import tsx --test src/tests/canonical-conversation-postgres.test.ts \
  src/tests/canonical-conversation-routes.test.ts
```

Le helper Python refuse une base PostgreSQL non préfixée `conversation_` et une base Mongo non préfixée `clara_voice_reception_joint_`. Le test Live crée sa base aléatoire ; ne pas utiliser `backend/tests/conftest.py` pour cette campagne, car il charge le .env applicatif. La CI Live existante copie les tests ciblés vers un répertoire temporaire et utilise `--confcutdir`, avec Mongo local ; aucune clé fournisseur.

## Préconditions hors de cette autorisation

Aucun secret/configuration changé. Avant tout usage déployé : validation séparée des deux SHA, migration 024 sur la seule cible autorisée, droits effectifs, callback **isolé** et capacité `conversation:link` ajoutée explicitement par le propriétaire à la configuration produit existante. Conserver `canonical-links:v1` pour les fonctions antérieures. Ne jamais basculer vers un callback Production pour tester la recette.

Le token produit existant reste lié à son workspace configuré : les tests d'isolation ne l'élargissent pas à d'autres workspaces. Une conversation Live existante est requise ; commencer par un échange texte autorisé si elle n'existe pas. Pas de rattachement d'historique inconnu.

La route vocale d'OS main reste une variante distincte non corrigée par cette association. Les contrôles #176 et l'indisponibilité de la voix native sont conservés. Authentification Google réelle, interface d'association, audio, microphone, reconnexion fournisseur et arrêt de flux réel ne sont pas reçus ici. **Aucun GO Production, aucun merge ou déploiement autorisé par cette réception.**
