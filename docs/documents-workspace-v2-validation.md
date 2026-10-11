# Documents Workspace V2 — validation de la PR #171

Branche : `feat/clara-os-documents-workspace-v2`.
Cible : `consolidation/clara-os-clean-base`.
PR existante : https://github.com/gildaspro5613-code/clara-os/pull/171.
Base auditée : `c49b32c8e3e2084ccbd250c099d02fc105d84e97`.

Statut : **BLOCKED pour la finalisation complète de l’archivage**. Le travail
documentaire indépendant est implémenté et validé avec des données synthétiques.
Aucun merge, déploiement, Preview Vercel ni changement de Clara Live effectué.

## Fonctionnalités livrées

- Lecture des PDF texte via le reader Google Drive existant ; le texte extrait
  suit le parcours `DOCUMENT_RECEIVED` et revient avec le résultat Brain.
- Téléchargement de lecture borné en streaming : PDF 10 Mo, texte/export 2 Mo.
  Metadata Drive vérifiée avant téléchargement ; le streaming reste borné même
  lorsque la taille n’est pas fournie. Sheets utilise l’export CSV supporté.
- Parsing PDF dans un processus Node séparé : 100 pages, 200 000 caractères,
  15 secondes, heap V8 de 192 Mo, deux lectures simultanées par processus serveur,
  sortie bornée. Aucun credential applicatif transmis au sous-processus.
- Erreurs explicites : PDF sans texte, protégé, corrompu, trop volumineux, trop
  long ou limite de ressources. Aucun OCR annoncé ou exécuté. PDF original inchangé.
- Navigation, fil d’Ariane, recherche, pagination et lecteur documentaire ; les
  réponses tardives de liste/destination ne remplacent plus le dossier courant.
- Création de dossiers et upload dans le dossier courant, rafraîchissement après
  mutation ; JSON et multipart sont bornés avant parsing, upload limité à 20 Mo.
- Déplacement confirmé des fichiers **et des dossiers**, y compris vers la
  racine ; vérification de destination et rejet des cycles de dossiers avant mutation.
- Store d’archives immuable et idempotent : normalisation des dates, erreurs de
  validation explicites, conflit de projet/client rejeté, séparation workspace/client.
- Gate pur préparé pour une future autorisation Live ; **non branché sur l’API**.
- Interface d’archives affichant son indisponibilité, sans saisie d’identifiants
  techniques et sans lien Live non autorisé.

## Dépendances et fichiers

Ajouts authentiques depuis npm, lockfile généré par npm : `pdf-parse@2.4.5`,
`playwright@1.62.1` (dev), `vitest@4.1.0` (dev). Vitest sert aux huit suites
existantes qui importaient ce runner sans le déclarer. `vitest.config.mts`
sépare leur exécution des suites `node:test` ; leurs assertions ne sont pas modifiées.
Le lockfile a ensuite été régénéré avec la résolution normale npm : une installation
`npm ci` standard a été exécutée avec succès, sans fabriquer de métadonnées.
La résolution de Vite pour Vitest exige PostCSS `^8.5.29` : npm met également à
jour les dépendances transitives PostCSS 8.5.25 → 8.5.29, nanoid 3.3.16 → 3.3.20
et source-map-js 1.2.1 → 1.2.2. Les builds et recettes navigateur incluent ces versions.

Fichiers principaux :

- `src/lib/documents/pdf-text.ts`, `pdf-text-worker.mjs`, `document-read-error.ts`,
  `bounded-document-stream.ts`, `bounded-request.ts`, `drive-workspace.ts`.
- `src/lib/connectors/internal/google/drive/drive-files.ts`.
- `src/app/api/documents/route.ts`, `src/app/documents/page.tsx`.
- `src/lib/documents/live-archive-reference.ts`, `live-archive-store.ts`,
  `live-archive-authorization.ts`, `src/app/api/documents/live-archives/route.ts`.
- `package.json`, `package-lock.json`, `next.config.ts`, `vitest.config.mts`.
- Tests documentaires/archives, fixtures synthétiques, workflow
  `.github/workflows/documents-workspace-validation.yml`.

Le tracing du build optimisé a été inspecté : subprocess PDF, package pdf-parse,
worker PDF.js et binding canvas natif sont inclus. Les fichiers de source protégés
du Cockpit, OAuth, Sign-In, Missions, Agenda, météo, téléphonie, IONOS et du
parcours commercial ne sont pas modifiés.

## Résultats exécutés

| Contrôle | Résultat et périmètre |
| --- | --- |
| `npm ci` | Installation standard réussie ; avertissements de peers optionnels existants |
| `npm run test:documents` avec PostgreSQL isolé | **29 PASS, 0 FAIL, 0 SKIP** |
| Recette Playwright dans Chromium | **6 PASS sur le build optimisé**, Google/Brain et base de démarrage synthétiques ; aussi 6 PASS sur le serveur dev |
| TypeScript | `npx tsc --noEmit --pretty false` réussi |
| ESLint des fichiers documentaires modifiés et des tests | Réussi, aucune règle désactivée |
| ESLint global | **12 erreurs, 15 warnings** préexistants hors périmètre ; avant changement, 13 erreurs et 16 warnings, dont le problème Documents corrigé |
| Suites Vitest existantes | **20 PASS, 2 FAIL**, plus **1 suite qui échoue au chargement** ; mêmes résultats sur le commit initial |
| Suites node:test existantes et nouveaux tests | **247 exécutés : 219 PASS, 20 FAIL, 8 SKIP** ; baseline : 218 exécutés, 190 PASS, mêmes 20 FAIL et 8 SKIP |
| `npm run build` standard/Turbopack | Échec environnemental : Google Fonts refusé par le proxy (HTTP 403) |
| Build optimisé `npm run build -- --webpack`, polices locales de test | Réussi : compilation, TypeScript, génération des 29 pages et tracing |

Le build Webpack a utilisé `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` uniquement pour
substituer la réponse réseau Google Fonts par des **vrais fichiers Geist** du
package npm officiel `geist@1.7.2`, installé dans `/tmp` pour cette validation.
La configuration de polices de l’application et les contrôles Next ne sont pas
modifiés. Ce succès ne signifie pas que le build standard fonctionne sur le
réseau restreint actuel ; les destinations `fonts.googleapis.com` et
`fonts.gstatic.com` doivent y être accessibles. La tentative Turbopack avec ce
substitut local a également révélé une erreur interne du bundler ; elle n’est
pas comptée comme une réussite. Webpack est un mode pris en charge par Next.

Les échecs node:test préexistants concernent les intégrations nécessitant une
base/connexion Google absente, deux tests OAuth durable et des assertions
GitHub/MagicQ hors chantier. Les suites Vitest reproduisent un mock hoisté invalide
dans project-intake, un compte d’appels SQL attendu obsolète et une assertion
decision-brief. Aucune assertion n’a été supprimée et aucun test échoué n’est
annoncé PASS. La comparaison utilise une archive Git du commit initial en `/tmp`,
avec les mêmes dépendances installées ; aucun worktree supplémentaire créé.

## Reproduction locale sans données de production

Node 24.19.0 / npm 11.9.0 ont été utilisés. PDF-parse requiert un runtime Node
compatible avec son champ engines ; la CI documentaire utilise Node 24.

```bash
npm ci
docker run --detach --name clara-document-registry-test-documentsv2 \
  -e POSTGRES_PASSWORD=synthetic-test-only \
  postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24
# Attendre pg_isready avant le test.
DOCUMENT_ARCHIVE_TEST_CONTAINER=clara-document-registry-test-documentsv2 npm run test:documents
npx tsc --noEmit --pretty false
npm run test:legacy:vitest
```

Le test store est explicitement SKIP si aucun conteneur isolé n’est fourni. Ne pas
le remplacer par `DATABASE_URL` de production. Il refuse les noms de conteneurs
qui ne correspondent pas au namespace synthétique autorisé et utilise un
workspace aléatoire à chaque exécution, sans supprimer de données préexistantes.

Après un build optimisé réussi, le navigateur peut tester l’application locale
avec une base de démarrage vide simulée et des API documentaires interceptées :

```bash
# Terminal 1 — fixture seulement ; ne jamais utiliser avec un URL de base réelle.
DATABASE_URL=postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic \
NODE_OPTIONS="--import=$PWD/src/tests/helpers/documents-browser-runtime.mjs" \
npm run start -- --hostname 127.0.0.1 --port 3017

# Terminal 2
npx playwright install chromium
DOCUMENTS_E2E_ORIGIN=http://127.0.0.1:3017 npm run test:documents:e2e
# Si Chromium système est utilisé, ajouter DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium.
```

La fixture de démarrage refuse toute URL de base autre que sa valeur synthétique
et tout `POSTGRES_URL`. Le test navigateur refuse une origine non locale et
interdit les requêtes vers d’autres origines. Les six parcours couvrent navigation,
pagination, recherche/lecture, erreurs, upload/création, déplacement confirmé et
réponses de dossier désordonnées. Les tests de route exécutent le vrai handler,
le vrai reader et le vrai parser PDF ; seuls authentification Drive, stockage et
cognition sont substitués. La recommandation Brain du navigateur est simulée ;
son contenu intellectuel réel n’est pas validé.

## Limites et action suivante

La lecture sur un **vrai** compte Google Drive, les écritures/relectures sur
**Neon réel**, et la conservation d’un **vrai** projet Live n’ont pas été testées :
les accès correspondants ne sont pas disponibles. La préservation des octets PDF
est testée et aucun appel de mutation Live n’a été ajouté.

L’API d’archives continue à refuser un jeton invalide (401) ou un jeton produit
valide sans preuve client/projet (403), y compris pour les requêtes inter-client
et inter-workspace. Le store n’est jamais appelé par cette API verrouillée.

Voir [le contrat ciblé proposé pour Live](live-archive-authorization-contract.md)
pour les données manquantes, endpoints et fichiers proposés. Il faut autoriser
et réaliser ce raccord sur les modèles et ACL réels de Live, établir les
associations canoniques manquantes, puis valider sur un environnement de recette
avant de connecter le gate et d’activer les archives OS.

**La PR n’est pas annoncée READY TO MERGE pour la mission complète.**
