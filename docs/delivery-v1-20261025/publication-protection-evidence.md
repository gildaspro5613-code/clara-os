# Couverture historique des protections de publication — 25 octobre 2026

## Conclusion corrigée

La seule absence des nouvelles branches `delivery/*` dans `git.deploymentEnabled` ne démontre pas leur absence de protection. Le rapport de livraison précédent avait omis les validations globales déjà présentes. Aucun réglage Vercel/GitHub n'est modifié et aucune nouvelle configuration n'est demandée.

Le propriétaire a confirmé la règle globale **Only build production** pour `clara-os`, `clara-live` et `clara-live-api`. Cette règle porte sur l'environnement, pas sur une liste de branches : les branches candidates non Production sont couvertes comme les autres Preview ordinaires. Les exclusions explicites des anciennes branches sont une protection complémentaire.

| Projet / mécanisme | Preuve retrouvée | Portée sur delivery/* |
|---|---|---|
| OS, Live, Live API : Only build production | OS `docs/canonical-registry-vercel-gate.md`, section Autorisation du 11 octobre ; `docs/canonical-registry-publication.md` ; Live `docs/canonical-foundations-implementation.md`, mise à jour autorisation et publication | Règle globale, indépendante du nom delivery. Les publications OS 4eea1fa / Live f0f62de ont observé Canceled by Ignored Build Step |
| OS principal : branche Production et custom Environment | Attestation propriétaire lors de la publication #202 : Production Branch consolidation/clara-os-clean-base, Preview Branch Tracking désactivé, aucun rattachement de la branche documentaire au custom Environment ; règle ignore Production ou target clara-os-recette seulement | delivery/clara-os-v1-20261025 n'est pas cette branche Production. La configuration historique de l'environnement de recette indiquait Branch Tracking désactivé ; aucun changement contradictoire retrouvé |
| Projet indépendant clara-os-recette | `docs/recette/pr-198-deployment-mechanism-correction.md`, run authentifié 39423168908 : HTTP 200, équipe/projet exacts puis RECETTE_GITHUB_LINK_ABSENT | Dernier état attesté : projet sans lien GitHub, donc aucun déploiement Git depuis delivery. Aucune connexion ultérieure retrouvée ou exécutée |
| Actions OS Recette | `.github/workflows/clara-os-independent-recette.yml` : workflow_dispatch seulement, verify_only=true, REST_WRITES_DISABLED ; `.github/workflows/clara-os-recette-177.yml` manuel | Push/PR ne lance pas le transport de déploiement. Aucun workflow manuel lancé ici |
| Autres Actions OS/Live | YAML des candidats et des branches par défaut main examiné ; pas de workflow_run/repository_dispatch de déploiement ; validations automatiques tests/builds isolés | Pas de déploiement Vercel par les workflows concernés. Le cleanup Neon fermé est limité à la fermeture de PR ciblant clara-os-commercial-finish, hors des deux bases retenues |
| Gardes par branche reçues | Les vercel.json OS et Live/root/frontend/backend préservent toutes leurs exclusions existantes ; anti-preview.json des réceptions Stage/global-functional/global-tools | Couverture limitée aux noms enregistrés ; ces exclusions ne sont pas revendiquées comme wildcard delivery/* |

## Niveau de preuve et limite

Ce sont des attestations historiques du propriétaire, des configurations versionnées et des observations documentées, pas une nouvelle consultation des paramètres Vercel. Les valeurs actuelles Vercel ne sont pas accessibles depuis cette instance. Aucun changement de ces protections n'a été démontré ; l'absence d'accès ne les invalide pas. Le propriétaire demande expressément de réutiliser ces validations, sans recommencer leur configuration.

Une entrée technique ou un statut « Canceled by Ignored Build Step » est distingué d'un build exécuté ou d'une application déployée. Les précédentes publications ont été autorisées et reçues sur cette base. Aucune nouvelle exigence de suppression de toute métadonnée Vercel n'est ajoutée à ce chantier.

Les branches delivery sont nouvelles, les bases sont les branches canoniques existantes, aucune branche Production n'est modifiée et aucun réglage/liaison n'est écrit. Le GO conditionnel de publication est réutilisé sur ces preuves. Après chaque push/PR, contrôler les statuts/checks/déploiements GitHub accessibles ; en cas de build ou déploiement exécuté contradictoire, arrêter et signaler, sans second déploiement ni changement de configuration. L'absence d'une entrée GitHub ne sera pas présentée comme une inspection exhaustive des logs internes Vercel.

**Décision : couverture historique des Preview ordinaires rétablie ; publication GitHub seule autorisée sur cette base, sans déploiement volontaire. Aucune attestation runtime Vercel/Neon ni autorisation de mise en service n'en découle. Production NO-GO.**
