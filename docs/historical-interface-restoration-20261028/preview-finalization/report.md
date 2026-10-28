# PR #219 — préparation du workflow de réception, 28 octobre 2026

## Résultat

**NO-GO déploiement dans le contexte actuel : bindings effectifs NON ATTESTÉS.** Aucune URL nouvelle, aucun upload, aucun POST Vercel, aucune migration ni activation fournisseur. Ce résultat ne signifie pas que les protections ou ressources distantes sont absentes.

La branche distante a été récupérée et vérifiée à `e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8`, parent `652a332852a0302de3d79d95347447dcc21074bf`, arbre `e3fd0ebe186b4a5a93121a6ee653bd354549aef5`. La PR #219 et ses quatre contrôles verts sont déclarés par le propriétaire; leur état n'a pas été réinspecté via l'API GitHub dans ce contexte.

## Adaptation ciblée

Le workflow existant `clara-os-independent-recette.yml` épingle désormais ce SHA applicatif. Le checkout vérifie dépôt, SHA, parent et arbre exact. Le contrôleur REST conserve les mêmes identités équipe/projet/custom Environment et le seul secret `VERCEL_RECETTE_TOKEN` dans l'Environment GitHub `clara-os-recette`. Il refuse toujours un projet relié à Git et conserve les refus 401/403 et l'absence de retry des écritures incertaines.

La copie destinée aux uploads retire uniquement `crons` de `vercel.json`, après vérification des deux déclarations exactes du SHA approuvé. Tous les chemins source sont conservés et tous les autres fichiers sont identiques octet pour octet. Les autres propriétés JSON sont identiques; seule la sérialisation de ce fichier peut différer. Le `vercel.json` suivi et ses crons Production restent inchangés. Le test compare réellement tous les fichiers au commit approuvé.

**Les trois verrous sont maintenus :** refus de `verify_only=false`, étape de déploiement `if: false`, contrôleur `writesAuthorized:false`. Une demande de déploiement ne produit donc pas d'upload. `verify_only=true` reste le défaut. La réussite des lectures de métadonnées projet/environnement est désormais explicitement distinguée d'une attestation du binding PostgreSQL.

Le workflow CI de sécurité existant prend en charge les chemins concernés et exécute les tests du transport hors ligne. Aucun nouveau workflow ou changement applicatif.

## Vérifications exécutées

- `node --test .github/scripts/recette-deployment-api.test.mjs` : 24 PASS, zéro échec/ignoré, transports simulés; vérification des fichiers Git réels.
- `node --import tsx --test src/tests/recette-runtime-attestation.test.ts src/tests/recette-external-execution-guard.test.ts src/tests/recette-network-provider-denials.test.ts` : 26 PASS, zéro échec/ignoré. Métadonnées et SQL simulés, aucune attestation fournisseur.
- Script existant `node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8` dans le contexte disponible : `{"status":"NON ATTESTÉ","checks":[],"writesRequested":false}`; code de sortie 1 attendu, aucun binding utilisable ni lecture SQL engagée.
- `git diff --check` : PASS. Aucun changement sous `src`, `db`, `public`, ni dépendances, ni `vercel.json`. Build/interface non rejoués : code applicatif inchangé.

## Obstacle précis et prochaine opération

Le runtime Cloud observé est connecté, mais sa politique réseau appliquée ne permet ni `api.github.com` ni `api.vercel.com` ni l'API Neon; il ne fournit aucune identité Vercel/Neon ou binding effectif. Le Git HTTPS fonctionne. Les secrets de l'Environment GitHub, même présents, ne sont pas des variables du runtime Cloud. Ne pas demander leur copie dans une conversation et ne pas modifier les credentials.

La levée du blocage exige **une attestation depuis un contexte autorisé ayant accès aux bindings effectifs du custom Environment existant**, et non une nouvelle infrastructure :

1. Projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, équipe `team_0BeqOAO8t5oDEBdzHHdekcxv`, custom Environment `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM`, slug `clara-os-recette`.
2. Réutiliser `validateRecetteDatabaseBinding` puis le contrôle opérateur `attest-recette-runtime.mts` dans un contexte de confiance disposant des valeurs effectives. Il vérifie branche `br-crimson-feather-b2zr00sf`, base `neondb`, rôle `clara_os_recette_limited`, absence de `POSTGRES_URL` et de privilèges administratifs, métadonnées Neon et source du déploiement. Le script attend un déploiement existant : pour une vérification antérieure à publication, utiliser le SHA réellement déployé, sans inventer de `VERCEL_DEPLOYMENT_ID` ou lui attribuer déjà le nouveau SHA. Une attestation de l'ancien déploiement ne prouve pas à elle seule les bindings de la prochaine création.
3. Vérifier aussi l'origine d'authentification et les retours autorisés vers la réception, l'absence d'alias Production, les protections d'accès, et les gardes fournisseurs inchangés. Aucun secret dans les preuves retournées.
4. Dans GitHub Actions, le workflow existant peut être lancé uniquement avec cette branche et `verify_only=true` depuis un accès autorisé. Il vérifie les métadonnées équipe/projet/environnement; **il ne récupère pas les variables Vercel effectives et ne certifie pas Neon**. Aucune exécution Actions n'a été lancée depuis ce runtime.
5. Après toutes ces preuves seulement, activer de façon revue l'opération exacte : uploads de l'artefact contrôlé puis une seule création `/v13/deployments`, vers le custom Environment indépendant. Le GO conditionnel du propriétaire n'est pas satisfait actuellement; aucune activation n'a été faite. Vérifier ensuite ID, URL, état READY, SHA `e1d89bb…`, custom Environment et bindings effectifs du nouveau déploiement avant réception.

## Capacités attendues, non reçues sur une nouvelle URL

La réception visuelle concerne les 13 pages restaurées, les GlassPanels, la navigation et FR/EN/ES/DE/IT. Les preuves navigateur antérieures sont conservées, mais aucune recette distante nouvelle n'est annoncée. Google/IONOS, génération réelle et voix restent soumis aux gardes et autorisations; aucune certification fournisseur n'est déduite des simulations.
