# OS — préparation technique V1 compatible

Base Production vérifiée par Vercel et GitHub : `9e64e8eb4f265d022736a153cf9000ef10ac2bfe`, branche delivery/clara-os-v1-20261025 (#273). Live Production vérifiée `ed5ad1f6a2445542c654442e79f6fb9921a869a1` (#338). Worktrees isolés, branche fix/production-context-v1 dans chaque dépôt ; aucune modification des branches amont.

[Audit initial et matrice Live → OS → Brain → OpenAI → Live](audit.md), [contrat métier V1 compatible](contract.md), [payload synthétique bilatéral](synthetic-event.json).

## Correctifs OS

- `src/lib/brain/response-composer.ts` : utiliser les données structurées de la source Live déjà chargée par le Brain, sans recouper son résumé à mi-enregistrement. Budget de sources 12 000 caractères conservé ; si hors budget, échec explicite source_context_budget avant composition, sans nouvel appel ni retry. Les marqueurs de couverture/troncature sont transmis, y compris les bornes préexistantes de la demande (1 500 caractères) et de la synthèse Brain (1 600).
- Même compositeur, modèle configuré, maxTokens=5200, reasoningEffort=low et nombre d'appels inchangés. Prompt : cinq lots opérationnels, liens entre sources/contraintes/actions/dépendances/validation ; planning conditionnel sans horaires inventés ; statut/provenance de chaque lot et dossier partiel quand nécessaire.
- `src/lib/brain/live-production-proposal-guard.ts` : trois champs facultatifs responsible/date/time, déjà présents dans ProductionRow Live, avec validation compatible ; anciennes réponses V1 valides inchangées. Refus des identités/status/depends_on ajoutés par le modèle. Aucun nouveau protocole d'autorité.
- `src/lib/external-capabilities/external-event-handler.ts` : refuser un businessContext déclarant un autre projet ou une autre préparation avant cognition. OWNER/expiration/révocation/scope, protections de génération incomplète et persistance des jobs inchangés.
- `src/tests/production-p0.test.ts` : assertions bilatérales sur le véritable payload sérialisé par Live, langue, présence des sources, appel de composition borné et refus surdimensionné/étranger, dates impossibles et horaires invalides.
- `vercel.json` : unique entrée false AntiPreview pour la branche. Aucun cron, secret, fournisseur, modèle, budget de sortie ou infrastructure changé.

## Tests réellement exécutés

- [51 tests Node 22 ciblés](os-targeted.log), zéro échec/ignoré : Production P0, PostgreSQL réel local, jobs, contrats, documents et continuité commerciale. Adaptateurs de stockage des tests existants sur conteneur PostgreSQL 17 éphémère ; cognition/providers simulés. Aucune connexion Neon. L'exécution Node 24 locale rapportait seulement un test de fichier : elle n'est pas présentée comme preuve des cas ; Node 22 du workflow a réellement exécuté les 51 cas de test.
- TypeScript `tsc --noEmit --pretty false` : PASS (log vide = aucune erreur).
- [Build local](local-build.log) : BLOCKED par accès fonts.googleapis.com pour Geist/Geist Mono. Pas de changement de polices ou contournement réseau ; résultat du build GitHub à consigner dans la PR séparément.
- Le même synthetic-event.json (SHA-256 43949bd8abfce00fce17cd57bbd439b0d40f8300081c6173cad3513919c22260) est lu dans les deux dépôts. Tests : source Live → reader Brain → raisonnement existant simulé → compositeur, statut et provenance préservés dans les prompts. Ce n'est pas une preuve de qualité d'une réponse fournisseur réelle.
- Live : 58 tests Python, 68 tests UI, build frontend et recette navigateur ciblée. Langue fr malgré profil it, approbation locale, sauvegarde explicite et réouverture des champs responsables/horaires. Rapport détaillé et captures dans le dossier correspondant de la PR Live.

Aucun test existant désactivé. Les anciens contrats, refus, générations interrompues, sessions et reprise restent testés. SHA/CI finaux et éventuels échecs comparés à la base seront relevés dans les PR ; ne pas masquer une régression globale avec ces tests ciblés.

## Limites et décision

Le contrat enrichi reste une proposition à relire : aucun statut confirmé importé, aucune réservation, aucune exécution ni écriture Live automatique. Pas de liens de dépendance canoniques générés ; ils restent décrits pour décision humaine. Live doit être compatible avant l'émission OS des champs facultatifs lors d'une éventuelle livraison future.

Aucun accès fournisseur prêt n'est disponible dans cet environnement et aucun appel OpenAI réel n'est effectué. La pertinence métier, le français effectivement généré par OpenAI et le dossier Origins réel restent NON ATTESTÉS. Le cycle documentaire incomplet et les omissions ne sont pas transformés en faits inexistants ou en certification de dossier complet. Un contexte trop volumineux peut encore être refusé, explicitement.

GO technique isolé seulement sous non-régression/CI pertinente verte ; **NO-GO réception métier réelle, merge et Production**. Aucun changement Origins, Neon, Brain, autorités Stage, commande matérielle, show, Preview, Ready ou déploiement. Pas de demande de test utilisateur à ce stade.
