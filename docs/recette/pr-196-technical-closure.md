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

## Clôture ciblée dépendances et attestation — suite de `1910829`

Références distantes vérifiées avant modification : #196 toujours Draft, branche attendue, HEAD `19108292413e268ef03f19e077ac3137d03aa7a9`. Les cinq frontières et leurs contrats ne sont pas modifiés par ce lot.

### Dépendances réellement livrées

Avis consultés par API GitHub publique (advisories revus et avis du mainteneur), ainsi que la release officielle :

- [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) : RCE sur serveurs Windows, Next `>=16.0.0 <16.3.3`, correctif 16.3.3. Son contexte Windows ne suffit pas à caractériser l'exposition Vercel Linux ; le paquet est toutefois signalé dans l'audit.
- [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) : RCE Image Optimization avec AVIF, Next `<16.3.3` dans la série 16.
- [Avis mainteneur GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) : RCE `next/og ImageResponse`, Next `>=16.2.0 <16.3.6`, correctif 16.3.6.
- [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) et autres corrections de cache/divulgation : paquet vulnérable jusqu'à 16.3.7 selon l'avis revu. La [release officielle v16.3.8](https://github.com/vercel/next.js/releases/tag/v16.3.8) annonce explicitement ces correctifs. Le champ de version de l'avis mainteneur SSRF conserve un placeholder `16.3.?` ; la release et l'avis revu précisent 16.3.8. Aucun contournement de fonctionnalité n'est utilisé.

Remédiation minimale : patch **16.3.8**, même majeure et même mineure que 16.3.0, plutôt que le candidat 16.4.2 précédemment essayé en CI. `next` et `eslint-config-next` épinglés exactement à 16.3.8. Engines publiés Next : Node >=20.9 ; React/ReactDOM 19.2.4 existants compatibles avec les peers ^19. ESLint >=9 et TypeScript >=3.3.1 compatibles avec l'outillage existant. Pas de migration de code ni remplacement de bibliothèque.

| Paquet / chemin | Lockfile avant | Lockfile après | Justification |
|---|---|---|---|
| next, eslint-config-next | 16.3.0 | 16.3.8 | Avis Next ci-dessus, alignement de l'outillage |
| axios | 1.19.0 | 1.20.0 | Avis multiples dont [SSRF/redirections](https://github.com/advisories/GHSA-r4gj-5m52-g5wh), correctifs <1.20.0 |
| sharp | 0.35.3 | 0.35.5 | [libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) |
| qs | 6.15.3 | 6.16.1 | [DoS isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), correction >=6.16.0 |
| glob/node_modules/brace-expansion | 2.1.4 | 2.1.7 | [DoS](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) et récursions, dernière correction >=2.1.7 |
| brace-expansion racine / copie tooling | 1.1.17 / 5.0.8 | 1.1.21 / 5.0.12 | Résolution patch de toutes les copies du paquet ciblé |

Les paquets platformes SWC/env/eslint suivent le patch Next ; Sharp/libvips suivent le patch Sharp (libvips 1.3.2→1.3.4). Deux transitives liées à ces résolutions suivent également : @swc/helpers 0.5.15→0.5.23 et fastq 1.20.1→1.20.3. Aucun nouveau paquet direct, override, force, legacy-peer-deps ou exclusion d'avis.

Commandes réellement utilisées :

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --save-exact next@16.3.8
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --save-dev --save-exact eslint-config-next@16.3.8
npm update axios brace-expansion sharp qs --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --no-audit --no-fund
npm audit --omit=dev --json
npm audit --json
```

Un cache npm temporaire sous /tmp a été spécifié à chaque commande, sans modifier de configuration globale. Le cache utilisateur initial était inaccessible ; aucun contrôle TLS/intégrité n'a été désactivé. `npm ci` a terminé avec succès et les manifests des paquets **installés** correspondent au lockfile pour Next, eslint-config-next, Axios, Sharp et qs. Les workflows existants vérifient aussi l'installation normale et le build du commit livré. Les avertissements de peers optionnels WASM et de dépréciation restent documentaires, sans erreur d'installation ni suppression de validation.

Audits :

- Production avant : **5** (1 critique, 3 élevées, 1 modérée). Après : **0**, toutes sévérités, exit 0.
- Complet avant : **13** (1 critique, 9 élevées, 3 modérées). Après : **8** (0 critique, 6 élevées, 2 modérées), exit 1 : ne pas présenter l'audit complet comme vert.
- Les huit noms restants existaient déjà avant : @next/eslint-plugin-next, eslint-config-next, braces, fast-glob, micromatch, js-yaml (élevées), @vitest/mocker et vitest (modérées), exclusivement hors graphe de production selon npm. npm propose notamment une rétrogradation majeure d'eslint-config-next pour une chaîne tooling sans correctif compatible recensé ; elle n'est pas appliquée. Aucun audit n'est masqué ou filtré pour faire disparaître ces alertes. Elles restent un risque de l'outillage de développement/build, distinct du paquet livré au runtime ; pas de correction générale de l'outillage dans cette mission.

Tests locaux après `npm ci` : **53/53** ciblés (sécurité Recette, cinq frontières, authentification isolée, attestation, contrats OAuth et archivage), zéro ignoré. TypeScript et ESLint ciblé réussis. Les résultats des quatre CI sur le SHA final sont remis avec leurs liens, sans compter un lancement comme un succès.

### Attestation : environnement exact, pas simple homonymie

Correction strictement nécessaire dans le contrôle existant : exiger désormais l'identifiant réel **env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM** dans les métadonnées du déploiement. Un slug `clara-os-recette` sans ID ne prouve plus la cible. ID étranger ou contradictoire = FAIL ; ID absent = NON ATTESTÉ. Projet Vercel, source, mode, hostname/branche Neon et SQL READ ONLY restent contrôlés avant tout PASS. Le test positif fournit l'ID attendu et le test négatif couvre un environnement homonyme d'ID différent avant toute connexion SQL.

Exécution réelle du script dans le contexte disponible : `NON ATTESTÉ`, checks vides, writesRequested=false, exit 1. Les neuf bindings nécessaires sont absents (présence seule contrôlée, pas leurs valeurs) ; aucun accès Vercel/Neon utilisable n'est exposé. Aucun HTTP/SQL réel lancé, aucune clé créée/renouvelée ou valeur copiée dans GitHub/ChatGPT.

**L'unique intervention administrateur encore nécessaire** est décrite dans `pr-196-admin-attestation.md` : exécuter ce même contrôle dans un contexte déjà autorisé qui dispose des bindings effectifs et des accès de lecture existants. L'existence indépendante du projet/environnement/branche et la présence des quatre variables sont conservées comme attestations de métadonnées du propriétaire, pas converties en preuve des valeurs.

**Décision : NO-GO tant que cette attestation effective n'est pas PASS.** Le blocage critique de dépendances de production est levé par le patch réellement verrouillé/installé et l'audit production ; les alertes tooling restent explicitement visibles. Réception HTTP préparée dans le protocole existant, non exécutée. Aucun déploiement, merge, écriture Neon, changement de secrets ou intervention Production/Live.
