# Validation réellement exécutée

**Code final : `8bdc396ecafc98f76eb910ad8f5fa7919343a15a`.** PostgreSQL jetable local, Next.js optimisé réel, Chromium local HTTPS. Fournisseurs simulés, aucun effet externe métier.

| Contrôle | Résultat observé | Preuve |
|---|---|---|
| Unités/contrats, autorisations voix, Google, Microsoft, consultation/commande, langues, progression | **45 PASS, 0 FAIL, 0 SKIP** sur le contenu final | `evidence/unit-tests.txt` |
| TypeScript et build Webpack | **PASS**. Build après `bed7725`; aucun fichier applicatif ne diffère au SHA final | `evidence/build-typescript.txt`, `evidence/source-equivalence.txt` |
| Lint ciblé des fichiers modifiés | **0 erreur**, 2 avertissements conservés | `evidence/lint.txt` |
| Recette interface complète finale | **1 scénario PASS**; 13 pages, 3 formats FR + 5 langues desktop, **91 combinaisons uniques**; conservation du contexte et des messages, reprise depuis le Cockpit, profil/Échap, recherche, erreurs sans secrets, révocation de la session E et conservation des données via A | `evidence/interface-final.txt`, `interface-final-matrix.json` |
| Hero final et navigation Mission | **1 scénario PASS**, 15 combinaisons langue/format, 2 missions créées/persistées via les routes canoniques, panneaux sans chevauchement/troncature, ouverture d’une autre fiche sans réaffecter la conversation, retour et rechargement de la liste | `evidence/hero-final.txt`, `hero-final-matrix.json` |
| Continuité et redémarrage | **4 recettes PASS** : consultation/commande; document→Core/Brain→Clara→Journal et première journée; reprise après arrêt/redémarrage réel de Next; reprise documentaire avec reçus et sources durables | `evidence/continuity-restart.txt`, `evidence/business/*.json` |
| Première journée / approbations | PASS simulé, **0 tentative SMTP**, **0 écriture Google**, approbation distincte de l’exécution | `evidence/business/first-day-result.json` |
| Non-régressions natives réutilisées | Cockpit, commercial, runtime et Mission/Contact **1 PASS chacun** sur `c2849a3`; parcours commercial avec dialogue lisible repassé sur le contenu `fbc6fc8`. Routes, stores et permissions inchangés depuis | `evidence/native-regressions/` |
| CI GitHub du HEAD publié | **NON ATTESTÉE** — accès réseau à `api.github.com` interdit dans l’environnement observé; aucune réussite GitHub inventée | `evidence/network-readiness.json` |
| Preview Vercel / fournisseur réel / microphone | **NON EXÉCUTÉ** | `preview-proposal.md` |

Les quatre recettes de continuité ont été exécutées sur le contenu applicatif `58c4007`, avant les seuls correctifs ultérieurs de progression affichée et de retour de fiche Missions. Les contrats, stores, routes documentaires/mail, autorisations, chiffrage et reçus restent inchangés; les différences Missions sont couvertes par le test multilingue 29%/38% et le scénario Hero final. Aucun résultat fournisseur n’est déduit de ces simulations.

## Commandes et reproduction

- `node --import tsx --test src/tests/operational-reception.test.tsx src/tests/voice-route-security.test.ts src/tests/commercial-operational-continuity.test.ts src/tests/google-durable-oauth.test.ts src/tests/google-native-hub.test.ts src/tests/i18n-consolidation.test.ts src/tests/operational-recovery.test.ts src/tests/microsoft-connect-presentation.test.ts src/tests/microsoft-authenticated-routes.test.ts src/tests/microsoft-oauth-policy.test.ts`
- ESLint sur les fichiers source/tests modifiés, sans désactiver de règle : avertissement historique `<img>` du logo conservé, et navigation complète du sélecteur de conversation (rechargement assurant un contexte frais). Aucun `max-warnings` artificiel ni exclusion nouvelle.
- `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=<fixture locale existante> NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack`. Le hook de police est uniquement local; les captures ne certifient pas la typographie finale servie par Vercel. Aucun changement des fonts/dépendances en Production.
- Réutiliser la fixture, le preload, la base jetable, le certificat local et le proxy TLS existants de `.github/workflows/native-authority-validation.yml`. Exécuter `interface-finalization-browser.e2e.mjs` et `historical-interface-cockpit-browser.e2e.mjs` sur des bases fraîches. Pour la continuité : `DOCUMENT_CONTINUITY_EVIDENCE=<répertoire /workspace dédié> V1_FIRST_DAY=true`, puis redémarrer Next sur la même base avant les deux recettes de reprise. Jamais de connexion distante de remplacement.

Le workflow existant conserve ses contrôles, et ajoute la réception Microsoft de présentation au groupe contrats/langues. La recette complète partage sa fixture avec la recette Google suivante en CI : elle révoque **E**, session indépendante préexistante, et vérifie qu’**A** reste valide. Il n’y a aucune création d’autorité administrative de substitution.

## Échecs qualifiés, non masqués

- Menu de profil derrière le workspace : défaut UI reproduit par interception des clics, corrigé par l’ordre d’affichage. Aucun clic forcé.
- Liste de fils absente : contexte demandé dans un rendu serveur différé; lecture déplacée dans la clôture authentifiée de page avant retour de l’arbre React. Aucun repli global.
- Anciennes attentes de bandeau documentaire au Cockpit : retirées conformément à la mission; les preuves de références restent exigées par l’API autorisée et dans Documents/Brain/Clara, avant et après redémarrage.
- Compteur SQL contaminé par une campagne groupée et réglages ouverts avant fin du rechargement : fixtures séparées et attente de navigation réelle. Aucune modification du transport ou de sa liste de requêtes permises.
- Premier lancement documentaire sans chemin de preuve : refus du harness « Isolated evidence path required », corrigé par un répertoire dédié. Pas un défaut fournisseur.
- Après déconnexion : absence de cookie = 401; jeton révoqué explicitement rejoué = 403 `REGISTRY_ACCESS_DENIED`, conforme au contrat existant. L’assertion a été précisée, pas les droits.
- Progression : repro avant correctif conservée (`evidence/progress-before.txt`), puis 29% enregistré affiché dans les trois vues sans changer le compte 3/8 ni les données.

Les journaux intermédiaires sont conservés séparément. Aucun timeout augmenté, retry d’opération ajouté ou test d’autorité supprimé pour obtenir du vert.

Les copies de journaux du dossier sont normalisées en LF, sans couleurs terminal ni espaces de fin de ligne; les résultats et messages sont conservés. Les originaux de campagne restent dans les fichiers de travail ayant produit ces preuves.
