# Livraison V1 intégrée Clara OS — conservation et réception isolée

PR Draft à créer uniquement après attestation d'absence de déploiement automatique pour la nouvelle branche. Aucune PR créée dans cette mission à ce stade.

Le candidat rassemble les travaux existants et leurs dépendances dans une branche unique, sans réécrire les branches sources. La provenance exacte et les résolutions de conflits sont documentées dans ce dossier. Le périmètre reste gelé ; aucune activation fournisseur, aucun merge et aucun déploiement.

Validation : 250 tests et 4 recettes navigateur PASS, builds OS/Live, TypeScript OS et lint ciblé ; voir validation.md pour les niveaux de preuve et les deux échecs initiaux de synchronisation de la recette, corrigés sans désactiver de contrôle. Les migrations OS, y compris les deux fichiers 028 distincts, sont testées ensemble sur PostgreSQL jetable avec restauration locale. Fournisseurs réels non appelés ; les acquis historiques confirmés par le propriétaire restent distingués des preuves du candidat.

Production NO-GO : attestation des futurs bindings/rôles/restauration, ouverture de recette sous autorisation distincte et réception utilisateur requises. HTTP 503 historiques, lint global et alertes de développement conservés.

Base proposée : consolidation/clara-os-clean-base.
Branche : delivery/clara-os-v1-20261025.
