# Clôture technique ciblée Clara OS Recette — #196

Référence distante récupérée : PR #196 Draft, branche `chore/recette-176-integration-audit-20261018`, base `fix/os-operational-reception-175` (#176), HEAD initial `de8f95b02a4601a1ab18f1b746e325faab0839fa`. La branche d'audit ne contient pas les adaptateurs `/recette` des chantiers diagnostiques. Aucun mélange ou merge de ces branches.

## P0 : reproduction et correction, cycle 1

Reproduction au SHA initial : `node --import tsx --test src/tests/document-analysis-failures.test.ts` → 1 succès, 1 échec, TypeError `assertRecetteExternalExecutionBlocked is not a function`.

Cause exacte : le VM harness de `document-analysis-failures.test.ts` fournit `require: () => ({default: Client})` à **tous** les imports du module transpillé `openai-responses-engine.ts`. Depuis l'ajout du garde, l'import nommé du garde reçoit donc le faux module OpenAI. Le correctif précédent de `production-p0.test.ts` ne corrigeait pas ce second chargeur indépendant. Le module de production exporte bien la fonction : aucun défaut du garde lui-même n'est démontré.

Correction : dispatch explicite de require, faux Client seulement pour `openai`, module **réel** pour le garde, échec sur tout import inconnu. Ajouter au même test une exécution Recette refusée par le garde réel avec compteur de requêtes inchangé. Aucun garde supprimé/remplacé par un no-op, aucune assertion retirée, aucune modification du moteur OpenAI. Après correction : 2/2 tests réussis. Un seul cycle de correction P0 engagé ; aucun élargissement du périmètre.

## Réseau : clôture refusée sur preuves exécutables

Les cinq points suivants ont été invoqués sous `CLARA_OS_RUNTIME_MODE=recette`, credentials exclusivement synthétiques, fetch injecté/global intercepté qui lève immédiatement une exception sans I/O. Les quatre premiers atteignent chacun **une fois** le transport simulé ; le cinquième atteint une fois le point SDK substitué ; zéro appel réel. Le contrôle se fait dans le même processus avec restauration des variables/fetch. Ne pas interpréter ces constats comme des tests de sécurité réussis.

| Point réellement appelable | Appel/chemin | Preuve et impact |
|---|---|---|
| Connexion Google | `completeGoogleSignIn()` → `exchangeCode()` → POST token ; callback GET `/api/auth/google/callback` | 1 fetch simulé. Le garde du JWKS est exécuté seulement après l'échange de code. Paramètres de callback synthétiques valides et configuration OAuth suffisent pour atteindre l'échange avant validation cryptographique |
| Connexion Microsoft | `completeMicrosoftSignIn()` → `exchangeCode()` ; callback GET `/api/auth/microsoft/callback` | Même défaut d'ordre, 1 fetch simulé avant garde JWKS |
| OAuth Brevo | `createBrevoOAuthProvider().exchangeCode()` / `refresh()` → `token()` ; provider enregistré dans `oauthProviders`, utilisé par `OAuthCallbackService` | 1 fetch injecté. Le garde du client API Brevo ne protège pas le fournisseur OAuth distinct ; les contrôles de nonce/connexion ne prouvent pas l'isolation Recette |
| Pont canonique Live | `createLiveCanonicalTransport()` ; `confirmLink` dans POST `/api/canonical/registry`, service d'archive canonique | 1 fetch injecté. L'autorité métier et la capability `canonical-links:v1` autorisent le transport, mais il manque un refus Recette avant POST ; le garde du callback de capabilities est une autre frontière |

| OAuth Google Workspace | `googleOAuthProvider.refresh()` → factory autonome → `refreshAccessToken()` ; provider enregistré dans `oauthProviders` | 1 appel SDK substitué sous marqueur Recette. Le chemin ne passe pas par `GoogleAuth.createClient()` ; aucune I/O réelle ni credential réel. Le callback natif réutilise aussi ce provider pour son échange |

Action minimale pour une intervention de sécurité ultérieure autorisée : appliquer le garde Recette existant à ces frontières avant toute credential/transport et ajouter des tests négatifs conservant les parcours non-Recette. Cette mission ne refactorise pas ces connecteurs ; **gate réseau NON FERMÉ**.

Chemins connus protégés : moteurs Weather/OpenAI/ElevenLabs/téléphonie, routes ElevenLabs session/STT, clients GitHub/Stripe/Brevo API/Make/Microsoft Graph/OAuth, transports IONOS, `GoogleAuth.createClient()`, exécution Google native, callback capabilities et autorité physique Live. Les tests existants couvrent des frontières, pas une sandbox réseau globale : instrumentation ne fait qu'annoncer le démarrage.

Ne pas classer à tort comme route active la source de connaissance HTTP Live ou le sender UDP bas niveau : leur définition existe, mais aucun appelant de composition serveur actif n'a été identifié dans les routes contrôlées pour ces exports. Ce constat n'est pas une garantie pour un futur raccordement. Les SELECT SQL applicatifs constituent une dépendance autorisée seulement après attestation de cible, pas un fournisseur métier neutralisé.

## Attestation : NON ATTESTÉ en réel

Contrôle préparé : `node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=<SHA complet approuvé>`.

Il exige un contexte de confiance disposant des **bindings effectifs de la cible**, pas d'un jeu de valeurs renseignées pour faire passer le contrôle : identité projet/déploiement/cible Vercel, mode isolated-v1, branche/hôte et DATABASE_URL de recette ; clés de lecture de métadonnées `VERCEL_TOKEN` et `NEON_API_KEY` uniquement dans le contexte opérateur. Aucun ajout de ces clés à l'application, aucun changement de configuration effectué.

- Valide les paramètres stricts sans affichage : projet Recette épinglé, target custom, mode/branche attendus, URL limitée/TLS/options fermées, POSTGRES_URL absent.
- GET métadonnées Vercel : identité projet indépendant, environnement personnalisé réellement associé au déploiement et SHA approuvé ; un simple target Preview n'est pas une preuve. Si le format API ne fournit pas les métadonnées permettant la preuve : NON ATTESTÉ, pas de déduction.
- GET endpoints du projet Neon : hôte unique sur la branche isolée, **avant toute connexion SQL**. Une connexion injectée automatiquement vers une autre branche est refusée.
- Un SELECT sur current_database/current_user/pg_roles en transaction HTTP READ ONLY prouve base, rôle limité et absence d'attributs administratifs/CREATE public/base.
- JSON limité à PASS/FAIL/NON ATTESTÉ et labels fixes, aucune URL, credential, empreinte, réponse brute ou exception propagée. Aucun mutateur API, DML, DDL ou session créée. Le contrôle ne prouve pas toutes les ACL métier ou l'état des migrations.

Aucun accès de métadonnées Vercel/Neon utilisable n'est exposé par les outils disponibles ; aucune valeur secrète consultée. Les variables déclarées présentes ne sont pas leurs valeurs effectives. **Résultat réel : NON ATTESTÉ.** Les six tests locaux du contrôle utilisent SDK réel avec API et SQL simulés ; leur PASS n'est pas un PASS d'environnement.

## HTTP : préparé, non exécuté

Protocole opérationnel précisé dans `pr-176-http-authorization-protocol.md` : routes exactes, cookies/scopes, contrats des erreurs et du registre, garde avant réseau, idempotence operationId, refresh/persistance et révocation autorisée. Pas de 404 de route inexistante pris pour preuve de sécurité. Pas de simulation conversationnelle annoncée comme fonctionnelle : le moteur OpenAI est refusé en Recette, le scénario positif doit être démontré avec le chemin de simulation réellement disponible.

La session fictive active précédemment attestée n'est pas requalifiée active aujourd'hui par déduction. Avant HTTP, une lecture autorisée doit établir sa validité actuelle et les jeux de données pour deux utilisateurs/workspaces. Les scénarios de mutation/révocation nécessitent une autorisation explicite distincte. Aucun test HTTP sur la vraie application #176 n'est déclaré réussi.

## CI et décision

Les liens et résultats individuels du SHA final figurent dans le rapport de remise. Au départ : P0 FAILURE ; Authenticated workspace, Microsoft et sécurité offline SUCCESS. Les tests de candidate Next corrigée du workflow offline se déroulent dans un espace jetable : ils ne changent pas le lockfile ni les dépendances livrées. Le dossier signale une dépendance Next critique dans le lockfile livré ; un build candidat vert ne suffit pas à lever ce risque.

**NO-GO pour un déploiement même strictement isolé** tant que le gate réseau, l'attestation effective, la décision sur les dépendances livrées et les prérequis HTTP ne sont pas levés. CI verte ≠ autorisation de déployer. Aucune nouvelle PR, merge, intervention Live/Production, migration réelle, écriture Neon ou déploiement.

## Vérifications locales finales

- Suite exacte P0 du workflow, fixture PostgreSQL 17 jetable : **36/36**, 0 ignoré. Une première tentative locale avait été refusée par la liste blanche de noms de conteneurs du harnais (nom opérateur incorrect) ; elle a été rejouée avec un nom conforme, sans modifier le harnais ni désactiver de test.
- Suites authentification/Microsoft/sécurité Recette/capability policy : **48/48**, 0 ignoré.
- Attestation préparée : **6/6** tests SDK et métadonnées simulés, 0 ignoré.
- TypeScript et ESLint ciblé réussis ; aucun changement de dépendances/lockfile, aucun build ou déploiement Vercel déclenché. Les builds GitHub CI restent des vérifications hors Vercel.
- PR #176 relue : HEAD `ac835b6c4ebf770ce6decf953df51d82392ea1c8`, Draft, ancêtre vérifié de cette branche ; aucune modification de #176. Les deux fichiers locaux non suivis préexistants ont été préservés hors commit.

## Dernier lot de sécurité — suite directe de `bc21b4f`

État précédent ci-dessus conservé comme historique ; il ne décrit plus l'état des cinq frontières après cette correction. Référence distante #196/Draft et branche vérifiées avant intervention, HEAD distant `bc21b4f33f1bd1675288d80b869110205e94571e`.

| Frontière | Cause exacte | Correction minimale | Preuve après correction |
|---|---|---|---|
| Connexion Google | Garde JWKS trop tardif, après POST token | Garde existant en tête du `exchangeCode()` privé, avant configuration/HTTP | Refus avant fetch sous chacun des 3 marqueurs ; hors Recette l'échange simulé reste atteint |
| Connexion Microsoft | Même ordre d'exécution | Même garde au début de `exchangeCode()` | Même preuve ; aucun changement de validation des claims/state/enrollment |
| OAuth Brevo | Le client API protégé ne couvre pas le provider OAuth | Garde dans la fonction commune `token()`, couvrant code et refresh | 0 fetch pour échange et refresh ; normalisation des résultats hors Recette conservée |
| OAuth Google Workspace | Factory autonome hors `GoogleAuth.createClient()` | Garde en première instruction de `createGoogleOAuthClient()`, avant configuration et constructeur SDK | 0 constructeur/échange/refresh SDK ; résultats normaux simulés préservés hors Recette |
| Pont canonique OS→Live | Callback de capabilities protégé distinct du transport canonique | Garde au début de `call()`, avant configuration produit et POST | 0 HTTP en Recette ; hors Recette path/payload/headers/proof conservés |

Le garde commun `external-execution-guard.ts` est inchangé. Chaque correction s'active via `CLARA_OS_RUNTIME_MODE`, l'identité Vercel du projet isolé ou `CLARA_RECETTE_MODE`. Aucun nouveau moteur/système d'identité, aucun élargissement d'ACL, aucune modification des contrats ou de l'autorité canonique. Les révisions, consentements, révocations et validations OS restent en place. Pas de substitution permanente par des faux fournisseurs : seuls les tests substituent les transports.

Tests exécutés : `recette-network-provider-denials.test.ts` **8/8**, dont 3 modes de détection et contrat hors Recette pour les cinq frontières. Campagne authentification/sécurité/attestation **59/59**, 0 ignoré ; contrats `canonical-archive-service`, `live-archive-authorization`, `native-google-oauth`, `google-durable-oauth`, `universal-oauth` **22/22**, 0 ignoré. TypeScript et ESLint ciblé réussis. Aucune correction générale d'autres connecteurs ou dépendances.

### Attestation réelle exploitée : NON ATTESTÉ

Le script existant a été exécuté avec l'environnement réellement disponible, sans bindings artificiels : `node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=bc21b4f33f1bd1675288d80b869110205e94571e`.

Résultat exact : `{"status":"NON ATTESTÉ","checks":[],"writesRequested":false}`, exit 1. Les noms requis ont été contrôlés uniquement pour leur présence : identité projet/déploiement/cible, mode, branche/hôte, DATABASE_URL, VERCEL_TOKEN et NEON_API_KEY absents. Aucun accès de métadonnées Vercel/Neon n'est fourni par les outils disponibles. Aucun secret lu, créé, renouvelé ou remplacé. L'absence de bindings arrête le script avant tout HTTP/SQL : tous les contrôles réels restent inaccessibles, pas FAIL et pas PASS.

**Action unique nécessaire :** faire exécuter ce même script par l'administrateur, dans un contexte de confiance déjà autorisé à lire les métadonnées et disposant des bindings effectifs de la cible et des clés de lecture existantes, avec le SHA complet de la cible approuvée. Ne pas fabriquer des variables attendues, ne pas copier des secrets Production, ne pas ajouter les clés de contrôle à l'application, ne pas créer de route publique d'attestation. Le contexte doit lire uniquement la cible Recette. PASS exige toutes les vérifications de métadonnées et le SELECT READ ONLY ; divergence prouvée = FAIL ; accès/binding/preuve manquants = NON ATTESTÉ. La source finale de cette PR n'étant pas déployée, son association à un déploiement ne peut pas être déclarée PASS avant une autorisation distincte de déploiement ; une cible existante doit être contrôlée avec son vrai SHA, sans la présenter comme réception de ce commit.

### Réception et risques résiduels

Les cinq blocages réseau identifiés sont fermés par tests hors ligne ; aucune nouvelle investigation générale n'est ouverte. Le protocole HTTP ci-joint propose des commandes de lecture sans sortie de secret et des critères PASS/FAIL ; aucune réception HTTP réelle n'est exécutée et aucun déploiement n'est demandé implicitement.

Le lockfile réellement livré résout toujours **Next 16.3.0**. Le constat de vulnérabilité critique du dossier précédent n'est pas effacé par la compilation du candidat corrigé en workspace CI jetable. Action minimale : faire approuver et livrer la remédiation ciblée déjà étudiée, puis valider les dépendances effectivement livrées ; aucune mise à jour de paquet n'est incluse dans ce lot.

Décision maintenue : **NO-GO déploiement**, pour attestation effective manquante et gate des dépendances livrées non levée. La campagne HTTP reste une réception post-déploiement autorisée distinctement, nécessitant une session fictive valide et deux périmètres préparés ; son absence n'est pas présentée comme un défaut réseau supplémentaire. Aucun merge, déploiement Vercel, fournisseur réel, secret modifié, écriture Neon ou intervention Live/Production.
