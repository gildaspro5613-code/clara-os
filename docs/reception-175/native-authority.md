# P0 — Autorité serveur native, suite #175 / PR #176

**Décision : NO-GO pour la réception opérationnelle.** Le défaut de lecture anonyme de `/api/clara/session` est corrigé sur la branche Draft #176. Ce correctif est conservatoire : les opérations et pages utilisant encore le runtime global sont verrouillées, y compris pour un utilisateur authentifié. Il ne constitue pas une réception fonctionnelle native multi-utilisateur.

## Inventaire vérifié et propriétaire

| Ressource | Source / persistance | Autorité historique démontrable | Traitement de cette passe |
|---|---|---|---|
| Mission | `src/modules/missions/types/Mission.ts`, `mission-store.ts`, `current-mission.ts` ; `clara_missions(id,data,updated_at)` | Le modèle n'a ni propriétaire utilisateur ni workspace/client/projet. Les éventuels `execution.userId/workspaceId` décrivent une tâche et ne prouvent pas la propriété de toute la mission | Modèle et données métier inchangés ; attestation séparée indispensable pour la mission contenue dans une session consultable |
| Session native / conversation / dashboard | `src/lib/core/session.ts`, `store/session-store.ts`, `operational-context.ts`, `runtime.ts` ; `clara_sessions(id,data,updated_at)` | `default`, prénom configuré, « session la plus récente » et mission courante ne sont pas des autorités. Pas de rattachement natif canonique vérifiable dans ces modèles | `default` exclu ; aucun rattachement automatique ; propriétaire privé et périmètre explicites, version exacte attestée |
| Session externe OS↔Live | `src/lib/core/session-key.ts`, `src/lib/external-capabilities`, handlers `api/external` | Namespace et contexte produit/user/projet/session contrôlés par le raccord existant | Aucun changement du raccord ; `external:*` et dashboard portant un `productId` exclus de la lecture native |
| Document Drive | `src/app/api/documents/route.ts`, `drive-client.ts`, `drive-files.ts`, `drive-workspace.ts` | `fileId`, nom, parent et connexion du workspace courant ne prouvent pas un propriétaire OS ni une appartenance à un projet. Pas de table native Document avec ACL projet | Listing, lecture, upload, dossier et move natifs verrouillés avant tout adapter/I/O. Le type `document` est réservé dans l'attestation ; aucune lecture Drive activée par une attestation de session |
| Archive documentaire Live | `api/documents/live-archives`, `lib/canonical/archive-*`, migrations 008/009/010 | Registre canonique, identité associée, double consentement, ACL et commit coordonné OS↔Live existants | Inchangé ; tests de continuité et concurrence réellement exécutés en isolation |
| Acquisition / journal / approbations / synthèses natives | `lib/acquisition`, `lib/core/journal*`, pages et APIs Clara/Missions | Certains enregistrements portent un workspace, pas une appartenance complète utilisateur/client/projet de toutes leurs dépendances | Pages globales et points d'entrée natifs verrouillés ; les handlers et composants métier restent conservés |
| Connexions fournisseurs | `lib/connections` et routes `api/connections` | Mécanismes propres à chaque connecteur ; Google utilise notamment `CURRENT_WORKSPACE_ID` dans son statut/installation OAuth | Non certifiés par ce correctif. L'audit complet de ces surfaces reste une condition de réception ; aucune connexion fournisseur ni lecture de valeur secrète effectuée |

Le mot « propriétaire » utilisé par l'ancien résolveur désignait le fil qui contient une mission, pas un principal authentifié. Aucun email, titre, prénom, identifiant de tâche, dernière mission ou unicité de prospect n'est utilisé pour attribuer une ressource historique.

## Contrat serveur ajouté

`GET /api/clara/session?workspaceId=<id>&clientId=<id>&projectId=<id>&sessionId=<id>`

- Réutilisation exclusive de `clara_auth_session`, `registryContext`, `sessionTokenDigest`, des identités vérifiées, memberships et ACL client/projet canoniques existants. Aucun mécanisme d'identité parallèle.
- Cookie absent, malformé ou dupliqué : **401**, avant toute lecture DB. Un token correctement formé mais inconnu n'authentifie personne : **403**, sans données.
- Les quatre sélecteurs explicites doivent être uniques et valides. Sélecteur absent/dupliqué, `default` ou caractère dangereux : **400** ; session externe : **403**.
- `clara_native_read_session` vérifie dans un seul snapshot SQL : session d'authentification non révoquée/non expirée, identité vérifiée, membership actif, client et projet actifs, relation client/projet exacte, deux ACL `can_read`, attestation active appartenant au principal et au périmètre demandé, empreinte exacte du JSON persistant.
- La mission embarquée doit également avoir une attestation de même propriétaire/périmètre/version et être identique au JSON du store Mission. Une mission d'un autre projet est refusée, même si l'utilisateur peut lire les deux projets.
- Révocation, changement de contenu ou absence d'attestation : **403**. Indisponibilité DB, migration absente ou erreur inattendue : **503**, code générique sans erreur fournisseur ou identifiant privé. Aucun repli global.
- Réponse minimale : état, recommandation, mission, dashboard et horodatages ; `acquisition:null`. Pas de chargement secondaire d'acquisition, de conversation ou du contexte global. `Cache-Control: no-store` pour succès et refus.

C'est une garantie de lecture dans le snapshot SQL courant, pas une garantie de transaction distribuée ni une promesse d'annuler une réponse déjà autorisée avant une révocation concurrente. La coordination d'archivage OS↔Live existante n'est pas modifiée.

Les autres handlers natifs passent d'abord par `nativeOperationFence`. Même une session explicitement autorisée retourne ensuite **503 `NATIVE_SCOPED_OPERATION_UNAVAILABLE`** : l'authentification ne suffit pas à isoler le runtime ou un adapter Drive global. Aucun provider, événement, sauvegarde, mutation, navigation opérationnelle ou brouillon ne s'exécute derrière cette barrière. Les handlers métier sont conservés pour une future intégration réellement isolée.

Les pages `/`, `/clara`, `/missions`, `/journal`, `/brain`, `/conversations` retournent un écran de verrouillage traduit avant leurs loaders globaux. Cela protège aussi le HTML et le payload RSC. Les composants commerciaux/documentaires existants restent présents et testés en isolation, mais leurs anciennes opérations natives ne sont pas déclarées disponibles.

`api/clara/physical-actions/approve`, les routes canoniques, archives et externes conservent leurs contrôles gouvernés existants ; aucun contournement natif ni commande matérielle n'a été ajouté ou exécuté.

## Migration nécessaire, non exécutée en Production

Fichier : `db/migrations/012_native_resource_authority.sql`.

Prérequis : migrations **001** (identités/memberships/sessions), **002** (identités vérifiées) et **008** (clients/projets/ACL) déjà revues et appliquées sur l'environnement cible. Pour l'archivage, les prérequis 009/010 restent inchangés.

Effets additifs :

1. Création des stores Mission/Session uniquement s'ils n'existent pas ; aucune transformation ni association de leurs données.
2. Table `clara_native_resource_authority` : type/ID de ressource, utilisateur propriétaire, workspace/client/projet canoniques, SHA-256 de version, reviewer, motif et date de revue, révocation. FK vers utilisateurs et triplet canonique projet/client/workspace ; une seule attestation active par ressource.
3. Trigger d'insertion : reviewer vérifié, membership et droits canoniques `can_manage` client/projet ; propriétaire vérifié, membership et deux droits `can_read`. Les utilisateurs sans les droits explicites nécessaires ne peuvent pas être désignés par un simple ID.
4. Attestation immuable ; seule la première révocation est permise. Suppression et réactivation interdites par trigger. Une nouvelle version exige la révocation préalable et une nouvelle revue ; l'historique est conservé.
5. Fonction SQL de lecture, permissions `PUBLIC` révoquées. Aucune API publique de création d'attestation, aucun bootstrap à partir d'un email et aucun job de backfill.

**Migration appliquée uniquement dans une nouvelle base PostgreSQL jetable, puis base supprimée.** Le test compare le JSON historique `default` avant/après et constate zéro attestation automatiquement créée. Aucune commande Neon/Production n'a été lancée.

Avant une intervention administrative autorisée : sauvegarde vérifiée des stores et du registre, inventaire des schémas/rôles existants, contrôle des prérequis et permissions du rôle applicatif ; revue de la migration en staging isolé. Ne pas ajouter des privilèges ou appliquer la migration sans autorisation distincte.

L'établissement d'une attestation historique exige une revue humaine des identifiants canoniques, une preuve indépendante du propriétaire et du périmètre, la revue de **tout** le contenu de session/dépendances, puis un reviewer disposant des droits de gestion. Calculer l'empreinte du JSONB exact ; attester séparément Mission et Session. Si une preuve manque ou que le contenu mélange des clients/projets, conserver la ressource sans attestation et refuser la lecture. Aucun exemple SQL avec des identités réelles ni aucune exécution de ce processus dans cette mission.

Une future ressource native peut être créée avec son périmètre explicite à l'origine ; cela demande un runtime et un parcours de création/choix de projet réellement isolés, absents de cette passe. La migration seule ne déverrouille ni pages ni opérations. Pour Drive, il faut en plus contrôler la connexion autorisée, l'identité du document, ses droits fournisseur et son rattachement projet ; une attestation de session ne remplace jamais ces contrôles.

Retour arrière non destructif : garder les barrières serveur et les données ; révoquer les attestations/permissions concernées si une lecture doit être désactivée, après autorisation administrative. Ne pas supprimer les tables/données/historique et **ne pas remettre en service l'ancien endpoint global vulnérable**. L'absence de migration laisse les lectures verrouillées (503), pas permissives.

## Preuves exécutées sur cette passe

| Vérification | Résultat / portée exacte |
|---|---|
| Autorité native | **7/7**, zéro ignoré ; 32 refus de handlers, six pages avec zéro loader global invoqué, indisponibilité et mutation refusées, cookie/sélecteurs négatifs |
| PostgreSQL réel isolé | Inclus dans les 7 tests : **18 lectures** ; accès propriétaire, refus inter-utilisateur même avec ACL projet ouvertes aux deux utilisateurs, inter-workspace/client/projet, token inconnu, ressource non liée, expirations/révocations, versions Mission/Session, mission d'un autre projet, contexte produit externe, reviewer non autorisé, immutabilité et histoire préservée |
| HTTP/browser réel local peuplé | **2/2** : 30 visites de pages sur cinq langues sans contenu privé dans HTML/RSC/body ; **20** refus HTTP sans cookie/invalide et **1** token inconnu. APIs non interceptées ; tous les fetchs fournisseurs bloqués par la fixture serveur |
| Documents/PDF/routes/archive | **29/29**, PostgreSQL et PDF locaux ; anciens adapters métier testés avec fence explicitement mockée, pas une validation d'accès serveur Drive |
| P0 continuité externe, durable, document et génération | **36/36**, PostgreSQL isolé ; providers simulés ; vrais handlers externes conservés |
| Canonique / OS↔Live / OIDC | **11/11**, dont **18 scénarios/checks de concurrence** avec handlers OS/Live et PostgreSQL/MongoDB isolés ; aucun service Production testé |
| i18n/rendu/voix/commercial/OAuth | **29/29**, 2 880 messages ; les tests de métier/presentation qui mockent une fence ne certifient pas l'autorité serveur |
| Browser composants Documents/archives et cinq langues | **8/8**, APIs mockées et 60 visites ; vérifie UI existante et traductions, pas une opération Drive native autorisée |
| Approbation physique OS↔Live | `npm run physical-approval-route:check` : succès offline ; aucune commande matériel/fournisseur |
| TypeScript / lint ciblé / build webpack | Succès ; police de build locale simulée, aucun déploiement |
| Lint global vs base `781976a…` | Même **10 erreurs / 14 avertissements**, diagnostics préexistants ; aucun écart de règle/message/fichier |
| Vitest historique vs même base | Même **20 succès / 2 échecs / 1 suite en erreur d'initialisation** ; trois fichiers : `acquisition-store.test.ts` (comptage SQL), `decision-brief.test.ts` (attente de décision spécialiste), `api/external/project-intake/route.test.ts` (mock hoist `dispatchEvent`) ; aucune décision Brain changée pour les masquer |

Commandes reproductibles :

```sh
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/native-authority.test.ts src/tests/native-authority-postgres.test.ts
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-p0 node --import tsx --test src/tests/production-p0.test.ts src/tests/production-p0-postgres.test.ts src/tests/event-jobs-postgres.test.ts src/tests/external-event-message-contract.test.ts src/tests/document-analysis-failures.test.ts src/tests/commercial-operational-continuity.test.ts
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/canonical-registry-postgres.test.ts src/tests/canonical-archive-service.test.ts src/tests/canonical-archive-concurrency.test.ts src/tests/verified-sign-in.test.ts src/tests/sign-in-transaction.test.ts src/tests/authenticated-session-lifecycle.test.ts src/tests/session-request-security.test.ts
```

Pour les autres commandes isolées et le preload local, voir le README. Le workflow `native-authority-validation.yml` utilise uniquement un PostgreSQL jetable et les migrations locales ; les workflows Documents/i18n/P0 existants conservent leurs validations. Aucun secret requis par ces tests.

## Limites et conditions de GO

- Correction P0 de la fuite : validée en isolation, pas encore déployée. La Production existante n'est pas corrigée par une publication GitHub.
- La disponibilité native est volontairement restreinte : pages et mutations globales verrouillées. Ce changement doit être explicitement examiné ; il ne faut pas annoncer les anciens parcours natifs comme opérationnels.
- Pour GO opérationnel : runtime/queries/adapters strictement isolés, sélection explicite workspace/client/projet et création propriétaire dès l'origine, document et dépendances autorisés, reprise/édition sous les mêmes ACL, recette deux vrais comptes/projets sans provider non autorisé ; acceptation des écarts et contrôles Production manquants.
- Pour examen du correctif conservatoire : tests ciblés verts, maintien du Draft, absence de Preview/build Vercel, prérequis de migration identifiés, revue de l'impact de verrouillage. Lint/Vitest global restent des dettes distinctes, pas « tout vert ».
- PR #176 actualisée sur sa branche existante ; aucune autre branche/PR ni code Clara Live modifié. Aucun merge, migration Production, changement de secret/configuration, déploiement, envoi fournisseur ou appel.
