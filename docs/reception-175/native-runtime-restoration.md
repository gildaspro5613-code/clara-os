# Restauration native sécurisée — suite #175 / Draft #176

**GO isolé pour le socle natif décrit ci-dessous. NO-GO pour la réception Production complète.** Travail sur `fix/os-operational-reception-175`, depuis `505c4e7`. Aucun changement Clara Live, merge, déploiement, Preview, migration Production ou appel fournisseur réel.

## Parcours réellement rouverts

| Parcours | Fonction vérifiée | Limite maintenue |
|---|---|---|
| Sélection | Workspace, client puis projet issus des APIs canoniques ; confirmation explicite par ouverture/création d'un fil | Aucun choix automatique du dernier projet/fil. Liste UI limitée aux 50 premiers clients/projets, workspaces aux 100 du contrat existant |
| Fils | Création propriétaire à l'origine, liste de ses fils du projet, reprise explicite par ID et cookie de sélection HttpOnly/Secure/SameSite | Le cookie de sélection est une préférence non fiable, jamais une identité ; appartenance/ACL/version revérifiées à chaque requête. Historique sans attestation non sélectionnable |
| Cockpit | Mission courante du fil, autres missions privées du projet et compteurs explicitement contextualisés | Pas de queue d'acquisition globale ni de données d'un autre utilisateur. Agenda, navigation, météo et voix non certifiés ne sont pas activés dans cette vue native |
| Clara | Même Core/Brain existant, historique privé persistant et nouvelles réponses ; contextes utilisateur/workspace/client/projet/session injectés par le serveur | OpenAI simulé en recette ; qualité/coût/disponibilité fournisseur réels non certifiés. Les propositions matérielles et commandes externes restent refusées |
| Missions | Consultation privée du projet, création explicite, changement de statut autorisé ; confirmation/réouverture persistée des tâches manuelles | Une tâche portant un contrat d'exécution ne peut pas être déclarée exécutée par une checkbox. Exécution native et ancien resume restent fermés ; clôture avec tâche exécutable non achevée refusée |
| Journal | Événements Core et actions manuelles persistés, isolés par propriétaire/projet/fil | Historique global/Brevo non rattaché exclu ; aucune attribution automatique |
| Conversations | Historique du fil choisi, retrouvé après navigation et nouvelle requête | Aucun mélange de fil récent, `default`, autre utilisateur ou autre projet |
| Brain | Snapshot produit par le vrai cycle du Core dans le périmètre choisi | Mémoire historique et connaissances apprises globales exclues ; modules de connaissance publics existants réutilisés |
| Documents | Contrôle d'appartenance canonique d'une attestation documentaire via endpoint de vérification | **Lecture/écriture Drive non rouvertes**. Appartenance OS ne certifie ni compte Google connecté, ni droits Drive actuels, ni révision du contenu |

Le contexte actif reste affiché pendant la préparation d'une autre sélection ; celle-ci ne devient active qu'après ouverture/création confirmée. Les contrôles de création reflètent les droits `can_manage` renvoyés par le serveur, qui les revérifie lors de l'opération.

## Extension du Core existant

`src/lib/native/scoped-context.ts` adapte les stores et le runtime existants via un contexte **par requête** (`AsyncLocalStorage`). Il ne crée ni Brain, ni identité, ni modèle Mission/Session parallèle.

- Identité : cookie/digest, identités vérifiées, memberships et ACL canoniques existants. Les noms, emails, titres et missions récentes ne participent pas à l'autorité.
- Stores Mission/Session/Journal : lecture de données autorisées et écritures préparées dans la requête ; aucune requête au store global dans ce mode.
- Runtime : instance Clara du fil choisi ; aucun repli `getCurrentMission` global. `dispatchEvent` injecte le contexte canonique serveur ; aucune confiance dans un contexte fourni dans le message.
- Le Cockpit transmet les missions déjà autorisées à ses composants asynchrones : ceux-ci ne relancent pas de loaders globaux après le rendu du parent.
- Les nouvelles ressources sont créées dans les tables métier existantes, avec IDs `native:*` générés par le serveur et attestation liée au principal dès l'origine. Le préfixe **n'accorde aucun droit** : les checks SQL restent nécessaires. Les anciens stores sans contexte excluent/refusent ce namespace, y compris journal et mutations, pour protéger aussi le raccord externe.
- Les sources fournisseurs non certifiées sont explicitement indisponibles, jamais substituées par les données du workspace global. Les anciennes données persistées ne sont ni attribuées ni retraduites.

## Persistance et concurrence

Migration additive **013** : `db/migrations/013_native_scoped_runtime.sql`.

Prérequis : 001, 002, 008 et 012 ; stores métier existants. La migration initialise le journal uniquement s'il est absent, ajoute sa relation de périmètre et la fonction `clara_native_runtime_command`. Aucun backfill ni migration Production.

Création et commit utilisent le verrou workspace en premier, comme le registre canonique, puis verrouillent les lignes d'autorité utilisées (auth/session, membership, client/projet et ACL, identités vérifiées). Les écritures demandent les deux droits `can_manage` ; une lecture seule ne suffit pas.

Le cycle asynchrone prépare ses écritures sans transaction ouverte ni singleton partagé. Le commit recontrôle les droits et compare le **JSON original exact de session** : conflit concurrent → **409**, aucun écrasement. Session, missions, journal et révisions d'attestation sont persistés dans la même transaction. Révocation validée avant ce commit → refus et aucune persistance. Indisponibilité → erreur générique, aucun repli global.

Une mise à jour de mission rafraîchit ses références uniquement dans les autres fils `native:*` dont le même propriétaire/périmètre et le hash existant sont déjà prouvés. Conversations inchangées ; attestations précédentes révoquées et conservées. Ni ressource inconnue, ni `default`, ni fil étranger ne sont rattachés. Cela évite qu'un ancien fil autorisé devienne illisible après une évolution de sa mission et fait échouer une écriture concurrente devenue obsolète.

Une réponse fournisseur interrompue conserve l'historique partiel dans le fil autorisé, conformément au comportement P0 existant. Les erreurs de validation/refus et propositions non certifiées n'appliquent pas les écritures préparées. Une réponse déjà autorisée avant révocation ne peut pas être effacée du navigateur ; les requêtes et commits suivants sont revérifiés.

Risque résiduel : sérialisation courte des commandes par workspace ; mesurer la contention en staging réaliste. Les retries après une réponse réseau perdue ne constituent pas un protocole général d'idempotence. Ne pas annoncer ces limites comme validées en Production.

## Endpoints

- `GET /api/clara/session` : contrat de lecture privée 012 conservé, sélecteurs explicites en query ou issus de la sélection confirmée, jamais `default`.
- `GET /api/native/runtime` : lecture privée et droits d'écriture observés ; `list=1` avec périmètre explicite liste seulement ses fils du projet.
- `POST /api/native/runtime` : `createSession`, `selectSession`, `createMission`, `setMissionStatus`, `toggleTask`. Corps borné, champs fermés, origine HTTPS configurée, contrôle canonique ; IDs et propriétaire de création serveur.
- `POST /api/clara/chat` : handler métier existant placé dans l'adaptateur de requête/commit sécurisé.
- `GET /api/native/documents/authorization?fileId=…` : **403** si attestation absente/étrangère ; si appartenance OS vérifiée, **409 `DRIVE_PRINCIPAL_AND_PERMISSION_PROOF_REQUIRED`**, `driveRightsVerified:false`, `contentRevisionVerified:false`, `readAllowed:false`. Aucun accès Drive.
- Autres APIs natives globales/provider : barrières précédentes conservées. Routes canoniques/archives/externe et approbation physique gouvernée OS↔Live préservées.

## Dépendances documentaires et commerciales non certifiées

Le modèle `Connection` n'a pas de propriétaire canonique utilisateur ni de sujet Google vérifié. `DriveClient` utilise encore le mécanisme global `GoogleAuth`. Ni `fileId`, nom, parent, email Google ou workspace courant ne prouvent l'appartenance au client/projet choisi.

Avant ouverture Drive : établir une association authentifiée/auditée entre connexion OAuth existante et identité canonique, avec sujet fournisseur vérifié ; revalider les droits du principal connecté par les APIs Drive existantes, l'appartenance documentaire explicite et la révision du contenu ; rejeter 401/403/versions changées avant tout usage cognitif. **Ne pas inventer cette association à partir d'un email.** Le contrat de vérification OS ajouté est seulement la première partie de cette certification.

Acquisition, brouillons commerciaux, approbations de transport, navigation, agenda, téléphonie et connecteurs historiques requièrent leurs propres relations/permissions de périmètre. Ils ne sont pas déverrouillés par la seule création d'un fil natif. Aucun envoi/campagne/appel n'a été effectué.

## Vérifications exécutées

- **9 tests d'autorité/runtime**, zéro ignoré : PostgreSQL réel, deux utilisateurs avec ACL ouvertes sur les mêmes projets, deux clients et trois projets ; création, reprise/stop Core, journal, isolation, écriture concurrente CAS, révocation avant commit, utilisateur devenu lecture seule, références de mission multi-fils, namespace protégé et histoire inconnue préservée.
- **1 E2E HTTPS réel local**, APIs non mockées : sélection/création par l'UI, mission et chat persistés, 30 visites (six pages × cinq langues), second utilisateur avec mission distincte dans le même projet, confirmation puis réouverture de tâche manuelle réellement persistées ; mutation inter-utilisateurs, lecture inter-projets et origine étrangère refusées. Aucune tentative de loader SQL global acceptée ou masquée. **OpenAI seul simulé**, aucun fournisseur réel.
- **2 E2E négatifs**, 30 visites anonymes, 20 refus HTTP sans/invalide cookie et un token opaque inconnu ; absence de fuite HTML/RSC.
- **36 tests P0**, **11 canonique/OS↔Live/OIDC** (dont 18 scénarios/checks de concurrence), **29 Documents/PDF**, **29 i18n/rendu/voix/commercial/OAuth**, **8 browser UI**, tous passés sans ignoré. Les adapters/UI documentaires avec mocks ne certifient pas une lecture Drive native réelle.
- Build webpack local, TypeScript, ESLint ciblé et contrôle offline d'approbation physique : succès. Lint global : mêmes **10 erreurs/14 warnings** ; Vitest : mêmes **20 succès, 2 échecs, 1 suite en erreur** que la base, mêmes fichiers documentés précédemment. Aucune décision Brain changée pour masquer ces dettes.

Preuves et horodatages : section `nativeRuntimeRestoration` de `evidence.json`. Le workflow Native teste PostgreSQL et le vrai navigateur avec serveur HTTPS local, certificat de test épinglé et OpenAI simulé ; aucun secret ni déploiement Vercel requis.

## Registre Production — non exécuté

1. Vérifier SHA servi, environnement réellement cible et règle Vercel production seulement ; toute intégration/déploiement requiert autorisation distincte.
2. Recette OIDC réelle : deux comptes, memberships/ACL distincts, sélection explicite, expiration/logout/révocation, refus inter-workspace/client/projet/utilisateur. Aucune déduction d'appartenance.
3. Avant migration autorisée : sauvegardes vérifiées des stores et du registre, inventaire du schéma/rôles, revue 012 puis 013 en staging, permissions explicites du rôle applicatif (`SECURITY INVOKER`, `PUBLIC` révoqué), simulation de retour arrière. Ne pas supprimer les données/attestations ni remettre l'ancien runtime global vulnérable.
4. Historique : toute attestation manuelle exige preuves indépendantes, reviewer autorisé et revue du contenu/dépendances. Sinon conserver non rattaché, non lisible ; aucun job automatique.
5. Tester concurrence et pannes réalistes en staging, contention workspace, réponse perdue et politique de retry ; puis recette sur le build Production autorisé.
6. Obtenir les preuves de connexion/principal/droits/révision Drive avant l'ouverture documentaire ; comptes et fichiers de test désignés. Ne pas lire de secrets ni activer de fournisseur pour contourner un manque.
7. Vérifier OpenAI/budget/locale réels, scopes fournisseurs et autres parcours uniquement après autorisation ; aucune simulation assimilée à une réception réelle.
8. Lever ou accepter explicitement les écarts commerciaux, voix/transport/connecteurs et dettes lint/Vitest. **Issue #175 et réception Production restent ouvertes / NO-GO. PR #176 reste Draft.**
