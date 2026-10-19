# Recette — faisabilité de l'attestation des bindings effectifs Vercel

## Portée

Cette PR est **préparatoire uniquement**. Aucun workflow d'attestation ne doit être exécuté tant que la provenance des valeurs effectives du déploiement n'est pas prouvée. Aucun déploiement, aucune copie de secret, aucune modification Neon ni Production.

## Constat vérifié

- Le script existant `src/scripts/attest-recette-runtime.mts` exige `DATABASE_URL`, les trois autres bindings Recette, l'identité du déploiement, un jeton Vercel et une clé API Neon.
- Le connecteur Vercel confirme l'existence des quatre variables sur le custom Environment `clara-os-recette`, mais ne révèle pas leurs valeurs sensibles.
- GitHub Actions ne reçoit pas automatiquement les valeurs effectives du runtime Vercel. Un secret GitHub homonyme, `vercel env pull` ou des valeurs attendues saisies manuellement ne constituent **pas** une preuve de provenance du runtime.
- La vérification SQL effectuée directement sur Neon confirme que le rôle `clara_os_recette_limited` est non-administrateur sur la branche isolée, mais ne prouve pas que le déploiement Vercel l'utilise.

## Condition préalable avant d'écrire un workflow exécutable

Identifier, avec l'administrateur, un canal **déjà autorisé et attestable** permettant de fournir au processus opérateur les bindings *effectifs* du déploiement examiné, y compris les éventuels overrides, sans afficher, exporter en artefact ou recopier des secrets. Vérifier séparément que les métadonnées Vercel incluent une preuve d'identité du custom Environment, du deployment ID et du SHA réel. Une simple présence de noms de variables ou une correspondance de slug n'est pas suffisante.

Si le canal n'existe pas : **STOP — NON ATTESTÉ**. Ne pas créer de workflow qui substitue des secrets GitHub aux bindings Vercel, ne pas ajouter de route HTTP publique, ne pas injecter de jetons de contrôle dans l'application et ne pas déclencher de déploiement diagnostique.

## Critères d'acceptation pour une éventuelle PR d'implémentation distincte

1. Provenance des valeurs effectives démontrée et documentée sans révélation des valeurs.
2. Exécution manuelle, autorisation de l'environnement `clara-os-recette`, source et déploiement épinglés aux SHA réellement approuvés.
3. Script existant réutilisé sans affaiblir ses vérifications ni substituer des valeurs de configuration.
4. Sortie strictement expurgée : quatre labels de contrôle, `PASS` / `FAIL` / `NON ATTESTÉ`, `writesRequested:false`.
5. Aucune écriture Neon, aucune mutation Vercel, aucune modification de secret, aucun déploiement, aucune action Production/Clara Live.

## Décision actuelle

**NON ATTESTÉ**. Ce document n'autorise ni l'exécution ni le déploiement. La PR Draft vise à conserver un point de décision vérifiable et à empêcher une fausse attestation.
