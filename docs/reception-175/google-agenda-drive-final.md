# Dernier raccordement Agenda et Drive — PR #176

Base : `2b79a5df8b99bc3f4e392d698e71209e8b99e0ba`. Branche `fix/os-operational-reception-175`, PR Draft. Ce rapport complète les lots reçus ; les rapports antérieurs restent des preuves historiques, pas l'état courant des nouveaux raccordements.

## Périmètre et contrats réutilisés

Aucun nouveau Core, Brain, fournisseur, journal, store documentaire ou système d'identité. Les opérations utilisent les identités Google `issuer/sub`, memberships, ACL workspace/client/projet, Session et Mission natives, attestations de ressources, CredentialStore chiffré, GoogleAuth, clients Google existants, approbations et registre d'opérations existants. Clara Live et la PR #303 restent inchangés.

- **Agenda** : sélection du compte et du calendrier par identifiant explicite, liste paginée des calendriers, vérification des droits Google, rattachement explicite au projet et à la Mission sélectionnée, consultation paginée par intervalle, proposition de création/modification, confirmation exacte puis écriture. Aucun `primary` implicite. Les calendriers en lecture seule permettent la consultation, jamais la mutation.
- **Drive** : sélection explicite de la connexion et du dossier, rattachement après vérification, import binaire ou création de fichier texte, lecture/analyse avec Documents et Clara existants, modification de texte et classement/déplacement d'un fichier attesté. Le rattachement conserve les identifiants et les données. Les versions, capacités Google et `If-Match` sont contrôlés avant les modifications. Pas de déplacement/copier-coller de la base documentaire.
- **Interfaces** : le panneau d'autorité Google existant est partagé par Agenda et Documents ; les nouvelles commandes y sont intégrées. Les accès actuels Clara/Cockpit et les sélections Session/Mission sont conservés. La page Agenda et les éléments Agenda déjà présents dans le Cockpit se rafraîchissent après confirmation. Aucun outil de conversation ne reçoit un droit d'écriture implicite ; la confirmation se fait dans l'interface dédiée.
- **Barrière serveur** : `nativeOperationFence` demeure active. Seul son contrat de lecture Calendar est étendu pour une connexion et un calendrier sélectionnés et attestés. Les autres anciennes routes globales restent fermées. Les mutations utilisent `/api/native/google/work`, jamais le runtime global.

## Consentements minimaux et limites fonctionnelles explicites

Le flux OAuth signé existant conserve son nonce, l'émetteur, l'audience, l'expiration et le sujet canonique. Les scopes demandés sont enregistrés avec la transaction et comparés aux scopes réellement retournés. Un consentement partiel ne produit pas une connexion faussement disponible. Les scopes préalablement acquis sont conservés lors du consentement incrémental.

| Profil explicite | Scopes supplémentaires | Usage et limite |
|---|---|---|
| Lecture existante | `openid`, `https://www.googleapis.com/auth/drive.readonly` | Contrat documentaire historique conservé |
| Agenda | `https://www.googleapis.com/auth/calendar.calendarlist.readonly`, `https://www.googleapis.com/auth/calendar.events` | Calendriers existants autorisés ; pas d'invitation ni email |
| Fichiers de l'application | `https://www.googleapis.com/auth/drive.file` | Écriture sur fichiers/dossiers réellement autorisés à cette application ; saisir un ID ne donne aucun droit. `isAppAuthorized` et les capacités sont vérifiés |
| Fichiers existants, consentement distinct | `https://www.googleapis.com/auth/drive` | Option explicite seulement si les dossiers existants ne sont pas accessibles via `drive.file` ; consentement plus large à certifier par l'administrateur |

Le profil `drive.file` est proposé par défaut. Aucun Google Picker, nouveau connecteur ou second consentement parallèle n'est ajouté. Si le dossier souhaité n'est pas accessible à l'application, il reste refusé jusqu'au consentement adapté ; aucune déduction d'autorité par nom, email ou `root`.

Import limité explicitement à **2 Mio par fichier**, sans conversion Google Docs/Sheets/Slides. Les fichiers binaires sont créés avec leur MIME et leur somme de contrôle ; les modifications de contenu proposées concernent uniquement les fichiers `text/plain` attestés. Les événements avec participants sont refusés à la modification dans ce lot pour ne pas produire d'invitation réelle ; les créations ont zéro participant, aucun rappel et `sendUpdates=none`. Les événements datés sans horaire restent consultables mais leur modification n'est pas proposée. Les suppressions, récurrences avancées et invitations ne font pas partie des commandes offertes.

## Confirmation, concurrence et interruptions

La préparation enregistre un plan chiffré et son empreinte : acteur, contexte, Mission, connexion, destination, contenu, identifiant cible et versions. Le contenu proposé est consultable/téléchargeable avant confirmation. Le Journal contient la nature et les identifiants, pas les corps de fichier ni les jetons.

La confirmation exacte consomme une approbation et acquiert un propriétaire durable dans PostgreSQL **avant** toute mutation HTTP. L'identité d'opération ne peut pas servir un contenu différent. Deux confirmations concurrentes n'obtiennent pas deux propriétaires. L'import utilise un ID Drive préalloué ; les créations Calendar utilisent un ID déterministe. Une seule requête de mutation est remise au transport, sans retry SDK, redirection ni renvoi automatique.

PostgreSQL et Google ne forment **pas** une transaction distribuée atomique. Une interruption pendant/après le transfert conduit à `processing` ou `uncertain`. Elle bloque les nouvelles remises pour cette Mission/connexion jusqu'à résolution. Le bouton de vérification lit uniquement la ressource cible et compare marqueur privé, nom, contenu/checksum, destination et dates ; il ne recrée rien. Si l'effet ne peut être prouvé, l'opération reste incertaine et nécessite une investigation autorisée. Un refus HTTP certain (400/401/403/404/412/413) est enregistré comme échec ; un 409, une erreur 5xx ou un timeout reste prudent et incertain.

Le reçu final, la Session, la Mission, le Journal et l'attestation documentaire sont persistés ensemble dans la transaction native. Une contre-épreuve supplémentaire a reproduit une réconciliation terminant une modification Drive avant la persistance du requérant initial : ce dernier répondait à tort `uncertain`. La fonction SQL restitue maintenant le reçu immuable avant de revalider une attestation remplacée par cette même finalisation ; les réponses serveur relisent le reçu durable sans refaire l'action. L'épreuve avant/après vérifie le même reçu pour les deux requérants, une seule mutation et une seule entrée Journal. Un acquittement OS perdu se résout par lecture/rejeu du même reçu. Les reçus n'expirent pas avec la fenêtre de confirmation. Le worker d'événements existant exclut les opérations natives Google de ses prises et purges. Les révocations sont revérifiées à chaque étape ; une révocation ne peut annuler un effet déjà remis à Google et rend sa finalisation potentiellement incertaine. Aucune promesse d'atomicité externe n'est faite.

Les propositions/reçus enregistrés restent consultables sans appel Google lorsque le consentement est à renouveler, sous réserve que l'utilisateur, le contexte et l'autorité canonique restent autorisés. La révocation des droits canoniques ferme aussi cette consultation. Une délégation documentaire de lecture n'est jamais transformée en délégation d'écriture.

## Migration additive 020 et préparation Production

`db/migrations/020_native_google_workspace.sql` s'applique **après 012 à 019**, dans leur ordre. Elle ajoute les scopes demandés aux transactions OAuth, étend les catégories existantes de ressources et d'opérations et les fonctions d'autorisation ; aucune nouvelle table, identité, attribution historique, suppression de données ou migration automatique au démarrage.

Ne pas rejouer ensuite les anciennes définitions 015/016/017 : elles remplaceraient les extensions. La réapplication de 020 et une vraie restauration `pg_dump`/`psql` ont été testées sur PostgreSQL jetable avec empreintes des ressources, Missions, Journal, approbations et opérations.

Avant toute Production, le propriétaire doit autoriser et faire vérifier :

1. Concordance de la cible Neon avec Vercel Production, protections de branche, sauvegarde récente et restauration sur copie isolée. Ne jamais imprimer les URI ni les clés.
2. Droits du rôle de migration : propriété/DDL sur les tables et fonctions remplacées. Droits applicatifs natifs existants, plus `EXECUTE` explicite sur `clara_native_google_work_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB)` pour le rôle applicatif réel. Les fonctions restent `SECURITY INVOKER`, sans droits PUBLIC. Vérifier également USAGE du schéma et, pour un rôle limité par colonne, SELECT/INSERT sur le nouveau champ `requested_scopes` ; aucun BYPASSRLS n’est demandé. L'écriture des jobs/approbations/attestations/Journal et leurs verrous doit être autorisée ; aucun rôle réel n'a été inspecté ou modifié ici.
3. APIs Google Calendar et Drive activées sur le projet OAuth existant, redirect URI Production exact, audience/testeurs ou publication interne adaptés, éventuelles exigences Google de vérification pour les scopes sensibles/restreints. Ne pas ajouter de service account ou partager des secrets.
4. Connexion d'un utilisateur canonique autorisé, consentement réel aux profils proposés, compte Google conforme au `issuer/sub` enregistré, calendrier et dossier de test autorisés. Les anciens consentements de lecture restent lecture seule.
5. Recette réelle limitée : création/modification d'un rendez-vous sans participant, import d'un fichier de test, relecture, classement, révocation et reprise, preuves du Journal et du Cockpit. Toute opération fournisseur réelle nécessite une autorisation distincte ; aucune n'a eu lieu ici.
6. Sauvegarde puis migration et déploiement contrôlés uniquement après accord explicite. Aucune Preview. Les vérifications téléphonie, automatisations et OS↔Live non certifiées demeurent des indisponibilités, pas des capacités reçues.

### Retour arrière non destructif

Arrêter les nouvelles confirmations et les workers concernés avant un retour applicatif. Conserver la migration, les données, reçus et approbations. Un retour aveugle à l'ancien worker est dangereux : il ne connaît pas l'exclusion `native-google` et pourrait prendre/purger ces lignes. Utiliser une version de retour qui **conserve cette exclusion**, ou garder ces workers arrêtés jusqu'à résolution administrative de toutes les opérations. Aucun retrait de contrainte/table ni effacement d'historique. Ne pas restaurer une sauvegarde ancienne sur des effets Google déjà exécutés sans réconciliation : elle perdrait les reçus qui empêchent les doublons.

## Preuves et décision

Les résultats exécutés, le commit et les limites figurent dans `google-agenda-drive-evidence.json` et la matrice ciblée `google-agenda-drive-matrix.csv`. Les logs complets et tentatives de diagnostic sont conservés dans l'archive de livraison. Les sept recettes navigateur historiques sont rejouées ; les tests nouveaux exercent les véritables routes OS et SDK Google, seules les réponses fournisseurs étant simulées.

**GO technique pour le périmètre reçu en isolation ; NO-GO pour une mise en Production ou une réception métier réelle à ce stade.** Les blocages logiciels Agenda/Drive de la fermeture précédente sont levés dans ce périmètre. Les consentements, dossiers/calendriers exacts, rôles Neon, sauvegarde/restauration et configuration Production restent à certifier par des opérations distinctement autorisées.

Code figé : `8f27f7b831eaed7be7392b4656f5c327176e7c5a`, après le raccordement `d05370f9e7492a0fd7e7011499735d6c29633c78` et ses gardes `913b7ad10587afb728a2d11ae4ad8851378718ad`. Les commits documentaires descendants ne changent pas ce code.

- **55 tests natifs PostgreSQL/contrats natifs : 55 réussis, 0 échec, 0 ignoré**, dont les 43 précédents et 12 nouveaux tests rapportés par le runner. Deux utilisateurs, deux clients et trois projets, scopes partiels/Drive.file/Drive explicite, droits, versions, annulation, confirmations, concurrence, création/import/modification/classement, résultat incertain, panne, reprise, restauration réelle locale et non-régression IONOS/conversations.
- **45 tests de contrats : 45 réussis, 0 échec, 0 ignoré** : cinq langues, réception opérationnelle, contrats/messages/authentification OS↔Live et voix. Aucun changement Live.
- **TypeScript, lint ciblé et build optimisé : réussis**. Le build local utilise les polices simulées du dispositif de réception existant ; aucune vérification TLS n'est désactivée.
- **Navigateur local** : les cinq recettes historiques natives et la fermeture fonctionnelle ont été rejouées, puis la recette Google, une véritable extinction/relance du processus Next suivie d'un nouveau navigateur, et la recette Cockpit. Les journaux distinguent les passes et leurs références. La CI native rejoue les **neuf recettes** sur le SHA de livraison ; vérifier son résultat sur #176 avant toute fusion.
- Aucun sélecteur ni assertion supprimé pour obtenir un résultat vert. Les premières tentatives ont révélé des attentes d'initialisation trop courtes et des requêtes négatives incomplètes. Les tests attendent désormais les contrôles disponibles et transmettent les sélecteurs canoniques complets ; une session canonique expirée conserve le refus HTTP 403 du contrat existant, tandis qu'un cookie absent/mal formé est refusé HTTP 401. Les preuves des tentatives sont conservées, séparées des passes.

### Limites et risques résiduels

1. **Google réel non certifié** : scope effectivement retourné, renouvellement/révocation, préconditions `If-Match`, IDs générés, checksums, comportement des calendriers et récupération du fichier après écriture doivent être validés sur le compte et le dossier exacts autorisés. Les Drive partagés et permissions héritées/groupes ne sont pas certifiés en réel. L'adaptateur documentaire conserve son refus si la preuve de permission existante est insuffisante ; ne pas déduire sa prise en charge du seul paramètre `supportsAllDrives`.
2. **Absence d'atomicité PostgreSQL/Google** : une interruption ou une révocation pendant une remise déjà autorisée peut laisser une issue incertaine. Aucun effacement ni renvoi automatique. Une investigation autorisée reste nécessaire si les lectures ne prouvent pas l'effet.
3. **Limites conservées** : 2 Mio/import, texte simple pour mise à jour, propositions de 15 minutes, bornes et contrôles documentaires historiques. Pas de promesse de rétention illimitée ni de prise en charge des formes d'événements exclues. Les reçus durables ne sont pas purgés par le worker.
4. **Migrations Production non certifiées** : 020 prend des verrous DDL et revalide des CHECK sur les tables existantes. Volumétrie, verrous concurrents, durée Neon et privilèges réels doivent être examinés avant la fenêtre de maintenance. Un échec transactionnel doit être abandonné proprement, sans suppression ni forçage des données.
5. **Dette globale préexistante** : `npm run lint` reste en échec avec **9 erreurs et 9 avertissements**, les erreurs dans des fichiers inchangés. Vitest historique : **20 tests réussis, 2 échecs et 1 erreur de collecte** (acquisition-store, decision-brief, mock hoist de project-intake). Ces échecs sont qualifiés séparément ; aucun test n'a été désactivé. Ils ne sont pas présentés comme une CI globale verte.

### Ordre de mise en service à soumettre au propriétaire

1. Vérifier les contrôles du SHA final et la PR Draft, puis obtenir l'autorisation de revue/fusion ; aucun merge automatique.
2. Autoriser les contrôles administratifs en lecture seule sur les cibles Neon/Vercel et les accès canoniques. Valider la politique Production uniquement, sans Preview.
3. Autoriser la sauvegarde et sa restauration sur copie isolée ; vérifier les reçus, historiques et empreintes.
4. Autoriser séparément les migrations 012–020 manquantes, dans l'ordre, les droits SQL minimaux et une fenêtre de maintenance. Aucune ancienne définition ne doit être rejouée après ses extensions.
5. Autoriser explicitement le déploiement Production contrôlé. Vérifier que tous les workers/réplicas ayant accès à cette base portent l’exclusion `native-google` dans la prise et la maintenance des jobs ; drainer les anciennes versions avant toute préparation Google. Garder les anciens consentements de lecture et l'absence de calendrier/dossier attesté tant que les prérequis ne sont pas validés : les barrières restent fermées par défaut, sans nouveau flag fictif.
6. Autoriser les consentements et la recette Google réelle précisément listée plus haut. Contrôler depuis l'interface : Cockpit → Mission → Clara → Agenda → Documents → Journal → Cockpit → reconnexion/reprise. Vérifier aucun doublon ni contenu étranger, ainsi que les refus après révocation. Aucun participant/invitation/email sans autorisation dédiée.
7. Figer le périmètre fonctionnel reçu. En cas d'échec, appliquer le retour arrière conservant reçus et exclusion du worker, après autorisation ; ne pas ouvrir un nouveau chantier fonctionnel à l'occasion du déploiement.

La PR reste Draft. Aucun fournisseur réel, merge, Preview, déploiement, modification de secret/configuration Production ou migration Production exécuté.
