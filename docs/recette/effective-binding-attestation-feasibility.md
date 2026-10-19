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


## Décision suite à la réponse de l'assistance Vercel (19/10/2026)

Vercel confirme qu'aucun `vercel env run` ou script GitHub exécuté hors déploiement ne peut certifier les secrets *effectivement injectés* dans un déploiement existant. La piste « workflow GitHub lisant les secrets du déploiement » est **abandonnée**.

### Architecture retenue pour une implémentation ultérieure, à valider

- **Attestation dans le runtime Recette** : une fonction serveur interne lit `process.env.DATABASE_URL` réellement utilisé par **son propre déploiement**. Elle ne retourne jamais l'URL, le mot de passe, des empreintes, ni les exceptions.
- **Preuve de connexion** : une transaction PostgreSQL `READ ONLY` interroge `current_database()`, `current_user` et les privilèges du rôle ; la connexion doit utiliser le rôle limité `clara_os_recette_limited` et `neondb`.
- **Preuve de branche** : le seul rôle/base ne prouve pas la branche. Le serveur valide l'hôte effectif de `DATABASE_URL` contre l'endpoint attendu ; une confirmation indépendante de la correspondance endpoint → branche Neon est requise via métadonnées de contrôle **hors application**, sans injecter `NEON_API_KEY` ni `VERCEL_TOKEN` dans le runtime. Si cette confirmation manque, verdict `NON ATTESTÉ`, jamais `PASS`.
- **Autorisation** : aucune route publique ni endpoint de diagnostic anonyme. Identifier d'abord un chemin interne existant avec contrôle d'identité administrateur réel, non fondé sur un simple drapeau d'environnement ou un header partagé. Une fonction serveur non exposée peut être préparée, mais ne doit pas être déclarée invocable avant revue de ce chemin d'authentification.
- **Provenance** : l'attestation ne concerne que le **nouveau déploiement contenant la fonction**, identifié par son deployment ID et SHA. Elle ne certifie rétroactivement aucun ancien déploiement.
- **Résultats** : statuts `PASS` / `FAIL` / `NON ATTESTÉ` et labels autorisés seulement ; logs sans données de connexion ; aucune écriture SQL ni effet fournisseur.

### Séquence de livraison

1. Revue du système d'authentification/autorisation de la branche cible et choix du point d'invocation interne sécurisé.
2. PR de code avec fonction serveur, tests de refus (anonyme, non-admin, mauvais environnement, hôte/branche divergents, erreurs SQL), et vérification des garde-fous.
3. Revue humaine des CI et **autorisation distincte** pour un déploiement uniquement dans le projet Vercel `clara-os-recette`.
4. Attestation du nouveau déploiement ; ensuite seulement campagne HTTP autorisée.

**État actuel : préparation uniquement ; pas de fonction runtime câblée, pas de déploiement, NO-GO.**
