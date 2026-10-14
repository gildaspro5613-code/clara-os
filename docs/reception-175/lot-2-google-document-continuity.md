# Lot 2 — Google Workspace, Drive et Documents

**Décision : GO en isolation ; NO-GO Production.** PR [#176](https://github.com/gildaspro5613-code/clara-os/pull/176) Draft, branche `fix/os-operational-reception-175`. Référence lot 1 : `334c8ec`. Implémentation initiale `43045b9`, tests SQL `80a8739`, correction finale et application testée `bafae5454648da31afa7e84a3d968b01c7895ca2`. Google et OpenAI sont simulés ; PostgreSQL, les stores, PDF, Core/Brain, Journal et les handlers sont réellement exercés. [Preuves structurées](lot-2-evidence.json).

## A. Audit et raccords réutilisés

L'audit a précédé les changements : sessions/identités vérifiées et memberships 001/002, registre client/projet et ACL 008, attestations natives 012, runtime/contextes 013/014 ; ConnectionRepository, OAuthAuthorizationService/OAuthCallbackService et états HMAC ; GoogleAuth, deux DriveClient, GoogleDriveEngine/DriveFiles/DrivePermissions/DriveHealth ; CredentialStore AES-256-GCM ; lecteur PDF borné et worker ; event-bus, Clara/orchestrate, construction des sources Brain et response-composer ; Session/Mission/Journal/Cockpit et sélection canonique existante.

Défauts confirmés : connexion Google globale sans propriétaire canonique, callback non lié à l'acteur/projet/fil, absence de preuve issuer/subject avant persistance, absence de délégation, attestations documentaires OS insuffisantes pour Drive/révision, absence de référence durable native, API documentaire encore dépendante du singleton global. Le téléchargement historique utilisait un arraybuffer non borné.

Un test négatif supplémentaire a confirmé puis corrigé une anomalie du premier raccord : une nouvelle déclaration pouvait placer le même fichier dans un autre projet. Le refus inter-projets/inter-propriétaires est maintenant imposé avant métadonnées ; une identité documentaire Google conserve un seul contexte canonique actif. Le partage dans ce contexte passe par la délégation explicite, pas par une réaffectation.

Aucun nouveau connecteur, bibliothèque documentaire, store métier ou système d'identité. La nouvelle couche native est une autorité sur les services existants. Le handler documentaire antérieur est conservé **fencé** dans `src/lib/documents/workspace-handler.ts` pour compatibilité des services et leurs tests ; il n'est exposé par aucune route native. Ses tests avec cognition/auth simulées ne certifient pas la nouvelle autorisation.

## B. Modifications nécessaires

- Migration additive **015** : autorités Google explicitement détenues, délégations client/projet révocables, transactions OAuth liées à la session canonique ; métadonnées sur les attestations documentaires existantes. Plusieurs connexions Google explicites sont possibles ; unicité des autres fournisseurs conservée. Aucune attribution historique.
- OAuth commun : hook de validation avant CredentialStore ; id_token Google transporté jusqu'au vérificateur RS256 canonique réutilisé ; audience/issuer/subject/nonce/expiration contrôlés. Callback vérifie d'abord acteur, workspace, client, projet, fil, nonce et session d'origine. Consommation, credentials chiffrés et activation sont atomiques PostgreSQL. Changements de compte, rejeu ou contexte refusés.
- GoogleAuth/DriveClient : identifiant explicite obligatoire, aucune recherche dans CURRENT_WORKSPACE_ID. En contexte natif, repository et credentials répètent l'autorité canonique ; refresh réutilisé, persistence conditionnée par la révision de l'autorité. Principal courant confirmé par l'endpoint Google userinfo fixe. Transport natif borné, sans retry implicite.
- Documents : recherche limitée aux fichiers attestés du projet ; inspection explicite puis confirmation de rattachement par propriétaire/gestionnaire autorisé ; permissions Google actuelles, principal et révision contrôlés avant/après lecture/analyse. PDF et téléchargements utilisent les services existants et des flux bornés. Formats non extractibles restent refusés, sans OCR.
- Références et résultats : ajout optionnel dans les **Session/Mission existantes**, analyses chiffrées par le codec CredentialStore. Anciennes révisions conservées. Chaque reprise revalide Drive et la révision ; résultat indisponible sans nom ni analyse si la preuve manque. Le Journal conserve des identifiants, révision, mission, autorité et date, sans texte documentaire persistant en clair.
- Core/Brain : source Drive fraîche injectée dans le registre existant, vrai DOCUMENT_RECEIVED et vrai compositeur. Le cycle documentaire temporaire ne remplace pas la mission, les décisions, conversations et brouillons commerciaux. La question métier est explicite dans le panneau documentaire de Clara ; aucun chargement automatique du dernier document.
- Interfaces existantes : sélection Google et revue dans Documents/Clara, restitution vérifiée dans Cockpit/Brain, reprise explicite d'une mission autorisée dans le sélecteur natif. Libellés ajoutés dans les cinq dictionnaires. Les écritures Drive restent fermées ; contrôles UI désactivés en lecture seule.
- Workflow natif existant étendu aux tests Google/documentaires et à 015. Aucun nouveau workflow. Aucun test supprimé ou désactivé. Les anciens tests UI de lecture ont été adaptés au POST nécessaire pour l'analyse avec persistance.

Liste exhaustive des fichiers applicatifs et de test dans `modifiedFiles` du JSON de preuves (49 fichiers, avant ce rapport). Migrations **012/013/014 strictement inchangées**. Clara Live strictement inchangé au SHA `48a2f94910d4a6111250e15046e0f471ddd6ac9b`.

### Endpoints du raccord

| Endpoint | Contrat |
| --- | --- |
| GET /api/connections/google | Connexions détenues/déléguées de ce contexte ; aucun token, secret ou subject retourné |
| POST /api/connections/google | Sélection explicite ; délégation/révocation par propriétaire autorisé ; session/membership/ACL recontrôlés |
| POST /api/connections/google/connect | Consentement openid + drive.readonly ; transaction liée à l'acteur et au contexte |
| GET /api/connections/google/callback | Vérification canonique et OIDC avant credentials ; consommation unique atomique |
| GET /api/connections/google/connect | Ancien déclenchement GET conservé fermé ; aucune mutation OAuth sans POST protégé |
| GET /api/documents | Recherche des fichiers attestés ; aucune liste de tout le compte Google |
| GET /api/documents?action=references | Résultats durables uniquement après revalidation actuelle |
| GET /api/documents?action=download&fileId=… | Téléchargement borné, preuves OS/Google/révision fraîches |
| POST /api/documents | inspect / bind / read ; champs fermés, même origine, contrôle d'écriture natif pour persistance |
| GET /api/native/documents/authorization?fileId=… | Vérification fraîche OS + Google + révision ; aucune autorisation durable ou contournement SQL |
| POST /api/native/runtime | selectMission ajouté : uniquement une mission propre déjà attestée ; contact lié explicitement sélectionné |

## C. Parcours documentaire complet démontré

Recette navigateur HTTPS du commit applicatif : sélection workspace/client/projet et nouveau fil → mission → initiation OAuth → refus du compte Google étranger → callback validé et refus du rejeu → choix de la connexion → inspection/confirmation de l'attestation → recherche et ouverture PDF → extraction réelle → Core/Brain/compositeur avec contenu autorisé → résultat chiffré et référence durable → Journal → Cockpit/Clara → rechargement → nouvelle session authentifiée du même utilisateur → nouveau fil avec reprise de la mission et de ses références.

Document partagé : propriétaire atteste le fichier au projet ; second utilisateur choisit la connexion explicitement déléguée, crée sa propre mission et analyse ce fichier dans son propre Journal. Révocation de la délégation refuse la reprise. Deux autres projets, dont celui d'un autre client, refusent le document.

Expiration Google simulée : un credential synthétique expiré déclenche le **vrai refresh SDK**, conservé par le CredentialStore et PostgreSQL ; autorisation et téléchargement repassent. Les prompts serveur sont contrôlés : texte autorisé réellement présent, marqueur documentaire étranger absent. Le navigateur bloque les origines externes ; le preload refuse les fournisseurs réels et tout loader SQL global.

## D. Sécurité, révocation et concurrence

Sans cookie, cookie invalide/dupliqué, session inconnue ou expirée, mauvaise propriété de fil/mission, mauvais client/projet : refus avant usage de données/providers. Connexion étrangère réellement détenue par le deuxième utilisateur : sélection refusée. Historique non attribué : aucun bind implicite. Callback forgé, nonce/audience/issuer/subject/signature/expiration incorrects ou rejeu : refus ; aucune écriture de credentials sur compte substitué.

Permission Drive retirée : réponse de reprise sans nom/analyse ; nouvelle lecture refusée. Révision modifiée : conflit ; confirmation explicite de la nouvelle révision nécessaire. Ancienne révision chiffrée préservée et non réutilisée comme contexte actuel. Principal Google changé : refus avant contenu. Inspection/réattestation d’un fichier déjà connu dans un autre contexte, même par un gestionnaire des deux projets, et réattribution par un autre propriétaire de connexion : refus. Révocation de connexion/delegation/projet pendant préparation : recontrôle SQL au commit, aucun résultat partiel persisté.

Deux analyses se préparent réellement en parallèle et se rejoignent au compositeur : exactement une Session/Mission/Journal persiste ; l'autre reçoit 409. La preuve Google/attestation et le CAS natif sont contrôlés dans **la même transaction OS**. Aucun simple second GET présenté comme une transaction distribuée.

**Limite réelle :** Google ne fournit pas de verrou transactionnel conjoint avec Neon. Les contrôles Drive décrivent une lecture datée et sont répétés avant/après contenu/analyse et à chaque reprise. Ils ne peuvent retirer rétroactivement des octets déjà remis au navigateur/LLM, ni promettre une atomicité Google/PostgreSQL. Aucune certification de droits Google Production n'est revendiquée.

## E. Tests exécutés et protection du lot 1

| Commande / groupe | Succès | Échecs | Ignorés |
| --- | --- | --- | --- |
| native-security-and-documentary | 15/15 | 0 | 0 |
| sql-application-role | 1/1 | 0 | 0 |
| native-commercial-documentary-browser | 3/3 | 0 | 0 |
| browser-ui-regressions | 10/10 | 0 | 0 |
| i18n-voice-commercial-common-oauth | 39/39 | 0 | 0 |
| documents | 29/29 | 0 | 0 |
| production-p0-isolated | 36/36 | 0 | 0 |
| canonical-os-live | 4/4 | 0 | 0 |
| authentication-workspaces | 25/25 | 0 | 0 |

Comptages par commande, non cumulés : certains tests sont communs à plusieurs groupes. Le renforcement SQL du dernier commit a réexécuté le test documentaire PostgreSQL complet. Les 3 E2E natifs incluent le lot 1 complet, le lot 2 et les pages natives ; les 10 E2E de régression incluent 60 visites multilingues, refus HTTP/HTML/RSC et UI document/archives avec API interceptées. Ces interceptions ne constituent pas une certification Drive.

Lot 1 : contacts attestés, mission liée, dialogue, Journal privé, préparation/édition de brouillon, Cockpit, rechargement et reprise après logout/nouvelle session ; refus inter-utilisateurs et projets, révocation et conflits de brouillon. **Aucun envoi commercial.** OS↔Live : 4 tests, dont 18 ordonnancements/checks réels PostgreSQL/MongoDB en isolation ; aucun changement Live.

TypeScript et lint ciblé réussis. Build webpack optimisé réussi, polices Google substituées localement ; aucun déploiement. Les workflows GitHub seront consignés séparément après publication.

Lint global : **10 erreurs, 13 avertissements préexistants** ; les 18 fichiers portant ces diagnostics sont identiques byte à byte à `334c8ec` (hashs dans les preuves). Vitest historique : **20 succès, 2 échecs, 1 suite en erreur**, mêmes trois fichiers que le lot 1 : comptage SQL acquisition, attente de décision spécialiste, mock hoist dispatchEvent. Aucun changement Brain ni test désactivé pour les rendre verts.

## F. Migration 015, permissions et retour arrière

Prérequis : vérifier 001/002/008 et 012→013→014, tables/colonnes/types, rôles et identités canoniques ; 015 s'applique ensuite. Ne pas rejouer ni réécrire les migrations antérieures en Production. Aucune migration Production exécutée ici.

Tests PostgreSQL 17 isolé : application et réapplication de 015, conservation des données/historiques, backup pg_dump/restauration dans une seconde base et réapplication, concurrence, PUBLIC sans EXECUTE. Rôle applicatif synthétique : SELECT + EXECUTE seuls refusent les verrous ; après grants INSERT/UPDATE, lecture et création de transaction Google réussissent. Les grants larges du test ne concernent que la base jetable.

Les fonctions restent **SECURITY INVOKER** : aucun privilège implicite, aucun RLS par utilisateur revendiqué. Le rôle SQL est celui du serveur de confiance, jamais du navigateur. Il lui faut les privilèges 012/013/014 existants, SELECT/INSERT/UPDATE adaptés sur clara_connections, clara_connection_credentials, clara_native_google_authority, clara_native_google_delegations, clara_native_google_oauth_transactions, et EXECUTE sur clara_native_google_command(text,text,text,text,text,text,jsonb). Les SELECT FOR SHARE/UPDATE requièrent aussi les droits UPDATE appropriés sur les tables canoniques déjà verrouillées. Faire réviser les grants par table/colonne ; le rôle applicatif n'a pas à disposer du DDL.

015 crée des tables uniquement si absentes, ajoute metadata sans backfill d'autorité, remplace l'unicité globale workspace/provider par une unicité conservée pour les fournisseurs non Google. Aucun document, mission, contact, identité ou credential historique n'est réattribué. Autorités Google et délégations conservent leur histoire de révocation ; propriétaire/issuer/subject ne se réécrivent pas. L'unlink canonique peut retirer la preuve courante sans supprimer les traces Google.

Avant toute application réelle : sauvegarde Neon/schema + restauration éprouvée, inventaire migrations/contraintes/grants, contrôle des identités Google canoniques et ACL. Privilèges/schema/backup Production restent **non vérifiés**, sans accès à des valeurs secrètes.

Retour arrière non destructif : désactiver le raccord par retour au code sécurisé du lot 1 et conserver 015 et toutes les données. Révoquer les autorités par mécanismes autorisés, sans DELETE, DROP, remise à zéro des revisions ou rattachement historique. Ne pas recréer l'unicité Google précédente si plusieurs connexions existent. Une restauration de sauvegarde ou configuration Production nécessite une autorisation distincte et un plan de préservation des écritures intervenues.

## G. Conditions et opérations restantes

| Condition / action humaine minimale | Isolation | Production |
| --- | --- | --- |
| Parcours documentaire + commercial et refus | PASS | Recette réelle non autorisée/non exécutée |
| Schéma 012/013/014/015, grants et restauration | PASS sur bases jetables | Audit, backup et application sous autorisation explicite |
| Identité Google canonique issuer/subject du propriétaire | Deux utilisateurs vérifiés de fixture | Contrôler liens existants ; zéro rapprochement par email/nom |
| OAuth Google openid + drive.readonly, callback et API Drive | SDK + RS256 + provider simulé | Vérifier consentement, client/redirect et politique Google ; jamais transmettre les valeurs |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI | Valeurs synthétiques | Présence/scopes Production à vérifier humainement |
| CLARA_AUTH_APP_ORIGIN, CLARA_CREDENTIALS_ENCRYPTION_KEY et URL SQL serveur existante | Injectés pour fixtures | Noms/privilèges présents et corrects à vérifier ; aucun changement effectué |
| OPENAI_API_KEY et fournisseur de génération existant | Simulés, prompts contrôlés | Certification réelle sous autorisation, aucun appel ici |
| Revocations et documents partagés | Partage direct et retrait de permission testés | Vérifier les cas Google réels et indisponibilités |
| Publications GitHub / builds Vercel | PR Draft, contrôle à consigner | Aucun merge, aucune Preview/Production, configuration inchangée |

Limites volontairement fermées : utilisateur sans Google identity canonique ou avec plusieurs subjects ambigus ; connexion/document historique non prouvé ; plus de 100 attestations à examiner par batch ; ensembles de permissions paginés ou sans permission ID du principal/anyone prouvée (groupes/domaines non certifiés) ; écritures Drive et Gmail ; transfert de propriétaire/client/projet d’un fichier déjà attesté (revue séparée requise, sans réaffectation implicite). Le diagnostic manque d'autorité reste un refus, sans déduire d'un nom/email/dossier ni bloquer les fonctions commerciales déjà autorisées.

**GO pour le lot 2 isolé uniquement. Réception #175 Production toujours NO-GO, PR #176 Draft. Aucun merge, appel/envoi fournisseur réel, modification Live, Preview, déploiement, migration ou changement de secrets/configuration Production.**
