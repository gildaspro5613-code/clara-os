# Audit final OS ↔ Live et préparation de l’intégration

Date : 12 octobre 2026 (Europe/Paris). **Statut : BLOCKED — pas d’autorisation de fusion ou d’activation.**

Le parcours fonctionnel isolé passe. Un interblocage des nouvelles fonctions SQL a été reproduit puis corrigé dans #172 ; une acceptation trop large de l’Origin pour le consentement par cookie a été reproduite puis corrigée dans les nouvelles routes de #295. Deux points restent ouverts : le contrôle GitHub `validate` de #171 échoue à l’installation des dépendances, y compris après relance ; une autorisation Live déjà délivrée avant une réouverture peut encore être persistée dans OS après cette réouverture. Cette limite distribuée a été reproduite, pas seulement déduite du code. Les demandes d’autorisation suivantes sont bien refusées et l’histoire consultée affiche le statut Live actif.

Aucun merge, changement de base, déploiement de production/Preview, migration de production, changement de configuration/secrets ou suppression de données métier effectué. Les seules modifications applicatives de cet audit concernent l’ordre des verrous dans les nouvelles fonctions SQL de #172 et le contrôle d’Origin dans le nouveau routeur canonique de #295 ; les autres ajouts sont des tests et ce rapport. Aucun module métier, authentification historique ou CORS global Live n’est modifié.

## 1. Périmètre, dépendances et contrôles GitHub

| PR | Head audité avant correction | Base conservée | Résultat des contrôles attachés |
|---|---|---|---|
| OS [#171](https://github.com/gildaspro5613-code/clara-os/pull/171) | `00b6324` — Documents V2 | `consolidation/clara-os-clean-base` (`ce63eda`) | `documents` réussi ; `validate` échoué à Install dependencies, tests/types/build non exécutés par ce job |
| OS [#172](https://github.com/gildaspro5613-code/clara-os/pull/172) | `c537896` — fondations | `feat/clara-os-documents-workspace-v2` | Pas de check applicatif attaché à ce head ; Vercel annulé. Correction/test de concurrence et intégration validés localement, ajoutés sur la même branche |
| Live [#294](https://github.com/gildaspro5613-code/clara-live/pull/294) | `d2e9ede` — frontière verrouillée | `deploy/clara-live-api` (`40622e0`) | backend-library-tests, frontend-library-tests, compile-and-import, isolated-validation : tous réussis |
| Live [#295](https://github.com/gildaspro5613-code/clara-live/pull/295) | `99aeb23` — fondations | `feat/secure-os-live-archive-contract` | mêmes quatre contrôles Live : tous réussis |

Les quatre PR sont ouvertes et en brouillon. Les branches et bases sont conservées. Vérification `git merge-tree --write-tree` sur chacun des quatre couples base/head : aucune collision, sans merge réel ni modification des refs. GitHub confirme également `mergeable:true` ; #171 reste `unstable` à cause du contrôle échoué. La branche Live récente `deploy/clara-live-api` est conservée : ne pas remplacer cette base par `main`, qui ne contient pas nécessairement tous les acquis.

Le job OS échoué [114512617129](https://github.com/gildaspro5613-code/clara-os/actions/runs/38153843382/job/114512617129) a été relancé en lecture/validation GitHub uniquement. La deuxième tentative [114666850116](https://github.com/gildaspro5613-code/clara-os/actions/runs/38153843382/job/114666850116) échoue au même stade. Les métadonnées des étapes sont lisibles, mais les logs redirigés vers le stockage externe ne sont pas accessibles depuis cet environnement. Cause npm précise **non établie** ; ne pas la présenter comme une régression applicative ou comme un simple incident transitoire. `npm ci --dry-run --ignore-scripts` réussit localement avec cache isolé sous Node 24/npm 11 ; cela ne remplace pas l’installation réelle du runner Node 22 et ne résout pas le check rouge.

Pourquoi #172 n’a pas de check Documents : le workflow existant filtre les PR visant `consolidation/clara-os-clean-base`, alors que #172 vise encore la branche de #171. Aucun workflow ni réglage n’a été modifié pour contourner ce filtre. Les nouveaux tests canoniques sont exécutés localement et reproductibles ; leur automatisation GitHub devra être revue séparément si requise.

Vercel : sur les quatre heads publiés, les statuts OS, clara-live et clara-live-api indiquent **Canceled by Ignored Build Step**, état success. Le réglage « Only build production » a été confirmé par l’utilisateur. Le check GitHub nommé « Vercel Preview Comments » n’est pas un build ; aucune réussite de build Preview n’est déduite de son nom. L’API des déploiements GitHub Live retourne 403 ; les statuts Vercel accessibles constituent la preuve disponible.

## 2. Audit des contrats et des contrôles

### Identité et double consentement

OS : cookie opaque existant, empreinte SHA-256, session persistée valide/non révoquée, adhésion workspace active et identité issuer/subject déjà vérifiée. Aucun utilisateur ou workspace par défaut n’est créé. Les tables d’intake/contacts ne sont pas une preuve de client canonique. Les fixtures pré-provisionnent uniquement leurs identités synthétiques ; le login Google réel n’est pas testé.

Live : `current_user` existant est utilisé ; le scénario d’intégration passe réellement par sa validation JWT et sa lecture Mongo, avec clés/comptes synthétiques. Pas de mécanisme d’identité parallèle. Les routes existantes et fonctions d’authentification restent inchangées.

Liaison : challenge OS 256 bits, TTL 5 min, empreinte seule persistée, scope lié à la même session OS et au workspace. Consentement explicite Live ; avec un cookie, l’Origin doit être dans la liste explicite autorisée et ne peut être accepté au seul motif qu’il correspond à la regex CORS des previews. Projet sélectionné et effectivement possédé ; proposition produit ne peut activer le lien. Confirmation explicite par la session OS d’origine, preuve fraîche Live, validation du scope/temps/propriétaire puis activation/audit transactionnels SQL. Ni nom ni email n’établissent une correspondance. `approve:true` est strict ; `approve:1` est refusé.

### ACL, révocation, expiration

Autorité OS séparée : client/projet et ACL read/archive/manage explicites ; workspace vérifié à chaque utilisation. La même identité Live ne peut pas être liée à deux comptes OS dans le même workspace ; un projet Live ne peut changer silencieusement de client/projet canonique. Le périmètre minimal exige que l’utilisateur OS soit lié au propriétaire Live : aucune délégation inexistante n’est inventée.

Ticket serveur 256 bits : lié à session/workspace/client/projet/opération, TTL 45 s. Live le redemande auprès d’OS, recontrôle l’identité, les consentements non révoqués, la propriété et l’attestation ; grant ≤30 s et ≤expiration du ticket. OS vérifie ce grant puis recontrôle les droits SQL à la persistance atomique de référence/audit. Ticket consommé à l’écriture. Un jeton produit seul ne donne aucun droit de lecture/archivage.

Révocation OS d’identité : liens de projets et challenges neutralisés ; relier seulement l’identité ne réactive pas ces projets. Révocation Live de preuve : les grants suivants et la consultation sont refusés, sans supprimer l’histoire OS. L’expiration initiale de 5 min borne l’établissement du lien ; une liaison durable reste valable après cette fenêtre jusqu’à révocation, avec propriété/droits recontrôlés à chaque grant.

### Clôture et histoire

Registre Mongo `canonical_business_lifecycle` indépendant de Project ; sans attestation = actif/non archivable. Propriétaire authentifié uniquement, approbation, révision attendue, requestId, horodatage/audit dans un document atomique. Replays cohérents et concurrence protégée ; modifications du modèle Project exclues.

Réouverture : nouveaux grants d’archive refusés immédiatement après l’écriture de l’état actif. Lecture historique autorisée seulement après recontrôle OS/Live ; statut courant actif séparé du statut administratif archived. Le projet technique n’est ni copié ni supprimé. URL originale HTTPS connue, soumise à l’authentification Live habituelle ; retirée de l’interface lorsque les droits ne sont plus vérifiables.

**Limite reproduite** : dans le test, Live délivre un grant completed ; avant sa réception/persistance OS, le propriétaire rouvre le projet ; la persistance OS réussit encore avec ce grant en vol. La demande suivante est refusée et la consultation retourne active. Il n’existe pas de transaction distribuée SQL/Mongo ni de réservation de clôture. Le contrôle de temps du grant précède aussi l’appel SQL ; le ticket SQL borne cette écriture à sa propre expiration. Ne pas annoncer « projet nécessairement fermé au moment exact du commit OS ». Si cette exclusion stricte est requise, un protocole de réservation/confirmation avec révision Live et gestion des pannes doit être spécifié et testé avant activation ; ajouter seulement un second GET ne rendrait pas les deux DB atomiques.

### Persistance, erreurs et transports

Migrations 008/009 additives : clients/projets/ACL/liens/challenges/audit/tickets et références administratives, compatibles avec le format historique. Aucun runtime DDL dans le nouveau raccord, aucun seed/backfill de production. Fonctions SECURITY INVOKER, EXECUTE public révoqué. Tests sur PostgreSQL 17 réel, pas sur Neon distant ni avec le rôle réel applicatif.

Mongo réel isolé : preuves et lifecycle séparés des collections techniques. Tests d’originals avant/après montrent les mêmes données Project JSON. Aucune copie technique dans la référence OS. Les historiques de lifecycle dans un document exigent une surveillance de croissance avant la limite BSON ; la purge des challenges/tickets expirés doit conserver l’audit.

HTTP : credential/configuration produit existants, capacité additive `canonical-links:v1`, pas de redirection de credential, délais de transport 5 s, requêtes JSON bornées, réponses de pont ≤64 KiB, réponses sans cache et erreurs sans données secrètes. Absence de credential/scope/preuve ou panne : refus, pas de fallback. Les fixtures remplacent le transport TLS par du loopback et le protocole HTTP Neon par un adaptateur vers PostgreSQL réel : elles ne prouvent ni TLS/DNS/proxy réels ni l’accès Neon/Atlas de production.

## 3. Correction ciblée et non-régressions

**Défaut nouveau des fondations #172, corrigé** : `clara_registry_command` verrouillait session/adhésion puis workspace ; les tickets prenaient workspace puis session/ACL. Deux transactions concurrentes ont produit le code PostgreSQL `40P01` dans une DB temporaire. Correction : ordre workspace → session/ACL/challenge commun à command, pending et authority. Le test déterministe bloque volontairement une transaction sur le workspace, intercale une lecture du registre puis poursuit le ticket : auparavant interblocage ; après correction les deux opérations réussissent. Aucun droit ni modèle métier modifié, aucun changement des tables auth ou de leurs valeurs.

**Défaut nouveau des fondations #295, corrigé** : une Origin non présente dans la liste explicite mais correspondant au motif CORS `clara-live-*.vercel.app` pouvait consentir avec un cookie authentifié. Le test avant correction retourne 200 au lieu du 403 attendu. Le contrôle canonique refuse désormais ces origines avant tout appel OS ou écriture Mongo ; consentement, clôture et réouverture utilisent cette même garde. Authentification historique et réglage CORS global restent intacts. Le test vérifie refus et absence d’effets persistés ; les origines explicitement autorisées et les appels Bearer sans cookie continuent de passer.

Fichiers corrigés/ajoutés dans cet audit :

- `db/migrations/008_canonical_client_project_registry.sql` et `009_canonical_archive_authority.sql` : ordre des verrous uniquement.
- `src/tests/canonical-registry-postgres.test.ts` : scénario de concurrence supplémentaire.
- `src/tests/helpers/canonical-lock-order.py` : reproduction déterministe PostgreSQL isolé.
- `src/tests/helpers/canonical-integration.mts` et `canonical-live-fixture.py` : parcours entre les routes réelles, sessions/données synthétiques et bases isolées.
- Live : `backend/canonical_authority_routes.py`, contrôle exact de l’Origin uniquement ; `backend/tests/test_canonical_authority.py`, nouveau cas de cookie/regex CORS.
- Le présent rapport.

Live : seul le nouveau routeur canonique est corrigé ; aucun module applicatif préexistant aux fondations n’est modifié. Diff protégé contre `origin/deploy/clara-live-api` vide pour `clara_os_client.py`, `unified_core_contracts.py`, `unified_core_capability_routes.py`, Stage, interop et connecteurs ; test d’invariance existant réussi. `server.py` ne contient que les ajouts de montage de routeurs déjà présents dans #294/#295 ; fonctions métier/Project/current_user inchangées. Frontend Live inchangé. Les fonctions commerciales OS ne sont pas touchées.

Les neuf échecs backend et le test frontend décrits ci-dessous sont reproduits sur le snapshot `d2e9ede` et ont les mêmes noms ; ils ne sont pas masqués par des modifications de bibliothèque, jobs ou navigation. Le contrôle d’installation GitHub #171 est un autre échec, préexistant à cet audit, dont la cause reste inconnue. Il n’est pas classé arbitrairement comme régression de code.

## 4. Tests exécutés le 12 octobre

| Vérification | Résultat réel |
|---|---|
| Parcours inter-plateformes OS routes/Live routers et authentification existantes, PG/Mongo isolés | **13 contrôles fonctionnels réussis** ; risque en vol reproduit séparément |
| Contrôles du parcours | plusieurs projets/client, identité non associée, double consentement, confirmation par autre session refusée, actif refusé, clôture/autorisation/archive, consultation, autre client/utilisateur, conflit, replay, réouverture/histoire, panne de chaque plateforme, ticket expiré, révocations OS et Live, originaux conservés |
| Fondations SQL/service OS | **3 réussis**, dont persistance réelle et nouvelle concurrence |
| Documents OS, avec conteneur PostgreSQL historique dédié | **29 réussis, aucun ignoré** |
| Auth/session/workspace/Microsoft/OIDC statiques OS | **25 réussis**, aucun login Google/Microsoft réel |
| TypeScript et ESLint ciblé OS, compilation des deux fixtures Python | Réussis |
| Build OS optimisé Webpack | Réussi ; cache local de fichiers Geist réels via hook Next, sans changement de TLS/polices/config applicative |
| Chromium Documents/archives OS | **7 réussis**, build réel et API synthétique |
| Live ciblé canonical/archive/callback + auth/CORS historique | **58 réussis**, Mongo isolé, nouvelle garde et tests d’invariance |
| Live backend, sélection de 35 fichiers | **312 réussis, 9 échoués** |
| Snapshot des 3 fichiers backend en échec (`d2e9ede`) | **31 réussis, mêmes 9 échecs** ; comparaison exacte des noms réussie |
| Frontend Live, 27 suites | **170 réussis, 1 échoué** |
| Snapshot du fichier frontend en échec (`d2e9ede`) | **6 réussis, même 1 échec** |
| Chromium Stage Model 2D/3D | SVG/zoom 2D, canvas WebGL 3D/contrôles, plein écran/Escape réussis ; API synthétique |
| Chromium Sound/Video | **1 scénario réussi** : données partagées, conflit, refresh/export, HTTP local et build réel |
| Retour arrière OS snapshot `00b6324` | **3 tests de format/routes verrouillées réussis** ; retour arrière de code non destructif |
| Relance GitHub validate #171 | Échec à l’installation, avant les tests/build |

Le build frontend Live et les 22 tests GDTF/Video/certification Stage (1 fixture réelle GDTF ignorée), ainsi que les suites HTTP métier (40 réussis/20 échecs identiques au baseline), ont été exécutés le 11 octobre et sont documentés dans `canonical-registry-validation.md`. Aucun code Live n’a changé depuis ; ne pas les présenter comme de nouvelles exécutions du 12. Les nouveaux smokes navigateur utilisent ce build Live inchangé. Structure est couverte par les tests Stage/structure disponibles, sans parcours navigateur indépendant annoncé. Matériel, consoles, DMX réel, GDTF externe réel, Google/Drive réel et services de production non validés.

Échecs backend préexistants : six `test_library_routes` (résolution/recherche/pagination/intake Prolyte), `test_emergent_adapter_namespaces_and_accepts_canonical_path`, et les deux tests jobs `test_chat_finishes_before_document_job_then_persists_canonical_message` / `test_ordinary_question_stays_sync_and_creates_no_job`. Frontend : `conversation pins its project when the originating project route unmounts` dans ClaraWorkspace.test.jsx. Listes et preuves baseline dans les logs `/tmp/final-live-{nonreg,baseline,frontend,frontend-baseline}.log`.

## 5. Plan exact d’intégration — à autoriser, non exécuté

1. **Lever le blocage CI #171** : consulter les logs d’installation depuis GitHub, reproduire avec versions exactes Node/npm du runner, résoudre la cause minimale puis obtenir validate et documents verts au head retenu. Vérifier également les contrôles du dernier head #172 et accepter explicitement les preuves canoniques locales/reproductibles ou autoriser leur automatisation CI. Ne pas modifier les modules métier pour masquer les échecs historiques.
2. **Revue sécurité et sémantique** : vérifier les correctifs de verrous et d’Origin ; décider la portée des archives en vol avec le cas reproduit. Si l’exigence impose l’état completed à l’instant du commit OS, garder l’activation bloquée jusqu’au protocole coordonné. Examiner la conservation des preuves de clôture/révision dans l’audit si une traçabilité réglementaire plus forte est requise ; ne pas inventer une preuve persistée aujourd’hui.
3. **Préparer la fenêtre, sauvegardes et garde d’activation** : avant tout déploiement/migration, conserver la capacité canonique absente et toutes les associations nouvelles non actives ; vérifier l’existant sans altérer Unified Core. Relever les branches Production Branch Vercel : un merge vers l’une d’elles peut déclencher automatiquement un déploiement. L’accord de merge ne doit pas être interprété comme accord de déploiement si celui-ci n’est pas explicitement donné.
4. **Ordre des merges recommandé** : **Live #294 → Live #295 → OS #171 → OS #172**. Parent avant enfant dans chaque dépôt ; backend Live avant raccord consommateur OS. Aucun merge ici.
5. **Retarget des enfants après leurs parents, à autoriser** : #295 vise actuellement la branche #294 ; après merge de #294, #295 devra viser `deploy/clara-live-api`. #172 devra ensuite viser `consolidation/clara-os-clean-base` après merge de #171. Merger les enfants seulement dans une branche de parent déjà fusionnée ne les intégrerait pas dans ces bases. Les changements de base n’ont pas été effectués ; ils nécessitent accord explicite compte tenu des consignes précédentes. Recalculer le diff, les conflits et les checks après chacun ; ne pas supposer un retarget automatique. Conserver toutes les branches ; `delete_branch_on_merge:false` vérifié dans les deux dépôts.
6. **Pas de promotion implicite vers main** : les bases ci-dessus sont les branches d’intégration auditées. La promotion vers une autre branche réellement déclarée production reste une opération distincte à préciser/autoriser, surtout pour Live dont main est plus ancien.
7. **Migrations uniquement après autorisation** : inventorier 001/002 et migrations auth déjà présentes ; appliquer **008 puis 009**, transactionnelles, sur une copie restaurée d’abord puis sur Neon réel dans la fenêtre autorisée. Si 008/009 ont été appliquées hors de ce travail, comparer les définitions des fonctions et réappliquer le correctif CREATE OR REPLACE revu, sans DROP/reconstruction de tables. Arrêter si l’index unique des références révèle un conflit, sans supprimer ni recoder les lignes.
8. **Déploiements autorisés, archivage encore fermé** : Live puis OS aux commits approuvés, sans Preview, capacité canonique toujours absente. La configuration produit/workspace et les credentials/URLs existants sont préservés ; aucune inscription implicite ni seed. Smoke des parcours historiques avant ouverture de l’archive.
9. **Activation contrôlée après recette réelle** : vérifier rôle SQL, permissions et correspondances réelles, puis ajouter uniquement `canonical-links:v1` à la liste existante avec autorisation de configuration explicite. Aucun changement de secret requis par conception. Le plan ne donne pas l’autorisation de le faire maintenant.

## 6. Sauvegardes, paramètres et contrôles avant activation

Sauvegardes à faire par l’administrateur avant migration autorisée : export PostgreSQL cohérent (schéma, fonctions/privileges et données auth/workspace/client/projet/ACL/liens/audit/références), sauvegarde Mongo incluant users/projects et sidecars s’ils existent, inventaire des index, SHA/config applicative sans publication de secrets. Stockage chiffré avec rétention et accès limités ; vérifier la restauration dans une DB isolée et comparer les comptages/index/contraintes et échantillons de données. Aucun backup/restore réel de production n’a été exécuté ou certifié ici.

Contrôler le rôle applicatif réel : SECURITY INVOKER requiert EXECUTE sur les fonctions, accès aux tables et permissions nécessaires aux SELECT FOR UPDATE, notamment auth/workspace/session/membership ; audit nécessite aussi les droits de séquence. Le rôle PostgreSQL de tests est propriétaire, ce qui ne prouve pas les grants du rôle Neon réel. Ne pas accorder EXECUTE au public ou des accès SQL aux navigateurs. Les délais de 5 s concernent les ponts HTTP, pas un statement_timeout SQL démontré : vérifier aussi lock_timeout/statement_timeout du rôle réel et les attentes de verrou sous charge. Vérifier backups/PITR et write concern/journaling Mongo réels, ainsi que la croissance des audits et la purge des tickets/challenges expirés sans perte d’audit.

Paramètres à vérifier sans mutation implicite : `CLARA_AUTH_APP_ORIGIN`, produit Clara Live et workspace canonique non-default, `CLARA_LIVE_CALLBACK_BASE_URL`, `CLARA_OS_BASE_URL`, productId existant et headers/token partagés existants. Les bases URL doivent être HTTPS et correspondre à l’origine/backend réellement servis ; les chemins sont ajoutés par les adaptateurs (`/api/core/...`), donc ne pas mettre une URL de capability complète ou doubler `/api`. Vérifier TLS, DNS/proxy, CORS/Origin, horloges UTC synchronisées et délai total ; les fixtures de loopback n’ont pas couvert ces conditions réelles.

Conserver les capacités existantes ; l’ajout canonique ne doit jamais remplacer les capacités Unified Core déjà opérationnelles. Le produit ne prend pas un workspace choisi par le caller : la configuration doit correspondre au workspace de ses associations. Aucun mapping automatique depuis client libre, nom, email ou intake.

Administrativement : owner/admin OS crée/valide les clients/projets et ACL explicites, chaque propriétaire établit les deux consentements dans la même session OS, puis clôture explicitement le projet Live. Projet sans attestation reste non archivable. Aucun utilisateur/client/projet réel n’est provisionné ici.

### Maintenir l’archivage désactivé

**Ne pas ajouter `canonical-links:v1`** tant que cette recette et ces associations ne sont pas validées. Le pont OS de preuves/grants refuse si cette capacité manque, et le callback OS inspect/propose/redeem refuse également. Les permissions/grants ne peuvent être fournis par le navigateur. L’absence de table, credential, correspondance, adhésion, permission, consentement, propriété ou attestation garde le refus. Garder la capacité absente constitue le verrou global ; ne pas compter uniquement sur des associations encore vides si certaines existaient déjà. Les fonctionnalités documentaires et Unified Core conservent leurs propres mécanismes existants.

## 7. Recette réelle et retour arrière

Après déploiements autorisés mais avant ouverture générale : contrôler authentification/navigation, Documents/Drive et parcours commerciaux OS ; Stage 2D/3D, Light/Sound/Video/Structure/Production, bibliothèques/GDTF/MVR, documents/analyse, patch DMX, connecteurs et Unified Core Live. Distinguer les checks logiciels d’un test de matériel physique. Réaliser la recette canonique sur un client/projet témoin réel et deux utilisateurs autorisés/non autorisés, avec accord sur la création de ces données : non terminé/refus, consentements, clôture, archive/replay, autre client, révocations, réouverture/histoire et cas en vol ; contrôler les traces PG/Mongo, URLs et absence de duplication technique. Tester les pannes dans un environnement isolé, sans couper les plateformes de production.

Retour arrière **non destructif** : refermer d’abord la capacité canonique lors d’une opération de configuration autorisée, arrêter les nouvelles écritures et inspecter les requêtes déjà en vol ; restaurer les versions applicatives précédentes approuvées (OS #171 avec archive verrouillée, Live #294 sans autorité active, ou versions de production sauvegardées). Conserver toutes les nouvelles tables/collections, références et audits. Aucun DROP, suppression de Project ou restauration globale de données qui écraserait des opérations récentes. Les données techniques originales n’ayant pas été mutées par le raccord, elles ne nécessitent pas un rollback de modèle.

Les tests de routes anciennes OS (3 réussis) et du défaut Live sans autorité confirment le verrou logiciel. Application et reprise des migrations et corrections sont testées dans des DB isolées ; la restauration complète des sauvegardes et le rollback du déploiement réel doivent encore être éprouvés dans l’environnement autorisé. Reprise de l’archive uniquement après diagnostic, preuve de cohérence et nouvel accord d’activation.

## 8. Conditions de passage à READY TO MERGE

- Le dernier head #171 a `validate` et `documents` réussis ; la cause d’installation est établie/résolue. Pas de simple assimilation de l’install rouge à une régression historique déjà acceptée.
- Les correctifs #172 (verrous) et #295 (Origin exact des consentements) sont revus ; ses 3 tests canoniques, le scénario inter-plateformes (13 contrôles) et ses vérifications types/lint/build passent sur le head retenu, avec preuves reproductibles et couverture GitHub attendue acceptée. Les tests ne sont pas remplaçables par le seul check Vercel.
- Contrôles Live verts sur les heads retenus ; échecs locaux préexistants explicitement identifiés et acceptés comme baseline, sans les cacher.
- Décision documentée sur les opérations autorisées déjà en vol et la signification de completed au commit ; si stricte, protocole supplémentaire livré/testé avant activation.
- Parents d’abord, autorisation des retargets, nouveau contrôle de diff/conflicts/checks et branches conservées. Accord explicite de merge ; déploiement/migration/configuration restent des autorisations séparées.

Les associations réelles, backups restaurables, droits Neon/Atlas, transports/TLS et recette de production sont des conditions d’**activation**, distinctes de la revue du code. Leur absence n’est pas présentée comme une preuve d’échec du code, mais empêche toute activation réelle annoncée comme sûre. À ce stade **BLOCKED** : CI OS non résolue et portée du cas en vol à statuer avant la séquence d’intégration/activation.

## Reproduction locale

Depuis Clara OS, avec les deux dépôts et dépendances installées, Mongo loopback `127.0.0.1:27039`, conteneur PostgreSQL `clara-canonical-test-postgres` (rôle/base postgres) :

```sh
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/canonical-registry-postgres.test.ts src/tests/canonical-archive-service.test.ts
CANONICAL_LIVE_REPO=/workspace/clara-live CANONICAL_LIVE_PYTHON=/workspace/.venvs/clara-live/bin/python node --import tsx src/tests/helpers/canonical-integration.mts
```

L’intégration crée des DB temporaires `canonical_audit_<uuid>` puis nettoie seulement ses propres fixtures. L’adaptateur Neon utilise les requêtes réelles du client Neon vers PostgreSQL local ; TLS est remplacé par des transports HTTPS-fixture → HTTP loopback, et tout accès Node hors destinations de fixture/loopback est refusé. Les variantes de panne ne coupent aucune plateforme réelle. Le test de verrouillage crée/nettoie sa propre DB `canonical_lock_<uuid>` ; avant le correctif il produit 40P01, après les deux commandes réussissent. Les autres commandes de tests/browser sont documentées dans `canonical-registry-validation.md` ; logs de cette séance dans `/tmp/final-*.log`.

Après les correctifs, les contrôles GitHub des nouveaux heads devront être relus ; les succès Live du tableau concernent le head initial audité `99aeb23`, pas une anticipation des checks du correctif Origin. Les exécutables/tests restent reproductibles et les PR en brouillon.


### Contrôles finaux après publication des correctifs

Le head Live #295 **42df55f** a ses quatre contrôles applicatifs GitHub terminés et réussis : compile-and-import, isolated-validation, frontend-library-tests et backend-library-tests. Les deux statuts Vercel Live indiquent Canceled by Ignored Build Step. Le correctif SQL est publié sur #172 (commit applicatif **d2af9c8**, suivi de rapports uniquement) ; le workflow applicatif OS reste exclu par le filtre de base décrit plus haut. #171 conserve son échec d’installation après deux tentatives, sans nouveau commit ni modification de sa base. Ces contrôles ne lèvent donc pas le statut BLOCKED de l’ensemble.
