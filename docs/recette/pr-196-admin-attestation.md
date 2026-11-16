# #196 — unique intervention administrateur : attestation effective Recette

**But : lecture seule, aucun déploiement, aucune modification de variable ou de secret.** Ce document ne confère pas un accès supplémentaire. Codex n'a pas accès aux valeurs effectives ; résultat actuel NON ATTESTÉ. L'existence attestée indépendamment du projet, de l'Environment, de la branche et des quatre variables ne prouve pas leurs valeurs actives.

## Prérequis à vérifier, sans afficher de valeur

L'administrateur utilise un contexte Cloud opérateur de confiance **déjà autorisé** à lire les métadonnées Vercel/Neon et disposant des bindings effectifs de la cible. Aucun shell interactif Vercel, droit de déchiffrement ou accès au coffre n'est supposé disponible. Si ce contexte n'existe pas ou si les valeurs sensibles restent inaccessibles, **STOP : NON ATTESTÉ**. Il faut faire autoriser ce moyen d'exécution/lecture effectif ; ne pas contourner Sensitive, ajouter une route publique, créer un workflow/service, déployer un diagnostic ou recopier des valeurs attendues à leur place.

Bindings que le contrôle doit recevoir par le canal sécurisé existant, jamais via arguments/historique shell/chat/GitHub :

- `DATABASE_URL`, `CLARA_RECETTE_NEON_HOST`, `CLARA_RECETTE_NEON_BRANCH_ID`, `CLARA_RECETTE_MODE` : valeurs réellement effectives du custom Environment Vercel, y compris les éventuels overrides. Pas une ancienne copie de coffre présumée équivalente.
- `VERCEL_PROJECT_ID`, `VERCEL_DEPLOYMENT_ID`, `VERCEL_TARGET_ENV`, `VERCEL_ENV` : identité effective du déploiement examiné.
- `VERCEL_TOKEN` et `NEON_API_KEY` : accès de lecture existants dans le seul contexte opérateur. Aucun ajout à l'application, aucune création/rotation de clé. Autorisations nécessaires : lire métadonnées du projet et du déploiement Vercel, lister les endpoints du projet Neon. Une permission 403 implique NON ATTESTÉ, pas une demande d'accès administrateur SQL.
- `POSTGRES_URL` doit être absent : pas de fallback ambigu. Aucun token de session ni mot de passe utilisateur requis par le contrôle.

Cibles autorisées : projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz` / `clara-os-recette`, Environment **env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM**, mode `isolated-v1`, projet Neon `fragrant-dream-31652403`, branche **br-crimson-feather-b2zr00sf**, base `neondb`, rôle `clara_os_recette_limited`. Ne pas utiliser main, une sauvegarde ou un rôle owner. Le contrôle vérifie les métadonnées de branche **avant** toute connexion SQL. Le rôle ne doit permettre aucun SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION ni CREATE public/base ; aucun GRANT exécuté pour le faire passer.

## Commandes dans ce contexte, sous autorisation de lecture

1. Utiliser le checkout du **SHA final #196 approuvé** indiqué dans le rapport de remise. Vérifier son identité publique (`git rev-parse HEAD`) et installer depuis le lockfile **avant** injection des accès sensibles :

   ```sh
   npm ci --ignore-scripts --no-audit --no-fund
   ```

2. Charger les bindings effectifs par le mécanisme sécurisé déjà autorisé. Ne pas utiliser `env`, `printenv`, `set -x`, `vercel env pull`, un dump, un export copié en ligne de commande, ni un fichier/artefact de secrets. Ne pas demander une chaîne de connexion dans ChatGPT ou GitHub. Si l'accès actuel ne fournit que les noms, ce n'est pas suffisant pour ce contrôle.

3. Identifier via les métadonnées Vercel le **vrai SHA approuvé actuellement déployé** dans l'environnement examiné. Le SHA de l'outillage peut être plus récent ; il n'est pas le SHA d'une application non encore déployée. Exécuter, en remplaçant uniquement le placeholder public :

   ```sh
   node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=<SHA_COMPLET_APPROUVÉ_RÉELLEMENT_DÉPLOYÉ>
   ```

   Le script n'accepte aucune valeur sensible en argument. Il effectue trois GET de métadonnées et un SELECT de catalogues en transaction Neon HTTP `READ ONLY` ; aucun DML, DDL, renouvellement de session ou opération fournisseur. Les exceptions/URLs/tokens/empreintes ne sont jamais propagés dans sa sortie.

4. Conserver uniquement le JSON expurgé, le SHA public d'outillage, le SHA public de cible et la référence de revue administrative. Ne pas capturer des headers, requêtes, cookies, corps de métadonnées ou variables. La provenance du contexte effectif doit être attestée par l'administrateur ; un JSON PASS sans cette provenance n'est pas une attestation fiable des variables Vercel.

## Interprétation sans ambiguïté

| Sortie | Exit | Conclusion |
|---|---|---|
| PASS + quatre labels validés | 0 | Configuration/isolation effectives prouvées dans ce contexte : projet/environnement/source, hôte/branche et base/rôle limité |
| FAIL | 1 | Divergence prouvée : Production, mauvaise identité, ID d'environnement homonyme différent, autre branche/base/rôle ou privilèges interdits ; arrêter sans modifier la configuration |
| NON ATTESTÉ | 1 | Valeur, accès, format de métadonnées/preuve ou connexion manquant ; ne pas en déduire PASS ni FAIL |

Les quatre labels PASS sont ISOLATION_CONFIGURATION, VERCEL_PROJECT_ENVIRONMENT_SOURCE, NEON_ENDPOINT_BRANCH, SQL_DATABASE_LIMITED_ROLE_NO_ADMIN. `writesRequested` reste false. Aucun label n'affiche d'identifiant privé ou de secret.

Cette intervention permet de lever le blocage de configuration **de la cible examinée**, pas de prétendre que le futur commit #196 est déjà déployé ou reçu. Si un déploiement isolé est ensuite autorisé explicitement, refaire l'attestation avec son nouveau deployment ID/SHA effectifs, puis exécuter le protocole HTTP existant. Aucune de ces actions de déploiement/HTTP n'est exécutée ou autorisée par ce document.
