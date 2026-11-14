# Clara OS × Make — raccordement du scénario Drive

**Date :** 14 novembre 2026  
**Branche :** fix/builder-make-api-onboarding-20261114  
**État :** candidat isolé testé, non déployé, sans connexion fournisseur créée.

## Contrat réel retrouvé
Le scénario Make #7295042 (« CLARA – Find Drive Document ») est on-demand, pas un webhook. Il exige workspaceId et query ; missionId est facultatif. Sa chaîne actuelle comporte StartSubscenario, Google Drive searchForFilesFolders et ReturnData. Le scénario est actif et son accès Drive est valide. Vérifié en lecture seule dans Make.

## Correctifs
- native-drive-read-payload.ts : le workspaceId provient exclusivement du contexte authentifié Clara ; seul query vient de la demande.
- native-api-onboarding.ts : vérifie par trois GET le scénario, son interface et son blueprint live, puis refuse toute version ne contenant pas exclusivement les modules READ approuvés. Aucun scénario n'est lancé pendant la vérification.
- API native de connexion Make : session Clara, owner/admin autorisé pour le client et le projet, confirmation explicite, chiffrement serveur puis enregistrement atomique dans Clara OS. Pas de remplacement silencieux d'une connexion existante, pas de grant automatique.
- Panneau Connecter Make à Clara dans Connexions, en cinq langues, champ jeton masqué. Aucun secret n'est envoyé dans le chat.
- Runtime Make READ : revérifie le blueprint live avant chaque appel fournisseur ; refuse si le scénario a changé.
- Script make-drive-catalog-registration-20261114.sql : prépare l'unique entrée fournisseur make.drive.find dans le registre partagé, sans accorder de permissions client. Non exécuté en Production.

## Résultats vérifiés
CI GitHub Actions : https://github.com/gildaspro5613-code/clara-os/actions/runs/43633750444
Tests isolés PASS ; TypeScript PASS ; build Next.js PASS. Les appels fournisseur des tests sont simulés. Aucune exécution Make réelle ni déploiement Production.

## Réception unique après GO de livraison
1. Préflight et sauvegarde, fusion et déploiement contrôlés.
2. Saisir le jeton Make dans le formulaire Clara OS uniquement (permissions Make API requises : scenarios:read, scenarios:write, scenarios:run). Le scénario Drive est confirmé sans l'exécuter.
3. Appliquer une seule fois l'entrée du catalogue READ après review.
4. Confirmer l'autorisation READ dans Clara OS, demander une recherche Drive avec Make, contrôler le résultat et l'audit.
5. Révoquer et vérifier le refus après révocation. N'indiquer « certifié » qu'avec preuve E2E.

Pas de nouvelle Recette, pas de Preview Vercel, pas de modification Clara Live ni de commande matérielle.