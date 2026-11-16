# Revue du correctif 5bd5687e — 31 octobre 2026

SHA local et distant vérifiés : `5bd5687ea2e20ab37dd78d17454782590ba7b475`.
La branche de livraison reste `faee20ce8fda8f9170dde6ea0f414a3eee42eb65`.
Aucun commit, push, merge, workflow de déploiement ou modification distante pendant cette revue.

## CI : NON ATTESTÉ

Lectures `gh pr list` (GraphQL) et `gh api repos/gildaspro5613-code/clara-os/commits/5bd5687ea2e20ab37dd78d17454782590ba7b475/check-runs` : `Forbidden`. Cela ne démontre ni succès, ni échec, ni absence de CI. Aucun contournement ni relance.

## Réserve reproduite : révocation entre contrôle et persistance

`src/lib/native/cognitive-scope.ts:58` relit le registre avec une requête SQL autonome. `src/lib/native/scoped-context.ts:88` attend ce contrôle, puis la ligne 92 engage une autre requête `finish`. Le SQL existant vérifie le contexte principal, mais pas l'empreinte des missions secondaires lues par le nouveau raccordement. Ces deux opérations ne partagent pas une transaction.

Reproduction ciblée sur PostgreSQL 17 jetable, avec le véritable POST chat, Brain, store et primitives SQL : après le contrôle final, révoquer l'autorité de la seconde mission avant de laisser exécuter la vraie requête `finish`. Le fournisseur de texte reste simulé et restitue uniquement les données reçues ; aucune lecture native ou décision SQL n'est simulée.

Résultat réel :

```json
{"status":200,"secondaryMissionRevoked":"1","newMessageIncludesRevokedTitle":true}
```

Il s'agit du **nouveau message**, pas d'une occurrence dans l'ancien historique. Le test attend un refus 409 et échoue : `200 !== 409`. Les traces et le harness sont conservés dans `review-race-validation.txt` et `review-race.ts.txt` ; le fichier temporaire du test a été retiré de src/tests après exécution. Les 45 tests positifs précédents restent des preuves de leurs scénarios, mais ne couvrent pas cette interposition précise.

Limite : le contenu était autorisé à la lecture précédente ; ce test ne démontre ni une fuite interpropriétaires ni une panne Production observée. Il démontre que la garantie annoncée de refus d'une révocation avant persistance n'est pas atomique. Une relecture supplémentaire en JavaScript ne supprimerait pas cette fenêtre. La réserve n'impose aucune suppression des échanges historiques déjà autorisés.

## Correction minimale à autoriser

Lier la validation des missions lues à la transaction SQL existante de finalisation du reçu/chat, avec les contrôles de version/révocation et le verrouillage cohérent nécessaires ; tester cette interposition ainsi que les rejeux. Réutiliser le registre et les reçus, sans modifier les ACL ni l'interface et sans ajouter de moteur. Cette adaptation SQL doit être préparée et qualifiée séparément ; aucune migration distante n'est autorisée par ce compte rendu. Aucun correctif supplémentaire implémenté pendant la revue.

## Décision

**NO-GO pour recommander le merge/déploiement de 5bd5687e en l'état.** Deux éléments restent ouverts : cette fenêtre reproduite et les CI distantes non consultables. Aucune Production modifiée. La revue ne constitue pas une autorisation de migration ou de déploiement.

Cette revue est conservée comme preuve historique. Le correctif et les résultats de résolution figurent dans [finalization.md](finalization.md).
