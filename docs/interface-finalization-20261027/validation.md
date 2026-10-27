# Validation de l’interface candidate

Source applicative : `074909541b91f48024f4d83a1be3c7b3be9166da`, base `bc1fda97fcbb003479fbc49f7260e9c560c0b5e9`. Les commits documentaires suivants ne modifient pas l’application reçue. Environnement : Next.js optimisé, Chromium local, proxy TLS et PostgreSQL jetable ; transport Neon substitué par l’adaptateur PostgreSQL existant. Aucune preuve de transport Neon HTTP/fournisseur réel n’est déduite.

| Contrôle | Résultat local | Preuve |
| --- | --- | --- |
| Contrat natif Google + parité i18n existante | 12 PASS, 0 échec | evidence/unit-contract-i18n.txt |
| Non-régression opérationnelle, commercial, OAuth durable et refus vocaux | 22 PASS, 0 échec | evidence/nonregression.txt |
| Remise en exploitation/autorité en PostgreSQL réel local | 12 PASS, 0 échec, dont 11 sous-cas et leur parent | evidence/postgres-authority.txt |
| TypeScript et build Next.js optimisé | PASS, code de sortie 0 | evidence/build-typescript.txt |
| Lint des composants modifiés et recettes impactées | 0 erreur, avertissement préexistant sur le SVG img du logo | evidence/lint-targeted.txt |
| Réception interface finale | 1 test transverse PASS ; 13 pages × 3 formats FR et × 5 langues desktop, soit 91 combinaisons distinctes | evidence/interface-browser.txt, browser-matrix.csv |
| Continuité métier, document, approbation et redémarrage | 4 recettes PASS, dont reprise après redémarrage effectif ; zéro envoi réel | evidence/business-restart.txt |

La première commande agrégée de tests opérationnels, sans CANONICAL_TEST_CONTAINER, avait 15 PASS et 1 SKIP (PostgreSQL). Ce sous-ensemble a ensuite été exécuté avec le conteneur réel et ses 12 contrôles PASS ; le SKIP n’est pas présenté comme réussi. Les résultats ci-dessus sont détaillés par commande, sans additionner plusieurs fois les mêmes scénarios.

## Commandes et portée

- `node --import tsx --test src/tests/google-native-hub.test.ts src/tests/i18n-consolidation.test.ts`
- `node --import tsx --test src/tests/operational-reception.test.tsx src/tests/voice-route-security.test.ts src/tests/commercial-operational-continuity.test.ts src/tests/google-durable-oauth.test.ts`
- `CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/operational-recovery-postgres.test.ts`
- `npm run build` (inclut TypeScript) et ESLint ciblé sur les composants modifiés, nouveaux tests et recettes impactées.
- `node --import tsx --test src/tests/interface-finalization-browser.e2e.mjs`, avec le serveur, TLS et fixture existants décrits dans `.github/workflows/native-authority-validation.yml`. Cette même recette est ajoutée au workflow existant sur une base jetable fraîche, sans nouveau workflow/service.
- Réutilisation locale de `operational-recovery-browser.e2e.mjs`, `native-document-continuity-browser.e2e.mjs` avec `V1_FIRST_DAY=true`, redémarrage effectif de Next, puis recettes de reprise. Aucune migration distante.

Le navigateur crée explicitement une mission, associe un contact autorisé, transmet un message multiligne, retrouve la conversation après rechargement, vérifie le Journal et visite les pages sur le même contexte durable. Il contrôle le menu clavier/Échap, la navigation active, l’absence de débordement horizontal sur les pages visitées et l’identité des fichiers logo/favicon. Les sources métier ne sont pas traduites lorsque la langue de l’interface change.

Les captures des formats 1440×1000, 768×1024 et 390×844 correspondent à des viewports Chromium, pas à des tests de matériel iOS/Android/Safari. Le rendu, les frontières de présentation et les comportements exécutés sont reçus ; aucune certification complète d’accessibilité ou fournisseur n’est inventée.

Les états Microsoft refusé et les états IONOS vide/refusé sont explicitement injectés à la frontière HTTP dans le test de présentation. Ils ne certifient aucune connexion. La campagne métier dédiée utilise les vrais handlers/services et SQL, avec injections de fournisseurs uniquement, et exige zéro tentative SMTP/écriture Google.

## Échecs intermédiaires conservés

- Premier test de la nouvelle recette : sélection ambiguë d’un nom Contact, pointant une option cachée. Le test cible maintenant la fiche identifiée, sans clic forcé ou délai augmenté.
- Un passage intermédiaire complet a reçu la navigation multiformat/langue avant le dernier repli des réglages. Il n’est pas substitué à la campagne sur la source finale, qui a été rejouée avec succès.
- Une exécution du lanceur de continuité a été interrompue par une commande parasite lors de sa modification locale. Les résultats partiels ne sont pas comptés. Le lanceur est ensuite figé et relancé sur une nouvelle base jetable ; la trace initiale est conservée.

## Protections et réserves

`git diff bc1fda9 -- src/app/api src/lib db/migrations package.json package-lock.json public` est vide. Aucun historique, autorité, contrat, transport, secret ou donnée distante modifié. Les nouvelles interactions testées n’autorisent pas de mutation implicitement : les contrôles natifs existants restent décisionnaires.

Exclusion Vercel de la branche ajoutée dans `git.deploymentEnabled`, avec réutilisation des protections historiques. Les workflows manuels de déploiement ne sont pas lancés. Les résultats CI terminés et les déploiements observables GitHub du SHA publié seront consignés dans la PR. Aucune absence d’accès Vercel n’est présentée comme une absence de protection.

Les anciennes réserves dépendances, lint global et HTTP 503 restent documentées ; aucune nouvelle campagne générale n’a été lancée. Les pages visitées doivent répondre 200 dans cette recette ; les 401/403/409/503 natifs attendus restent des refus explicites, pas de faux succès.
