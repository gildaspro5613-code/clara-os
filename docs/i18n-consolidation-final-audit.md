# Clara OS — audit final i18n PR #173 — 13 octobre 2026

PR : https://github.com/gildaspro5613-code/clara-os/pull/173 (Draft). Branche existante `fix/os-i18n-consolidation-20261013`, base `consolidation/clara-os-clean-base`. Départ : `4171e33d292c91d5a7e42ce30d2cfb9eaf829711`.

## Anomalies confirmées et corrigées

- Libellés français codés en dur dans les documents/archives, connexions, cockpit, brouillons commerciaux, conversations et Brain : namespace additif `ui` identique dans FR/EN/ES/DE/IT, ICU pour les pluriels et paramètres.
- Notifications documentaires, confirmations et dates d’archives : langue sélectionnée ; noms de fichiers, clients et projets conservés.
- Accusés de réception commerciaux et erreurs de la route native Clara : messages localisés, sans changement des décisions, droits, données métier ou citations. L’instruction de langue du composeur déjà présente dans #173 est conservée et testée avec le vrai composeur et un fournisseur simulé.
- Téléphonie : numéro manquant et échecs localisés ; réponses limitées aux champs publics ; exception/message fournisseur jamais renvoyé. L’historique absent est annoncé indisponible, sans prétendre qu’aucun appel existe. Disponibilité inconnue conservée distincte d’un service connecté.
- Lecture PDF : codes connus traduits avec diagnostics précis (limite, chiffrement, corruption, absence de texte/OCR). Codes inconnus et erreurs réseau affichent une erreur sûre, sans exposer le message fournisseur.
- Tests et workflow i18n renforcés ; workflow déclenché également pour les pages/composants et l’API téléphonie.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| `node --import tsx --test src/tests/i18n-consolidation.test.ts` | 7/7 ; 2 615 messages validés (parité, ICU, arguments, rendu), 466 appels statiques résolus ; composeur, citations/Brain inchangés, téléphonie et erreurs natives sur cinq langues |
| Continuité commerciale + sécurité same-origin | 8/8 (14/14 avec les six tests i18n précédant l’ajout du septième) |
| `DOCUMENT_ARCHIVE_TEST_CONTAINER=clara-document-registry-test-finalaudit npm run test:documents` | 29/29, aucun ignoré ; PostgreSQL isolé, PDF, routes, workspace et autorisations |
| Navigateur Chromium local : i18n + documents + archives | 8/8 ; 60 visites = 12 pages × 5 langues ; aucun IntlError/pageerror/secret fournisseur ; navigation, recherche, lecture PDF, création/import, déplacement, concurrence de navigation et archives/droits/réouverture |
| `npx tsc --noEmit --pretty false` | Succès |
| ESLint des fichiers modifiés | Succès, aucune erreur ni avertissement |
| `npm run lint` global | Échec préexistant : 10 erreurs et 15 avertissements ; diagnostics comparés au commit initial, identiques après normalisation des espaces. Aucun nouveau diagnostic |
| `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/clara-v2-font-responses.cjs NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` | Succès ; police simulée localement, aucun déploiement |
| Simulation combinée #173/#174 : TypeScript | Succès |
| Simulation combinée : i18n + P0 | 18/18 |
| Simulation combinée : P0 PostgreSQL | 3/3 ; conteneur synthétique `clara-document-registry-test-p0` |

Les tests navigateur : `DOCUMENTS_E2E_ORIGIN=http://127.0.0.1:3038 DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium node --test src/tests/i18n-browser.e2e.mjs src/tests/documents-browser.e2e.mjs src/tests/canonical-archives-browser.e2e.mjs`. Serveur local compilé avec le preload existant `src/tests/helpers/documents-browser-runtime.mjs` et une URL PostgreSQL synthétique. Requêtes navigateur externes interdites et API remplacées par fixtures. Aucun fournisseur/service de production déclaré testé.

## Protection et compatibilité #174

PR #174 : `fix/os-production-v2-p0-20261013`, SHA protégé `26a5c91a5fccb09db3d78c681817bf561b6ea6bc`. Aucune écriture sur cette branche, aucun rebase/merge. `git merge-tree --write-tree` sur un objet temporaire #173 et la tête #174 : code 0, aucun conflit. Arbre simulé `ce3f2b059dcac9192abeee75870f4b618fc4f166`, exporté dans `/tmp/clara-os-i18n-p0-final` pour les tests ; seul le septième test i18n a ensuite été copié dans cette simulation. La garde P0 de génération partielle et les écritures transactionnelles demeurent celles de #174. Aucune correction P0 réimplémentée ici.

## Limites et préparation à validation

- Les anciennes données persistées, textes Brain, citations, contenus de documents et noms métier restent dans leur langue d’origine par choix explicite ; aucun retraitement/migration.
- Le fournisseur OpenAI réel et les appels téléphoniques réels ne sont pas testés : contrat de langue/prompt et transport public vérifiés avec des doublures. Une instruction de langue ne garantit pas mathématiquement toutes les sorties d’un fournisseur.
- Sur #173 seule, le repli historique du composeur en cas d’échec fournisseur peut reprendre un résumé Brain français. Sa gestion de génération appartient à #174 et reste intacte ; la copie combinée passe les tests P0. Ne pas déclarer #173 seule garante de tous les replis fournisseur dans les cinq langues.
- Les composants de démonstration non montés (TodayPanel, ActionsPanel, ClaraRecommendation, Instruments, ancien Journal) contiennent encore des exemples français ; ils ne sont pas les parcours de l’interface testés.
- Le lint global nécessite un chantier séparé si son succès total est un critère de fusion.

Statut : **Draft, prête pour revue technique des corrections ciblées ; validation finale conditionnée aux contrôles GitHub et aux limites ci-dessus**. Aucun merge, déploiement Preview/production, migration, changement de secret/configuration Vercel ou modification Clara Live.

## Fichiers modifiés dans cette passe

- `.github/workflows/i18n-consolidation-validation.yml`
- `src/app/api/clara/chat/route.ts`
- `src/app/api/telephony/route.ts`
- `src/app/brain/page.tsx`
- `src/app/connexions/page.tsx`
- `src/app/conversations/page.tsx`
- `src/app/documents/page.tsx`
- `src/app/telephonie/page.tsx`
- `src/components/cockpit/QuickActions.tsx`
- `src/components/cockpit/panels/AcquisitionQualificationPanel.tsx`
- `src/components/cockpit/panels/BriefPanel.tsx`
- `src/components/cockpit/panels/CommercialDraftEditor.tsx`
- `src/components/cockpit/panels/ConversationsPanel.tsx`
- `src/components/cockpit/widgets/CockpitActionBar.tsx`
- `src/components/cockpit/widgets/clara/ClaraChatWidget.tsx`
- `src/components/cockpit/widgets/missions/MissionWidget.tsx`
- `src/components/cockpit/widgets/waze/WazeWidget.tsx`
- `src/components/connections/ConnectionsHub.tsx`
- `src/components/documents/CanonicalArchivesPanel.tsx`
- `src/components/layout/Header.tsx`
- `src/i18n/messages/de/consolidated-ui.json`
- `src/i18n/messages/de/index.json`
- `src/i18n/messages/en/consolidated-ui.json`
- `src/i18n/messages/en/index.json`
- `src/i18n/messages/es/consolidated-ui.json`
- `src/i18n/messages/es/index.json`
- `src/i18n/messages/fr/consolidated-ui.json`
- `src/i18n/messages/fr/index.json`
- `src/i18n/messages/it/consolidated-ui.json`
- `src/i18n/messages/it/index.json`
- `src/i18n/request.ts`
- `src/tests/documents-browser.e2e.mjs`
- `src/tests/i18n-browser.e2e.mjs`
- `src/tests/i18n-consolidation.test.ts`
