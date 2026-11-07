# Validation exécutée des candidats intégrés

Date : 25 octobre 2026. Code métier OS testé : `674980e859b144fbc3f7ec0d6f8fc8842177120e` ; dernière fixture de réception : `2f32474877425120142b5508a43270b4f396731d`. Code Live : `59fbac42d940eae0925524aae1691b50d01f0261`. Les commits documentaires ultérieurs ne changent pas le code testé.

| Contrôle | Résultat exécuté | Preuve |
|---|---|---|
| OS gardes Recette, Google sign-in, signatures, langues, MIME, Stage UI, contrats conversations, Make et reçus téléphonie | 67 PASS | evidence/os-contracts.log |
| OS événements cognitifs, authentification produit Live, échecs documentaires, attestation avec transports simulés | 32 PASS | evidence/os-cognitive-contracts.log |
| OS PostgreSQL : conversation bilatérale, Stage multidomaine/rôle limité, IONOS | 14 PASS ; 2 MagicQ initialement ignorés faute de variable explicite | evidence/os-postgres.log |
| MagicQ avec activation explicite du container PostgreSQL jetable | 2 PASS, 0 ignoré | evidence/os-magicq-postgres.log |
| Live backend : accès/contexte projet, Unified Core, client OS, événements, conversation:link, délégation MongoDB et révocation | 98 PASS | evidence/live-contracts.log |
| Live interfaces : conversation/projet, advice, Clara, BusinessWorkspace/navigation, MagicQ | 37 PASS, 6 suites | evidence/live-ui.log |
| OS Chromium : documents/Brain/conversation/courrier/Agenda/Cockpit et refus | 1 PASS ; parcours J1 enregistré, fournisseurs simulés | evidence/os-browser.log ; evidence/first-day-result.json |
| OS Chromium : arrêt/redémarrage réel, 7 pages, reprise des reçus et nouveaux fils | 1 PASS | evidence/os-browser-restart.log ; evidence/restart-result.json |
| OS Chromium : refus voix anonyme, Entrée ne lance pas un appel, Make/Brevo indisponibles explicitement | 1 PASS | evidence/os-browser-surface.log |
| Live Chromium + handlers OS réels, PostgreSQL/Mongo : settings, mapping, refus, cinq langues, redémarrage OS | 1 PASS | evidence/live-browser.log |
| TypeScript OS et lint ciblé des résolutions/fixture | PASS, exit 0 | evidence/os-static-results.json |
| Build OS Next.js 16.4.3 | PASS | evidence/os-build.log |
| Build Live frontend | PASS, compiled successfully | evidence/live-build.log |
| Compilation Python backend | PASS | compileall -q backend exécuté |
| Toutes migrations OS présentes | 29 fichiers appliqués dans une base vide jetable | evidence/migration-manifest.json |
| Récupération SQL locale | pg_dump restauré dans une autre base jetable ; objets présents, et reçus/associations restaurés par le test conversation | evidence/migration-manifest.json et os-postgres.log |
| Sources métier reçues et dépendances corrigées | Inchangées sur les chemins comparés | evidence/unmodified-received-paths.json |
| 137 preuves historiques | 137 identiques, aucune divergence ; archive privée séparée vérifiée | evidence/historical-preservation.json |
| CI GitHub du candidat final | NON EXÉCUTÉE : aucune publication / aucun workflow déclenché | Ne pas substituer les CI des PR sources |
| Bindings effectifs Vercel / Neon / MongoDB distants | NON ATTESTÉS dans cette mission | Aucun secret ni accès distant SQL utilisé |
| Modèle cognitif / fournisseur vocal / matériel / SMTP réels | NON EXÉCUTÉS | Aucune certification réelle nouvelle |

Total hors navigateur : **250 tests PASS** (115 OS, 135 Live). **4 recettes navigateur PASS** (3 OS, 1 Live). Les 137 preuves conservées ne sont pas ajoutées au nombre de tests exécutés.

## Échecs conservés et correction de la recette

Deux passages initiaux du navigateur OS ont échoué. Leurs résumés restent dans `evidence/browser-documents-attempt-1.txt` et `...attempt-2.txt`, les traces complètes restent dans le dossier de preuve local externe au dépôt.

- Premier passage : attente de 30 secondes du bouton Agenda pendant le chargement des capacités. Le proxy local a relevé des GET 200 de 20 à 25 secondes ; ce délai seul ne prouve pas une panne du fournisseur. Le délai d'attente de cette interaction de test est porté explicitement à 90 secondes, sans nouveau POST ni retry de transport.
- Deuxième passage : le test quittait la page dès que le bouton Envoyer était visible. Or ce bouton est déjà rendu, désactivé, avant la fin de l'approbation. La recette attend maintenant le POST approve 200 et vérifie l'état durable `approved` en SQL avant navigation. Le passage final retrouve l'approbation dans le Cockpit et le Journal, sans tentative SMTP.
- Fixture de brouillon adaptée au contrat existant #207 : réponse anglaise d'un correspondant synthétique anglais, métadonnée language et comparaison exacte du texte avec signature. Pas d'affaiblissement de la validation métier.

Le passage final de la recette documentaire a pris environ 456 secondes dans le harnais local (transport Neon remplacé par des processus psql/docker), la reprise environ 90 secondes. Ce n'est pas une mesure de latence du futur environnement Vercel/Neon. Aucun chiffre de performance Production n'est extrapolé.

Les 503 de refus explicitement attendus (Make/Brevo natif) restent vérifiés. Les 503 historiques ne sont pas déclarés résolus. La météo simulée non disponible affiche son indisponibilité, sans être présentée comme un résultat fournisseur réel. Lint global et alertes de dépendances historiques restent consignés dans le dossier antérieur ; seules les vérifications ciblées ci-dessus ont été rejouées.

## Commandes réutilisables, sans effet fournisseur

Les fichiers de tests listés dans les logs sont ceux du candidat. Le runner de recette OS conservé ici emploie uniquement des identités, tokens et données synthétiques réservés ; le preload remplace les transports externes et interdit le SQL global. Il nécessite PostgreSQL local jetable, Chromium et les dépendances déjà installées. Les résultats ne prouvent pas le transport Neon HTTP réel.

Les tests PostgreSQL conversation ont utilisé `CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres`, `CONVERSATION_LIVE_REPO=/workspace/clara-live-delivery`, le Python isolé, et Mongo local. MagicQ exige `MAGICQ_TEST_CONTAINER=clara-canonical-test-postgres` pour éviter un faux passage par SKIP. Le test Live navigateur exige `TARGETED_RECEPTION=1`, `CANONICAL_STAGE_OS_REPO=/workspace/clara-os-delivery` et un dossier de preuve local ; il n'envoie pas de show.

**Verdict technique : GO pour les parcours isolés effectivement exécutés. NO-GO pour ouvrir une recette distante sans attestation et autorisation distinctes ; Production NO-GO.**

Les copies textuelles des logs sont normalisées uniquement pour les espaces de fin de ligne, CRLF et lignes vides finales ; les logs originaux restent conservés hors dépôt. `evidence/log-normalization.json` donne leurs empreintes avant/après. Aucun résultat ou avertissement n’a été supprimé.
