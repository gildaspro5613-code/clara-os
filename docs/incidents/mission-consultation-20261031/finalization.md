# Révocation pendant consultation — correction transactionnelle

Base : `5bd5687ea2e20ab37dd78d17454782590ba7b475`. Même branche `fix/native-mission-consultation-context-20261031`. La revue et ses preuves sont conservées ; cette correction résout la fenêtre qu'elle avait reproduite.

## Cause et correction

La relecture JavaScript précédait la requête `finish`. Une révocation de mission secondaire pouvait donc être validée entre ces deux transactions, puis un nouveau message contenant son titre être finalisé.

Le chemin de finalisation utilise désormais **une seule requête SQL**, transmise par l'adaptateur Neon existant :

1. Résolution du contexte par `clara_native_runtime_command` et verrouillage canonique/workspace existants.
2. Vérification du propriétaire, workspace/client/projet, autorité non révoquée, empreinte canonique et valeurs métier effectivement lues.
3. Verrous PostgreSQL `FOR SHARE` sur les lignes des missions lues et leurs autorités, dans un ordre déterministe. Ils bloquent leur modification/révocation jusqu'à la fin de la transaction.
4. Appel de `clara_native_chat_command(...,'finish',...)` uniquement si toutes les lectures restent autorisées. Sinon : refus 409 `NATIVE_MISSION_CONTEXT_CHANGED`, sans persistance du nouvel échange ; le reçu de refus est conservé par le mécanisme existant.

Les CTE matérialisées ordonnent ces étapes. Il n'y a ni transaction maintenue pendant la génération, ni seconde connexion applicative, ni modification de routine SQL installée. **Aucun fichier de migration créé ou modifié, aucun GRANT, aucun changement de schéma/ACL.** Le runtime conserve les permissions des opérations existantes. Les verrous de lecture emploient les droits de table déjà requis par les mutations natives ; aucun privilège n'est attribué.

La mission active est aussi protégée lorsqu’elle se trouve hors de la liste bornée à 100 éléments (au plus 101 missions verrouillées). Les preuves de lecture sont produites côté serveur à partir du store autorisé, jamais acceptées du navigateur. Les missions non consultées ne sont pas ajoutées à la réponse. Les anciens reçus et le contrôle de rejeu demeurent compatibles ; aucune suppression d'historique.

## Preuves avant / après

| Scénario | Avant | Après |
|---|---|---|
| Autorisation maintenue | Consultation 200 | Consultation 200 ; missions intactes, historique et rejeu conservés |
| Révocation après contrôle JS, avant `finish` | **200**, nouveau message contenant le titre révoqué | **409**, aucun titre révoqué dans la réponse |
| Révocation prend la ligne en premier et reste non commitée | Non couvert auparavant | Finalisation réellement bloquée sur le verrou ; après commit de révocation : **409**, **0 nouveau message**, rejeu 409 |
| Finalisation prend les verrous en premier | Non couvert auparavant | Révocation réellement bloquée par le PID de finalisation ; **200 finalisé avant le commit de révocation** ; rejeu ultérieur 409, échange historique conservé |

Les deux derniers cas utilisent des connexions PostgreSQL distinctes avec transactions simultanées. Les attentes réelles sont observées dans `pg_stat_activity` et `pg_blocking_pids`, avec barrières explicites, sans simple suite de requêtes séquentielles ni délai arbitraire supposant un ordre.

La garantie porte sur l'ordre de finalisation SQL : une révocation déjà commitée gagne et interdit le nouveau message ; si la finalisation gagne, la révocation ne peut commiter qu'après. Une révocation ultérieure ne supprime pas un échange déjà finalisé et ne rappelle pas les données déjà lues à un instant autorisé. La vérification n'annonce pas une disparition rétroactive des historiques.

## Fichiers et contrôles

- `src/lib/native/chat.ts` : requête unique de vérification/verrouillage/finalisation et refus sans appel à finish si la preuve est invalide.
- `src/lib/native/cognitive-scope.ts`, `scoped-context.ts` : projection serveur des valeurs lues, transmise uniquement à la finalisation.
- `operational-recovery-mission-finalization-postgres.test.ts` : reproduction de la revue et deux ordres concurrents réellement observés.
- `operational-recovery-mission-consultation-postgres.test.ts` : conservation des refus, de l'historique, du rejeu et rejet de preuves fournies par le navigateur.
- `native-runtime-browser-preload.mjs` : autorise dans le transport de test la forme identifiée de la nouvelle requête native ; l'exécution reste PostgreSQL réelle et les chargeurs globaux restent interdits. Aucune assertion de sécurité retirée.

**50 tests PASS, 0 FAIL, 0 SKIP ; une recette navigateur HTTPS PASS. TypeScript, lint ciblé et build optimisé Webpack PASS**, avec polices locales simulées. Résultats et commandes dans [finalization-validation.txt](finalization-validation.txt). La suite opérationnelle existante inclut automatiquement le nouveau test par son glob ; aucun nouveau workflow. Les tests de concurrence n'appellent aucun modèle ; la reproduction du chat et la recette navigateur simulent uniquement les fournisseurs de génération. Aucune lecture native des missions ni autorisation SQL simulée.

**GO technique isolé pour la correction du scénario de révocation.** Le Cockpit, les autres pages, les connecteurs métier, les migrations et les ACL restent identiques à la base. La lecture distante des CI sera rapportée séparément, sans inférer leur succès des tests locaux. Aucun merge, migration distante ou déploiement effectué. La publication reste limitée à la branche autorisée avec les protections historiques anti-déploiement inchangées.
