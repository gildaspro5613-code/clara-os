# Recette PR #176 — protocole HTTP d'autorisation sans secrets

## Prérequis bloquants

La cible doit être un déploiement **isolé** du code réel de PR #176, attesté par SHA Git, et non la page diagnostique issue de PR #192. Vérifier l'identité du projet Vercel `clara-os-recette`, les indicateurs Recette, la branche Neon fictive, l'absence de connexions fournisseurs et la présence des routes natives avant tout test. Aucune requête HTTP à Clara OS Production ni à Clara Live.

Ne jamais afficher, journaliser, copier dans GitHub Actions ou retourner dans un rapport les cookies, tokens, secrets, URLs de connexion SQL ou en-têtes Authorization. Les assertions doivent porter uniquement sur le statut HTTP, le code d'erreur stable et l'absence d'effet durable hors du périmètre fictif.

## Matrice des scénarios sur la vraie application

| Cas | Préparation | Résultat attendu |
| --- | --- | --- |
| HTTP-01 | GET route protégée sans cookie | 401 ou refus explicite avant toute donnée de mission |
| HTTP-02 | Cookie canonique malformé, puis dupliqué | 401 / aucune fuite |
| HTTP-03 | Session fictive valide, workspace fictif autorisé | 200 et uniquement données fictives du workspace |
| HTTP-04 | Session valide, workspace étranger | 403 ou 404, aucune donnée étrangère |
| HTTP-05 | Sélecteurs mission/session absents, dupliqués ou malformés | 400/403, aucun repli global |
| HTTP-06 | Session expirée ou révoquée via **workflow manuel de fixture** | 401, y compris après rafraîchissement |
| HTTP-07 | Membership révoqué via procédure isolée autorisée | 403, aucun privilège conservé |
| HTTP-08 | Rôle insuffisant pour écriture | 403, aucun effet durable |
| HTTP-09 | Deux sessions/projets distincts | Aucun mélange de conversation, journal, mission |
| HTTP-10 | Tentative d'action fournisseur (Google, Microsoft, IONOS, Make, Brevo, ElevenLabs, téléphonie, Live) | Refus Recette avant réseau, zéro effet externe |

**Conditions d'exécution :** URLs exactes des routes déduites du code PR #176; utiliser uniquement un harnais de test qui masque les cookies et les corps de réponse; aucun dump de requête; effectuer les scénarios de révocation en fin de campagne et reprovisionner uniquement via le workflow approuvé. Tester d'abord le refus sans cookie, puis le parcours autorisé fictif, puis les refus croisés. Ne pas considérer un 404 de route inexistante comme un test d'autorisation réussi.

## Gate

Les tests hors ligne (SQL mocké et transports interceptés) ne remplacent pas cette campagne HTTP. **NO-GO** tant que la cible PR #176 et les preuves HTTP ne sont pas attestées. Les changements de dépendances candidats sont validés uniquement si `tsc`, `next build`, les tests Recette et les tests existants passent, dans un espace temporaire sans changement du lockfile de la branche.

## Préparation ciblée de clôture #196 — 19/10/2026

**Préparé, NON EXÉCUTÉ sur une URL réelle.** Aucun déploiement n'est autorisé. Avant la campagne, exécuter le contrôle opérateur `src/scripts/attest-recette-runtime.mts --source-sha=<SHA approuvé complet>` dans un contexte de confiance disposant des variables effectives de la cible, et exiger PASS. Ne pas fabriquer les marqueurs à partir de valeurs attendues. La preuve administrative doit associer ce résultat à la même cible testée ; le JSON expurgé seul ne porte pas cette provenance. Le contrôle effectue uniquement des GET de métadonnées Vercel/Neon et un SELECT SQL READ ONLY. Les clés de contrôle restent dans le contexte opérateur, jamais ajoutées à l'application. Sans accès effectif : NON ATTESTÉ, aucun test réel lancé.

Routes vérifiées dans cette branche (ne pas utiliser des routes diagnostiques supposées équivalentes) :

| Phase | Requête préparée | Assertions réelles à obtenir |
|---|---|---|
| Refus initial | GET `/api/canonical/registry`, puis GET `/api/clara/session`, sans cookie ; cookie malformé/dupliqué | 401 et aucune donnée ; pas de corps privé dans les preuves |
| Session fictive | GET `/api/canonical/registry` avec cookie canonique injecté depuis le coffre dans le contexte navigateur isolé | 200 et seulement les workspaces autorisés ; une liste vide n'est pas un succès d'authentification |
| Contexte | GET `/api/clara/session?workspaceId=…&clientId=…&projectId=…&sessionId=…` | 200 sur le contexte certifié, données propres à la mission ; 403 sur contexte étranger, aucun fallback global |
| Sélecteurs | Même route, sélecteur manquant, dupliqué, malformé ou session `external:` | 400 ou 403 selon le cas ; aucun élargissement implicite |
| Session expirée/révoquée | Rejouer le registre et la session avec une fixture dédiée autorisée | Registre : 200 avec liste vide possible selon le contrat actuel ; session native : refus sans donnée. Ne pas exiger artificiellement 401 de tous les endpoints |
| Écriture fictive | POST `/api/native/runtime`, action `createSession`, workspace/client/projet explicitement autorisés ; sélectionner/créer une mission via les actions UI existantes | Persistance, sélection et reprise ; 403 pour un autre utilisateur/client/projet. Ces écritures Recette nécessitent une autorisation distincte |
| Conversation | POST `/api/clara/chat` depuis la vraie UI, avec `operationId` persistant ; rejouer après perte d'acquittement | Un seul tour/reçu, même contenu ; 409 sur contenu différent pour la même opération ; aucun appel OpenAI réel |
| Parcours | Cockpit → Mission → Clara → document fictif existant/autorisé → Journal → Cockpit → refresh/reconnexion | Cohérence/persistance, aucune attribution d'un historique non certifié. Le garde OpenAI refuse actuellement l'exécution : ne pas annoncer une réponse simulée fonctionnelle sans moteur de simulation existant et réellement reçu |
| Fournisseurs | Tentatives via les vrais endpoints et périmètres autorisés | Refus avant transport pour les chemins protégés ; instrumentation contrôlée des transports et non simple 404/500 d'une route absente |
| Révocation et isolement | Deux utilisateurs/workspaces et projets distincts préexistants, puis révocation en fin de campagne via procédure approuvée | Absence totale de fuite après refresh ; ne pas modifier/révoquer l'unique fixture pour improviser ce test |

La branche réelle #176/#196 ne contient ni `/recette` ni `/api/auth/recette/session` : ces adaptateurs proviennent d'autres branches. Leur présence dans un déploiement diagnostique ne certifie donc pas cette application. Pour la campagne de sécurité, le harnais navigateur peut injecter le cookie canonique de la fixture depuis le coffre, sans impression ni capture de stockage/cookies ; ce n'est pas une réception de la connexion utilisateur depuis une page de login. Le parcours de connexion réel reste à qualifier sur la cible autorisée. Aucun ajout de fonctionnalité d'authentification n'est effectué.

Bloquants réseau reproduits hors ligne dans la revue de clôture : échanges de connexion Google/Microsoft, OAuth Brevo et pont canonique OS→Live peuvent atteindre le transport avant un refus Recette. La campagne de refus réelle ne doit pas les appeler tant que ces frontières ne sont pas sécurisées ; l'absence supposée de clés n'est pas une preuve. Aucune campagne HTTP réelle ni retour fournisseur réel ne sont certifiés ici.

Preuves futures : statut/code et assertions booléennes uniquement, SHA public de source, scénario et résultat. Pas de corps métier, screenshots contenant du contenu privé, trace réseau, storageState, URL SQL, jeton, condensat ou en-tête Authorization dans les logs/artéfacts. Conserver la distinction préparation, tests simulés, HTTP réel et effets externes.
