# Contrat spatial canonique v1 — Clara OS / Clara Live

Extension additive `stage:light:mutate:v1`. Les capacités `read`, `archive`, `voice:conversation` et le callback MVR ne deviennent jamais des droits spatiaux. `clara.unified-core.event.v1` et sa quarantaine MVR restent inchangés. Aucun second moteur, identité ou connecteur.

## Autorités et étapes

1. Live authentifie le propriétaire existant du projet et la préparation ; une déclaration opérateur explicite produit un intent immuable dans le registre de preuves existant. Elle ne sauvegarde aucun modèle canonique.
2. OS reçoit seulement son identifiant, depuis une session native sélectionnée et authentifiée, avec contrôle same-origin. Il résout les associations canoniques déjà consenties, demande la preuve à Live, puis vérifie dans PostgreSQL la session native, l’identité, le workspace, le client, le projet, les ACL de gestion et le nouveau droit `can_mutate_light`. Ce droit est faux par défaut. Un owner/admin disposant des droits client/projet peut l’accorder explicitement via l’action `grantLight` ; il ne remplace pas les autres autorités.
3. La décision OS conserve l’intent, le digest de session et un condensat de nonce cryptographique. Validité de consommation : 45 secondes. Le nonce n’est retourné qu’au demandeur autorisé et ne doit pas être journalisé.
4. Live reçoit uniquement intentId/decisionId/nonce, vérifie l’acteur et consomme auprès d’OS. Les permissions sont contrôlées au claim. Il relit le run Light sélectionné et son digest, la révision de préparation, les preuves Live et les octets GDTF détenus. Le profil est reparsé et son SHA-256 comparé. Aucun modèle arbitraire du navigateur n’est accepté.
5. La création/révision et le reçu sont inscrits atomiquement dans UN document `stage_models`, avec write concern majority/journal, sur le primaire. Le filtre compare la version de mutation, la révision canonique et le modèle réellement lu, l’absence de consommation/annulation de cette décision et la date limite Mongo. L’index unique existant owner/projet est obligatoire ; son absence ferme le writer.
6. Le reçu est confirmé dans le registre OS ; Live vérifie le schéma, l’état committed, la décision, le digest d’intention et l’égalité exacte du reçu retourné avant d’annoncer sa confirmation. En cas d’acquittement perdu, le même appel retrouve le reçu Mongo et confirme OS sans créer de révision. Aucun retry de transport automatique n’est ajouté.

## Contrats

- `clara.stage-intent.v1` : capacité, intentId, scope OS/Live et session native, projet/préparation, révision de préparation, run Light/digest, identités exactes des fixtures, références Library/GDTF/SHA-256/mode, poses opérateur, unité m, repère `clara_stage_v1`, attestation du repère source et digest du modèle calculé par Live.
- Une création requiert `expectedRevision: null` et un `initialStage` explicite (surface, élévation et contour). Aucune position ni surface préalable dans le run Light n’est nécessaire. Pour un modèle existant, `initialStage` doit être null : une opération Light ne peut remplacer sa surface.
- Chaque pose fournit x/y/z et les trois angles avec `clara_intrinsic_zyx_right_handed_degrees_v1`. Les nombres non finis, champs supplémentaires, fixtures étrangères et références non prouvées sont refusés.
- `clara.stage-decision.v1` : identifiant OS unique, état approved/claimed/committed/revoked, expiration et intent lié. Un claim déjà enregistré peut être repris avec le même nonce/intention tant qu’il reste valide ; aucune nouvelle expiration n’est accordée.
- `clara.stage-receipt.v1` : modelId, revision, modelDigest, parent, decisionId, intentDigest, preparationId et runId.
- Une révision est SHA-256 de la chaîne UTF-8 `clara.stage-revision.v1\n<decisionId>\n<parent ou none>\n<modelDigest>`. SQL recalcule cette formule lors de la confirmation. Le digest de contenu reste distinct : A → B → A conserve trois révisions et le premier reçu. Une opération sans changement est refusée explicitement.

## Protection des autres métiers

Seules les poses des fixtures ciblées peuvent changer. Les structures de la vue Light ne sont jamais importées implicitement ; seuls les placements explicitement ciblés passent à l’adaptateur. Une fixture existante doit conserver ses références Library/GDTF exactes ; le remplacement de profil n’est pas déduit d’un mouvement. Les autres objets et métadonnées du modèle sont conservés. La création utilise les adaptateurs existants et les faits de préparation confirmés ; la reconnaissance explicite de `spatial.video` complète l’adaptateur multidisciplinaire. Les positions sémantiques restent sans coordonnées inventées. Les modèles et les données des worksheets ne sont pas remplacés par la vue Light.

Le writer Product Baseline historique ne peut écraser un modèle passé sous ce protocole : filtre d’autorité et index unique le refusent. Son comportement reste inchangé pour les modèles historiques non rattachés à cette autorité.

## Révocation et reprise

L’action OS `revoke` vérifie l’autorité, demande une annulation Live et n’annonce revoked qu’après l’accusé durable Mongo. Annulation et commit utilisent la même clé de décision dans le même document : si l’annulation gagne, une écriture retardée échoue ; si le commit gagne, son reçu est confirmé et OS retourne un conflit « déjà commis ». Il n’existe pas de rollback silencieux d’une révision.

Les contrôles d’ACL/session s’effectuent à l’approbation et à la consommation. L’annulation d’une opération déjà consommée passe par ce protocole de révocation explicite ; aucune atomicité distribuée générale entre toutes les ACL PostgreSQL et MongoDB n’est prétendue. Une seconde lecture OS n’est pas présentée comme une garantie atomique.

Le même propriétaire réauthentifié peut lister ses décisions pendantes et les annuler sans posséder l’ancien nonce. Il ne peut pas renouveler le claim d’une ancienne session. Si Live a déjà commis mais OS a perdu l’acquittement, le reçu Live est confirmé, pas réexécuté. Une désactivation Light exige le règlement des décisions pendantes. Les tentatives d’accès et confirmations peuvent laisser plusieurs événements d’audit ; la décision, son reçu et la révision métier restent uniques.

## Endpoints

Live, JWT/session existante et scope propriétaire :
- POST `/api/projects/{project}/stage-model/intents` : déclaration opérateur (`operationId` stable, run/digest, préparation, révision attendue, repère, initialStage ou null, poses, approve=true).
- POST `/api/projects/{project}/stage-model/decisions` : application de la décision OS, sans modèle fourni par le navigateur.
- GET `/api/projects/{project}/stage-model/revisions/{revision}?preparation_id=…` : révision sauvegardée exacte.
- GET `…/stage-model/view?preparation_id=…&revision=…` et `…/plan.pdf?preparation_id=…&revision=…` : vues/export de cette révision.
- POST `…/plate.pdf?source_revision=…` : sélection historique explicite, qui doit correspondre à la capture. Sans ce paramètre, les protections de capture courante sont conservées.

OS, cookie canonique, same-origin et sélecteurs workspaceId/clientId/projectId/sessionId : POST `/api/native/stage`, actions `grantLight`, `approve`, `list`, `revoke`. Les sessions external:… sont refusées.

Serveur à serveur, identité produit existante et capacité dédiée : POST `/api/core/canonical/stage` (claim/inspect/settle). Les callbacks Live `/api/core/canonical/stage/inspect` et `/cancel` réutilisent l’authentification produit existante. Aucun navigateur ne reçoit le secret produit.

Les vues et dossiers d’une révision canonique utilisent son run Light sauvegardé exact ; un brouillon Light ultérieur n’est pas substitué. Le PDF cite le reçu, la décision et le parent. L’archivage documentaire existant conserve les octets exportés.

## Installation et limites

Migration OS 027 additive après les fondations 001/002/008/009/010/012 ; sur cette branche elle suit 025/026. Aucune application distante n’a eu lieu. Les fonctions sont SECURITY INVOKER et sans EXECUTE PUBLIC. Le runtime a besoin des droits existants sur l’autorité/native, SELECT/INSERT/UPDATE sur clara_registry_stage_decisions, INSERT/audit et USAGE sur sa séquence, EXECUTE sur la nouvelle commande ; si les grants sont par colonne, inclure can_mutate_light. Aucun CREATE de schéma ni rôle propriétaire requis. Ces droits ont été éprouvés par SET ROLE sous un rôle PostgreSQL réellement limité, distinct du propriétaire, sans DDL.

Réutiliser les paramètres produit existants : côté OS CLARA_LIVE_PRODUCT_TOKEN/WORKSPACE_ID/CAPABILITIES/CALLBACK_BASE_URL ; côté Live CLARA_OS_BASE_URL/PRODUCT_ID/PRODUCT_TOKEN. Ajouter explicitement la capacité dédiée après revue, sans modifier de secret ici. Les associations et droits ne sont jamais inférés d’un nom ou email.

Les projets restent mono-propriétaire selon les contrats Live existants. La concurrence testée oppose deux décisions autorisées du propriétaire ; un autre acteur concurrent est refusé. Aucun partage de droits entre propriétaires n’est inventé. Le visualiseur reste en lecture seule : le parcours d’écriture reçu est celui des endpoints opérateur/OS, pas un nouvel éditeur graphique.

L’intent est borné à 48 Ko et l’historique incorporé à 15 Mo, sous la limite BSON ; dépassement = refus explicite, sans suppression d’historique. Les modèles historiques sans références GDTF prouvées ne sont pas rattachés automatiquement. Aucune certification fabricant, fournisseur, matériel, Neon distant ou Production n’est revendiquée.
