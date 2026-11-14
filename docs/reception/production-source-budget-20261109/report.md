# Correctif ciblé du budget de sources Production — 9 novembre 2026

## Références et portée

OS : base `8f031fb0e8492d5b7dc963ff637fbfc315fdf5e0`, merge #274, vérifiée dans Git. Live : `20a1c3909ec7e79c18f8ac955b5b242218627af4`, merge #339, checkout détaché en lecture seule, arbre propre. Aucun fichier Live modifié. Le HEAD `main` de Live est différent ; il ne constitue pas une preuve de déploiement.

**Déploiements effectifs NON ATTESTÉS indépendamment** : les références Production ci-dessus sont celles du propriétaire. API GitHub deployments : `Forbidden` ; accès HTTP à OS : CONNECT 403 ; aucun accès administratif Vercel ni secret configuré dans cet environnement. Aucune mutation distante ni génération réelle. Ce correctif isolé ne confirme pas le contenu exact du job réel ni son empreinte PostgreSQL.

## Cause démontrée

`backend/canonical_advice_context.py` de Live borne le businessContext à environ 11 000 caractères (`MAX_COMPACT_CHARS`), puis expose couverture/omissions. Le lecteur OS `liveProjectSource` autorise un instantané plus grand (24 000 caractères de feuilles textuelles, limite JSON 32 000), sans harmoniser le plafond du compositeur.

Le compositeur reconstruit les sources à partir du projet, préparation, provenance, état de sélection, contexte métier et documents. Une analyse documentaire incomplète ou d'une autre révision doit conserver son extrait en cache. Cette enveloppe dépasse 12 000 caractères même si businessContext respecte sa propre limite. Le nombre d'octets PostgreSQL ne mesure pas la longueur UTF-16 contrôlée par JavaScript.

La fixture entièrement synthétique reproduit ce profil : **11 105 caractères de businessContext**, demande de **1 083 caractères**, 40 omissions déclarées, quatre feuilles Production/Son/Structure/Vidéo, contraintes Lumière et logistique, statuts confirmed/to_verify/missing/stale, révisions et un document incomplet. `liveProjectSource.truncated=false` : le lecteur OS n'a pas amputé cette fixture ; `businessContext.truncated=true` conserve la sélection partielle déclarée par Live.

Sur la base inchangée : **13 152 caractères de sources**, refus `source_context_budget`, **zéro appel au fournisseur** (`before.json`). Ce n'est pas la preuve d'un échec OpenAI ni une copie du dossier réel.

## Correctif minimal et sans perte

Le même constructeur d'enveloppe documentaire est extrait dans `live-production-evidence.ts`, sans changer ses règles. Seulement au-delà du plafond, une projection éphémère partage les valeurs textuelles strictement identiques et factorise les clés des listes d'objets homogènes en colonnes. Aucune synthèse cognitive, sélection supplémentaire, coupe ou lecture externe. Pas de stockage nouveau. Les identifiants projet/préparation restent explicites et inchangés.

Le prompt décrit le décodage : `values[n]` remplace exactement `{$v:n}` ; les cellules `$rows` correspondent aux clés `$columns`. Les chemins de provenance originaux doivent être reconstruits avant citation. Les données restent non fiables et ne confèrent aucune autorité. Les marqueurs déjà présents dans une source interdisent ce format afin d'éviter toute interprétation ambiguë.

Un test reconstruit le JSON initial et vérifie son **égalité profonde exacte** : aucun fait, statut, identifiant, document, provenance, révision ou omission perdu, résumé ou promu. La représentation la plus courte est retenue. Si elle dépasse encore 12 000 caractères, le refus existant reste bloquant, sans appel fournisseur. Un texte irréductible et une collision de marqueur sont testés.

Après : **11 443 caractères**, dictionnaire et enveloppe compris, soit **1 709 caractères économisés** et **557 caractères de marge**. Le budget 12 000 porte sur les sources, pas sur le prompt entier. La demande, la synthèse du Brain et les instructions restent des blocs distincts, avec leurs limites et déclarations de couverture existantes. Les instructions de décodage sont ajoutées uniquement lorsqu'une projection est utilisée.

Aucune hausse des 12 000 caractères, de `maxTokens=5200` ni de `reasoningEffort=low`. Modèle et nombre d'appels inchangés. Les cinq lots V1, le validateur de proposition, les contrôles d'identité, révision, approbation et les writers sont inchangés. Les similitudes de sens entre deux formulations ne sont pas dédupliquées : seules les valeurs strictement identiques sont mutualisées. Le résumé Brain n'est pas une nouvelle copie structurée complète des sources dans ce parcours.

## Tailles par section

Unités : caractères JavaScript du JSON compact ; les tailles de valeurs de section excluent leur clé et les séparateurs. Le total inclut toutes les clés, les séparateurs, le dictionnaire commun (225 caractères) et le format. Une révision référencée n'est pas tronquée : sa valeur intégrale figure une seule fois dans le dictionnaire.

| Section | Avant | Après | Priorité / traitement | Justification |
|---|---:|---:|---|---|
| `project` | 99 | 99 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `preparationId` | 8 | 8 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `provenance` | 73 | 73 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `sourceSelection` | 19 | 19 | Métier/document — conservé intégralement | Inchangé |
| `documents` | 1754 | 1696 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.project_id` | 3 | 3 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `businessContext.preparation_id` | 8 | 8 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `businessContext.revision` | 66 | 8 | Identité/preuve/couverture — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.consistency` | 25 | 25 | Métier/document — conservé intégralement | Inchangé |
| `businessContext.policy` | 30 | 30 | Métier/document — conservé intégralement | Inchangé |
| `businessContext.limits` | 49 | 49 | Métier/document — conservé intégralement | Inchangé |
| `businessContext.items` | 2210 | 1470 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.spatial` | 292 | 292 | Métier/document — conservé intégralement | Inchangé |
| `businessContext.calculations` | 779 | 705 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.worksheets` | 2541 | 2205 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.stage_model` | 764 | 751 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.equipment` | 448 | 448 | Métier/document — conservé intégralement | Inchangé |
| `businessContext.documents` | 873 | 757 | Métier/document — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.coverage` | 433 | 433 | Identité/preuve/couverture — conservé intégralement | Inchangé |
| `businessContext.omissions` | 2371 | 1770 | Identité/preuve/couverture — conservé intégralement | Valeurs identiques mutualisées / clés de séries factorisées |
| `businessContext.truncated` | 4 | 4 | Identité/preuve/couverture — conservé intégralement | Inchangé |

**Données résumées ou omises par cette correction : aucune.** Les 40 omissions antérieures restent toutes présentes ; une source omise ne signifie pas une absence dans Live. Les extraits incomplets restent `extracted_not_operator_confirmed` et ne certifient aucun document. Les six disciplines sont représentées sans ajouter de contenu au dossier réel.

## Fichiers et protections

- `src/lib/brain/live-production-evidence.ts` : enveloppe existante et sérialisation compacte sans perte.
- `src/lib/brain/response-composer.ts` : utilisation exclusivement dans le chemin Production existant ; garde de volume et paramètres cognitifs préservés.
- `src/tests/production-p0.test.ts` : reproduction représentative, égalité des sources, cinq lots, refus irréductible/collision, contrôles de budget et paramètres.
- `src/tests/production-p0-postgres.test.ts` : job et session réels en PostgreSQL jetable ; une réponse, même périmètre, aucun rejeu du traitement terminé.
- `vercel.json` : exclusion explicite de la branche corrective, sans changement des crons ou de Production.
- Ce dossier : fixture publique inventée, mesures et preuves. Aucun contenu d'Origins Of Nebulae.

Aucune modification du Stage Model, des moteurs métier, de l'authentification, des permissions, du contrat `clara.production.proposal.v1` ou du writer Live. Aucune commande matérielle ni sauvegarde de brouillon Live. Les tests persistants écrivent seulement dans le conteneur PostgreSQL local jetable.

## Réception et limites

Voir `results.txt`. Les tests de projection ne certifient pas la qualité cognitive réelle. Le succès de la génération dans les tests est simulé ; aucun appel OpenAI réel. La fixture couvre le profil mesuré, mais ne prouve pas que chaque contenu possible du dossier réel se compressera assez. Tout contenu irréductible reste refusé. Une future réception réelle nécessite un GO distinct ; aucun nouvel essai utilisateur ni rejeu du job échoué n'est déclenché ici.

AntiPreview : exclusion explicite de la branche dans `vercel.json` ; workflows existants inchangés ; règles historiques « Only build production » référencées dans `docs/delivery-v1-20261025/publication-protection-evidence.md`. Leur configuration distante actuelle n'est pas relue ici. Aucun Preview/deploy/alias demandé par Codex. Voir `anti-preview.json`.

**GO technique isolé pour le correctif de représentation des sources. NO-GO merge, génération réelle ou déploiement sans validation distincte.** Déploiements effectifs, CI distantes et qualité cognitive du dossier réel restent à attester séparément. Aucun besoin de migration ou d'intervention utilisateur pour réaliser la reproduction locale.
