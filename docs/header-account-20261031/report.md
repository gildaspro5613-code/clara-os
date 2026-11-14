# Restauration du menu utilisateur — 31 octobre 2026

Base : `fba152a6d232b7d079d523a3afbfdedf3965160b`, branche `delivery/clara-os-v1-20261025`, comprenant la PR #221. Travail isolé : `fix/header-account-menu-20261031`.

## Réutilisation et périmètre

Le Header courant présentait un avatar inactif. Le Header historique `fbc6fc8b` utilisait déjà la confirmation de déconnexion, le POST natif `/api/auth/session/logout` et le rechargement après succès. Ces mécanismes sont réutilisés sans modification de leur autorité.

La lecture du compte réutilise `readAuthCookie`, `createAuthenticatedWorkspaceResolver` avec `connections:read`, les sessions et appartenances canoniques, puis une revérification de leur validité. Le nom utilise uniquement `readGoogleDisplayName`, preuve chiffrée liée à la session issue du callback Google existant. Aucun subject, email, identifiant de session ou de workspace n'est envoyé au menu.

« Compte Google » décrit l'association Google vérifiée dans l'autorité Clara OS, pas une certification du fournisseur ni une permission Drive/Agenda. Le menu indique explicitement cette distinction. Sans nom vérifié, il affiche un libellé générique ; sans lecture fiable, un état indisponible/non vérifié.

Aucune page Profil ou Préférences distincte n'a été retrouvée : le profil est présenté dans le menu, et Préférences donne le focus au sélecteur de langue existant. Aucun lien fictif ni nouvelle page. Le lien de connexion éventuel réutilise `/api/auth/google/start`.

Le menu utilise le popover natif du navigateur, accessible au clavier, fermeture Échap/clic extérieur, touches directionnelles/Home/End. L'avatar conserve ses 40×40 px, couleurs et icône 19 px. Un test compare le JSX du Header à la base en excluant uniquement l'emplacement de l'avatar ; aucun autre élément n'est déplacé lors de l'ouverture.

## Fichiers

- `src/components/layout/Header.tsx` : remplacement de l'avatar inactif uniquement.
- `src/components/layout/UserAccountMenu.tsx` : menu de compte.
- `src/app/actions/account-profile.ts`, `src/lib/auth/account-profile.ts` : lecture serveur de présentation, sans écriture ni appel fournisseur.
- `src/i18n/messages/{fr,en,es,de,it}/index.json` : traductions du menu uniquement.
- `src/tests/header-account-postgres.test.ts`, `src/tests/header-account-browser.e2e.mjs` : tests ciblés.
- `src/tests/helpers/native-runtime-browser-preload.mjs` : autorisation des seules lectures d'identité testées contre PostgreSQL ; refus des chargeurs métier globaux conservé.
- `.github/workflows/native-authority-validation.yml` : intégration des tests dans la CI existante, fixture séparée pour la déconnexion.
- Ce dossier : rapport, résultats et captures.

## Réception isolée

PostgreSQL 17 réel jetable, application Next optimisée, navigateur Chromium HTTPS. Identités et preuve Google synthétiques ; aucun OAuth ou fournisseur réel sollicité.

Contrôles : sessions manquantes/dupliquées/expirées/révoquées, appartenance révoquée, sélection étrangère ou ambiguë, nom lié à un autre utilisateur, Google absent, panne SQL non sensible. Le navigateur vérifie FR/EN/ES/DE/IT × desktop/tablette/mobile, position du menu, stabilité du Header, clavier, fermeture et préférence existante.

La déconnexion utilise réellement la route native et révoque la session dans PostgreSQL. L'origine étrangère est refusée ; une panne simulée ne produit pas de faux succès. Après succès, aucun cookie d'authentification non vide ne subsiste, les pages protégées sont verrouillées, l'API refuse l'absence de session et l'ancien jeton révoqué. Le transport natif peut conserver des cookies vides ; ils ne permettent pas l'authentification. Aucun changement de ce mécanisme existant.

Captures : `screens/desktop-open.png`, `screens/tablet-open.png`, `screens/mobile-open.png`, données fictives. Inspection visuelle desktop/mobile effectuée. Aucun changement de Hero, Sidebar, GlassPanels, recherche, Journal, contexte métier ou pages.

Les résultats exacts sont conservés dans `results.txt`. Les tests de consultation des missions et de révocation concurrente #221 sont réutilisés en non-régression. Build Webpack avec fixture locale des polices, sans modification des dépendances. Cela ne certifie pas une authentification Google réelle en Production.

## Livraison et limites

Publication sur branche dédiée, sans merge, migration, déploiement ni modification fournisseur. Protections historiques réutilisées : `docs/delivery-v1-20261025/publication-protection-evidence.md`. Aucun workflow manuel de livraison lancé.

GO technique isolé sous réserve des résultats finaux et CI distante ; réception réelle du propriétaire et autorisation de merge/déploiement distinctes.
