# Proposition de Preview volontaire — non exécutée

Aucune configuration Vercel changée. Aucun POST Vercel, upload, déploiement, merge, migration ou changement de secret.

## Destination à réutiliser, sous attestation

- Projet indépendant connu : `clara-os-recette`, `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`.
- Custom Environment déjà prévu par le garde : `clara-os-recette`, ID `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM`.
- Neon autorisé par le garde : `br-crimson-feather-b2zr00sf`, `neondb`, rôle `clara_os_recette_limited`.
- Code applicatif préparé : `8bdc396ecafc98f76eb910ad8f5fa7919343a15a`; le HEAD documentaire de publication est communiqué séparément.

Ces références existent dans le code et les dossiers antérieurs. **Leur binding effectif actuel n’est pas attesté ici.** Une Preview ordinaire avec `VERCEL_TARGET_ENV=preview` serait refusée par le garde; ne pas élargir sa liste de destinations pour obtenir un écran vert. Utiliser le custom Environment isolé prévu, avec une URL de réception hors domaine Production.

## Adaptation minimale proposée du mécanisme existant

Réutiliser `.github/workflows/clara-os-independent-recette.yml` et son jeton d’Environment dédié, sans connexion Git nouvelle, sans changement global « Only build production » et sans déploiement automatique. Cette adaptation n’a pas été codée/activée dans ce lot, car les prérequis distants ne sont pas attestés.

1. Épingler le SHA UI approuvé et vérifier le checkout réel ainsi que le contenu. Conserver les vérifications strictes équipe/projet/custom Environment, le secret dédié, `workflow_dispatch`, approbation d’Environment et `verify_only=true`.
2. Adapter le contrôle de provenance ancien : il attend actuellement le SHA historique `6cfed8f…` et une différence limitée aux crons avec un autre ancien SHA. Ne pas contourner son refus en substituant silencieusement un nouveau SHA.
3. Pour la Preview uniquement, produire un artefact contrôlé du SHA approuvé dont **seules les deux déclarations cron** sont retirées de la copie de `vercel.json`. Vérifier toutes les autres propriétés et tous les fichiers applicatifs identiques, consigner la transformation dans le manifeste. Ne pas supprimer les crons du code promu en Production.
4. Garder les écritures REST désactivées jusqu’au résultat du précontrôle et au GO de l’opération exacte. Si autorisé ensuite : uploads `/v2/files`, puis une seule création `/v13/deployments` ciblant le custom Environment, sans retry après résultat incertain. Aucun domaine Production, migration ou activation fournisseur.

La compatibilité effective du jeton et les contraintes de build ne sont pas déduites des tests UI. Reprendre les preuves du mécanisme existant; ne pas demander un jeton plus large par défaut.

## Preuves indispensables avant cette opération

- Lecture des métadonnées actuelles du seul projet indépendant et de son environnement : IDs, rattachement, restrictions d’accès à la Preview et absence de promotion/alias Production.
- Comparaison des bindings effectifs dans un contexte autorisé, sans sortie des valeurs : garde `src/lib/recette/database-binding.ts`, puis contrôle opérateur `src/scripts/attest-recette-runtime.mts` / `src/lib/recette/runtime-attestation.ts` selon le déploiement et son SHA réellement inspectés. Un contrôle attendant le nouveau SHA ne peut pas attester un ancien déploiement.
- Ressource Neon, rôle et permissions réellement utilisés; pas de `POSTGRES_URL`, aucune connexion Production. Réutiliser les métadonnées et preuves SQL disponibles; aucune migration ou nouvelle base proposée.
- Vérifier que `CLARA_AUTH_APP_ORIGIN` et les retours OAuth correspondent à l’URL/alias indépendant de réception et au SHA réellement testé, jamais au domaine Production. Ne pas les modifier automatiquement pour faire passer la recette.
- Authentification de réception existante et autorisée; aucune session administrateur fictive, aucun jeton dans URL, logs ou conversation. Ne copier aucun secret Production.
- Aucun cron/webhook actif de recette ni effet fournisseur non autorisé. Les gardes actuels restent fermés. Les essais utilisent des données fictives persistées uniquement dans la recette isolée, jamais des fixtures présentées comme une certification fournisseur.

## Dialogue et fournisseurs

Le garde Recette actuel bloque aussi OpenAI et les routes vocales. Il n’est pas assoupli. Une réception visuelle peut montrer le refus réel, mais ne peut pas certifier un dialogue naturel fournisseur en prétendant que le mock local est un service distant. Une éventuelle autorisation de génération réelle limitée doit être décidée séparément, sans autoriser mail, appels, Drive/Agenda en écriture, Make/Brevo ou matériel.

## Contrôle après une éventuelle autorisation

Vérifier ID, SHA, projet, custom Environment et bindings effectifs du nouveau déploiement; conserver les résultats sans secrets. Rejouer les parcours propriétaire sur l’URL réellement créée : navigation, fil général et métier, reprise, missions, documents autorisés, états des boîtes et refus fournisseurs, Journal, FR/EN/ES/DE/IT et trois formats. Seul ce résultat permettra de qualifier la Preview. En cas d’incertitude, arrêt sans nouvelle création ni bascule de domaine.
