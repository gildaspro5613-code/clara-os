# PR #198 — correction ciblée du mécanisme de déploiement

## Cause démontrée et limites

Le propriétaire a relevé dans le run [39371947718](https://github.com/gildaspro5613-code/clara-os/actions/runs/39371947718) : `Not able to load user because of unexpected error: User not found. (404)`. Les vérifications strictes du projet/équipe avaient réussi. Le propriétaire confirme qu'aucun déploiement du source approuvé n'a été créé.

La CLI passait `--scope melodie-digital`. Dans le code officiel examiné, cette option entre dans la résolution de scope qui appelle `getUser(client)` avant le déploiement ; `getUser` demande `/v2/user` sans scope équipe. Ce chemin affiche exactement le préfixe d'erreur observé. Un jeton accepté pour les métadonnées d'un projet n'est pas, à lui seul, une identité utilisateur personnelle compatible avec cette résolution. Le 404 utilisateur ne prouve ni un mauvais Project ID ni l'absence de droits de création de déploiement.

Preuves officielles, épinglées :

- [Résolution CLI du scope, appel utilisateur et message d'erreur](https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/src/index.ts#L781).
- [Appel `/v2/user` de la CLI](https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/src/util/get-user.ts#L24).
- Le paquet officiel `vercel@64.7.0` a aussi été inspecté, sans exécuter la CLI. Le workflow défaillant installait `vercel@latest` : **sa version historique exacte n'est pas attestée** par les logs disponibles ici. La chaîne d'erreur et le chemin ci-dessus concordent ; ne pas transformer cette inspection en test réel du jeton.

## Correctif préparé — aucune nouvelle exécution

Le même workflow manuel utilise désormais directement le protocole REST officiel. Aucune installation de CLI, résolution de compte utilisateur ou modification de scope du jeton. Le diagnostic ancien `/v2/user` reste uniquement dans la branche d'erreur du précontrôle ; il n'est pas une condition de succès du déploiement REST.

1. Le checkout et le contrôle SHA restent `b2a51dd59381daa1e5d3278f3d7104b986015170`. Aucun fichier applicatif modifié.
2. Vérification stricte du projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, nom `clara-os-recette`, équipe `team_0BeqOAO8t5oDEBdzHHdekcxv`, projet non lié à Git ; aucun repli.
3. Lecture des environnements du projet, correspondance unique ID `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM` et slug `clara-os-recette`, **avant tout POST**.
4. Lecture des fichiers depuis les objets Git du SHA approuvé, jamais depuis les fichiers locaux de configuration/secrets. Fichiers non suivis exclus, liens symboliques/sous-modules/chemins sensibles refusés. Seule transformation : suppression des deux crons existants dans l'artefact, comme auparavant. La copie de travail et les données runtime ne sont pas téléversées.
5. Upload des contenus via `POST /v2/files?teamId=…`, puis **un seul** `POST /v13/deployments?teamId=…` avec `project` fixé et `customEnvironmentSlugOrId` fixé à l'ID ci-dessus. Aucun `target=production`, projet créé, `gitSource`, `projectSettings`, `env` ou secret recopié dans le corps.
6. Contrôle du projet, propriétaire équipe, environnement, URL et SHA de provenance renvoyés ; état `READY` publié seulement après vérification. Une création connue mais non encore vérifiée est signalée comme telle, sans faux succès.
7. Lecture du statut de ce seul déploiement. Aucun nouvel essai automatique de POST, aucun renvoi après timeout, acquittement perdu, réponse ambiguë ou échec du build. Les réexécutions GitHub du même run sont refusées avant upload ; une nouvelle tentative exige analyse de l'état précédent et nouvelle autorisation.

`verify_only` reste vrai par défaut. Le bloc REST et son Node.js contrôleur sont conditionnés à `verify_only == false`. Secret exclusivement `VERCEL_RECETTE_TOKEN` dans l'Environment GitHub `clara-os-recette`, sans repli générique. Le jeton n'est jamais imprimé. Les erreurs REST utilisent des codes fixes et le statut HTTP, sans corps fournisseur, contenu de fichier, en-têtes ou traces sensibles. L'URL/ID du déploiement sont des métadonnées publiques, distinctes des secrets.

Contrats officiels utilisés :

- [SDK officiel : création, endpoint `/v13/deployments`, authentification Bearer](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsCreateDeployment.ts#L98).
- [Champs de création : fichiers, projet et sélection explicite du custom Environment](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/models/createdeploymentgitsource1.ts#L484).
- [SDK officiel : upload `/v2/files`, corps binaire et digest](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsUploadFile.ts#L98).

## Permissions nécessaires — aucune extension effectuée

Le jeton actuel conserve son périmètre. Les lectures déjà réussies du projet ne prouvent pas les capacités suivantes :

| Opération | Droit fonctionnel nécessaire | État réel |
|---|---|---|
| GET projet exact | Lecture métadonnées du projet Recette | Réussie au précontrôle antérieur |
| GET custom Environments du projet | Lecture de l'environnement Recette | Non testé dans cette intervention |
| POST `/v2/files` | Upload de sources pour le futur déploiement Recette | Non testé |
| POST `/v13/deployments` avec projet/environnement fixes | Création d'un déploiement uniquement sur Recette | Non testé |
| GET déploiement créé | Lecture du statut/métadonnées de ce déploiement | Non testé |

**Limite importante : `/v2/files` est une API liée à l'équipe, sans paramètre Project ID dans le contrat officiel. Sa disponibilité avec le jeton restreint au projet n'est pas démontrable par les seuls tests hors ligne.** Si Vercel refuse cet endpoint ou exige un scope global/accès à d'autres projets pour l'autoriser : STOP, ne pas élargir le jeton, ne pas utiliser un jeton personnel ou Production. Un 401/403 identifie l'opération refusée sans déclencher de repli. Les noms de permissions ci-dessus décrivent les opérations nécessaires, pas des scopes OAuth inventés ou une capacité Vercel supposée disponible.

Aucune nouvelle permission n'est accordée ou requise automatiquement. Avant une éventuelle exécution, le propriétaire doit confirmer que les capacités d'upload/création peuvent être accordées dans le périmètre autorisé. Sinon le blocage reste administratif/contractuel ; la correction ne le masque pas.

## Tests hors ligne et périmètre

Commande depuis la branche corrective :

```sh
node --test .github/scripts/recette-deployment-api.test.mjs
```

11 tests réussis, 0 échec, 0 ignoré, sous Node.js 24. YAML et diff vérifiés. Les tests exécutent le code REST réellement intégré au workflow, avec transport simulé ; ils couvrent absence de lookup utilisateur, projet/équipe/environnement étrangers, défaut de secret, mauvais SHA, binaire et digest, absence de copie d'un `.env.local` non suivi, refus d'upload, création unique, timeout/5xx incertains, cible créée divergente et échec/reprise de lecture du build. Un clone local jetable du véritable SHA approuvé vérifie aussi le manifeste réel et la conservation des octets applicatifs, sans accès réseau fournisseur.

Aucun nouveau test métier général, TypeScript/build applicatif ou campagne PostgreSQL : aucun code applicatif modifié. Les validations métier déjà reçues restent distinctes ; ces tests ne certifient ni le jeton réel, ni Vercel/Neon, ni Google, ni un fonctionnement HTTP déployé.

Fichiers modifiés : ce document ; `.github/workflows/clara-os-independent-recette.yml` ; `.github/scripts/recette-deployment-api.test.mjs`.

**Statut : correctif proposé et testé hors ligne ; NO-GO pour relancer maintenant.** Aucun workflow lancé, aucun upload/création Vercel, aucun changement de secret/permission, aucun déploiement, merge, migration ou changement Production/Clara Live. Toute nouvelle tentative nécessite une autorisation explicite distincte. Un éventuel `READY` ultérieur resterait une validation technique, pas une réception métier ou une attestation des bindings Neon.
