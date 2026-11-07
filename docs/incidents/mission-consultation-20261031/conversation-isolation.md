# PR #221 — assertion d'isolation de conversation

Base : `455a58055c9328d84554e3f1f978c6a09927eeb0`. Même branche `fix/native-mission-consultation-context-20261031`. Aucun fichier applicatif, ACL, connecteur, migration, interface ou workflow modifié.

## Reproduction exacte

Sur le serveur Next optimisé existant et PostgreSQL jetable, le test commercial passe puis `native-conversation-browser.e2e.mjs:25` échoue exactement sur `!JSON.stringify(current).includes('LOT4BIS_MISSION_B')`. Les deux tests sont exécutés séquentiellement comme dans le workflow natif. La phase de préparation locale a d'abord rencontré ECONNREFUSED avant disponibilité du serveur ; après disponibilité HTTPS vérifiée, l'assertion GitHub a bien été reproduite. Ce problème de démarrage n'est pas présenté comme la cause de l'échec CI.

## Champs identifiés et autorisation

Les seules occurrences observées se trouvent dans :

- `current.sources[0].data.missions[1].title` et `.objective` ;
- `current.sources[0].summary` ;
- `current.brainDashboard.sources[0].data.missions[1].title` et `.objective` ;
- `current.brainDashboard.sources[0].summary`.

L'index de la mission dépend du tri des identifiants ; les nouvelles assertions recherchent les entrées par identifiant, sans figer cet index. Le fichier `conversation-isolation-fields.json` conserve uniquement ces chemins et les résultats booléens du contrôle, jamais la session complète, les cookies ou des données Production.

**Présence légitime.** Dans ce test, les variables `a` et `b` sont deux sessions du même utilisateur canonique, créé avec le même bearer synthétique A. Une lecture SQL indépendante des autorités confirme : même propriétaire, même workspace/client/projet, deux autorités actives. Les sessions sont distinctes, mais toutes deux autorisées à lire les missions de W/C1/P2. La session courante reste liée à la mission A. L'objectif contient aussi le marqueur B car le test crée chaque mission avec `objective: title`.

Le nouveau registre natif autorise la lecture de la mission sœur B ; il n'autorise ni réaffectation du fil A ni lecture du contenu de conversation B. L'ancienne exclusion du marqueur dans la totalité de `current` confondait ces deux périmètres.

## Correction du test uniquement

- Vérifier explicitement workspace/client/projet/session courants, `mission.id`, `nativeMissionId` et session du Brain inchangés après les mutations refusées.
- Pour chacune des deux copies de la source `native-missions`, vérifier son statut, sa portée exacte, la mission sélectionnée, les identifiants/titres du registre autorisé retourné par l'API native, le compteur et le résumé sérialisé.
- Autoriser B uniquement dans cette source ; maintenir son absence dans le reste de la session et du dashboard.
- Ajouter un tour propre au fil B et vérifier qu'il n'entre jamais dans le fil A ou son contexte Brain ; B ne reprend pas non plus le tour A.
- Vérifier le refus d'un autre utilisateur sur le fil A et l'absence des missions A/B dans les vues d'autres client/projet.
- Conserver les refus 409 de réaffectation, le refus 403 interclients, l'acquittement perdu, le rejeu, la concurrence, l'abandon, la pagination et la reprise authentifiée existants.

## Résultats et limites

**Deux recettes HTTPS PASS** : commerciale puis conversationnelle corrigée. **52 tests ciblés PASS, 0 FAIL, 0 SKIP**, incluant consultation native et révocation concurrente transactionnelle. TypeScript, lint ciblé et diff-check PASS. Voir `conversation-isolation-validation.txt`.

PostgreSQL, routes natives, serveur Next optimisé et Chromium réels en isolation ; fournisseurs de génération simulés et réseau métier bloqué. Aucun fournisseur réel ni donnée Production. Le build précédent reste applicable, l'arbre applicatif est strictement identique ; aucun nouveau build ou nouvelle recette visuelle revendiqué.

La publication sur la même branche met à jour #221 ; les résultats distants doivent être lus sur le nouveau SHA, sans les déduire des résultats locaux. Aucun merge, déploiement ou migration distante. **GO technique isolé du scénario corrigé.**
