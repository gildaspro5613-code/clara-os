# PR #225 — assertion Agenda après révocation

Base : 735013ac56f5c2dbfe136ac53edd9ebffc2b4a41.

Échec reproduit exactement : `cockpit-capabilities-browser.e2e.mjs:40`, attente de « Agenda momentanément indisponible. » expirée après 30 secondes. Cette ligne suit la révocation explicite de la connexion ; la simulation d'indisponibilité fournisseur précédente, ligne 34, passe et reste inchangée.

Réponse réellement reçue par le navigateur après révocation : HTTP 403, code public `REGISTRY_ACCESS_DENIED`. AgendaWidget affiche légitimement `agendaAccessDenied`, conformément à son contrat. Aucune régression applicative démontrée.

Seul le test change : il intercepte la réponse effectivement reçue au rechargement, exige 403 et le code exact, attend le message d'accès refusé et vérifie l'absence d'agenda vide et d'événement ancien. Les assertions de refus interutilisateur, scopes insuffisants, rôle de lecture insuffisant, fournisseur indisponible et zéro écriture fournisseur sont conservées.

Recette HTTPS ciblée : PASS, PostgreSQL réel jetable, Google simulé. Voir before.txt et after.txt. Aucun composant, style, moteur, ACL, workflow ou fichier de #224 modifié. Aucun merge, déploiement ou accès Production.

La lecture des runs GitHub Actions est refusée par l'API dans ce runtime (`Forbidden`). Le push sur la branche existante réévalue le workflow pull_request existant ; son résultat distant ne peut pas être déclaré SUCCESS depuis cet accès.
