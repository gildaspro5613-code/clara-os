# Clara OS — Procédure de recette isolée (préparation uniquement)

**NE PAS EXÉCUTER sans GO distinct.** PR #176 Draft. NO-GO Production. Ne pas toucher Clara Live.

## Cible
- Projet Neon : `fragrant-dream-31652403`
- Branche **exclusive** : `br-autumn-heart-b2ei69zx`
- Endpoint connu : `ep-young-cake-b2ekuozh`
- Base : `neondb`
- Aucun IMAP/SMTP, aucune clé réelle, aucun déploiement ni merge.

## Préparation Codespaces (pas d'exécution de recette)
1. Ouvrir un Codespace Clara OS, et y placer **les deux fichiers** `clara_os_lecture7_recette_preexecution.sql` et `clara_os_codespaces_recette176.sh`.
2. Vérifier dans la console Neon que l'endpoint appartient bien à **la branche isolée**. La vérification d'hôte du lanceur est une défense supplémentaire, **pas une preuve de branche**.
3. Récupérer dans la console Neon l'URL de connexion **directe** (non poolée) à cet endpoint. Ne jamais publier l'URL ni son mot de passe. Configurer `NEON_TEST_URL` comme secret Codespaces ; elle doit porter `sslmode=require` ou `sslmode=verify-full`. Vérifier que l'hôte correspond exactement à celui attendu dans le lanceur ; adapter uniquement après vérification dans Neon.
4. Vérifier la présence de `psql`, `python3`, `bash`.
5. Avant exécution, vérifier que les compteurs d'autorités, délégations, messages et curseurs sont tous à zéro. S'ils ne le sont pas, **STOP** et nouvelle revue du protocole.

## Commande réservée à un GO ultérieur
```bash
export RECIPE_SQL="$PWD/clara_os_lecture7_recette_preexecution.sql"
export CONFIRM_ISOLATED_BRANCH='br-autumn-heart-b2ei69zx'
bash ./clara_os_codespaces_recette176.sh
```
Ne pas utiliser `set -x` ; ne jamais afficher `NEON_TEST_URL`.

## Gestion d'échec
- `ON_ERROR_STOP` ferme la session `psql` au premier échec. PostgreSQL annule la transaction non validée.
- **Ne pas relancer automatiquement.** Ouvrir une nouvelle connexion et exécuter les vérifications indépendantes du lanceur (partie après `Session recette fermée`).
- Si la connexion ou le contrôle post-recette échoue, le résultat reste **non certifié**. Ne pas prétendre à un nettoyage vérifié.
- La recette ne teste ni concurrence réelle ni identité du rôle restreint ni fournisseur IONOS.

## Limites
- Le lanceur effectue des contrôles statiques simples ; il ne remplace pas une revue complète du SQL.
- Le script SQL de lecture 7 est celui à auditer et figer avant lancement ; aucun test de ce script n'a encore été exécuté sur Neon.
