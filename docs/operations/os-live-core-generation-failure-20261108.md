# Clara OS ↔ Live — réception de l'échec cognitif (8 novembre 2026)

## Socle confirmé

- Live PR Draft #338, SHA `2816975320c42d85e63e976daf982380a69884d0`,
  7 contrôles CI PASS : réception job terminé → cartes Production → acceptation
  locale uniquement → sauvegarde explicite CAS → réouverture. OS cognitif,
  identités et stockage Live étaient simulés dans sa recette navigateur.
- Clara OS Production est `7cbd820a9bc2382c9c0a368245c4dd8118dcc2e6` au départ
  de ce correctif. Le moteur Responses catégorise déjà
  `max_output_tokens` en `output_truncated` et marque les jobs échoués
  de façon transactionnelle avec la session. Le client Live ne traite que
  les jobs `completed`.

## Défaut reproduit dans le code de production OS

`composeClaraResponseWithProposal` conserve, intentionnellement pour le
dialogue ordinaire, le texte partiel accompagné d'une mention d'interruption.
`executeExternalEvent` réutilisait ensuite ce fragment comme message Clara
dans la session externe et le réinsérait dans `data.response` du HTTP 500,
bien que le job soit correctement marqué `failed`.

Ce texte ne représente jamais une proposition de fiche métier validée.

## Correctif minimal isolé

Pour un événement externe `USER_MESSAGE` dont la génération n'a pas
`status=completed` :
- conserver la demande utilisateur et les IDs originaux de conversation/job,
  la catégorie d'échec et le statut non terminé ;
- **ne stocker ni renvoyer le contenu cognitif incomplet** dans le chemin
  externe ; remplacer seulement le message Clara par une explication d'échec
  localisée (FR/EN/ES/DE/IT) ;
- `recoverable=false` pour le message externe puisque son contenu brut
  n'est jamais rendu, même si une partie existait au niveau fournisseur ;
- appeler l'ancienne persistance atomique `failWithSession` sans jamais
  appeler la persistance `completed` ;
- renvoyer HTTP 500 + `CORE_EVENT_PROCESSING_FAILED` +
  `failureCategory` + `sessionId` + `generation`, **sans `data.response`** ;
- aucun re-submit, replay, second appel cognitif, writer métier ou action matérielle.

Le comportement existant du compositeur pour le chat ordinaire reste inchangé.

## Contrat Production existant : génération complète et exploitable

Un contrôle supplémentaire est borné à un tour `USER_MESSAGE` de
`clara-live` avec `context.live.adviceOnly=true` **et** un
`activePreparation.businessContext` transmis par Live. Les identités
`projectId`, `preparationId` et le workspace sont relues depuis le contexte
scopé avant génération ; une préparation différente est rejetée avant dispatch.

Le compositeur OS garde exactement le contrat de transport existant
`ClaraCoreResult.response` (texte), mais demande alors à la même génération
cognitive de fournir un **unique bloc JSON complet** conforme au schéma
Live déjà utilisé `clara.production.proposal.v1`. Aucun appel fournisseur
additionnel ni nouveau modèle d'exécution.

Avant `completeWithSession`, le garde OS vérifie la présence du schéma,
les identités exactes, 1–50 lignes, les sections autorisées, les tailles de
champs et l'absence d'autres champs métier. Si la génération fournisseur est
terminée mais n'a produit que de la prose ou un JSON inutilisable,
le job est enregistré `failed / invalid_structure` avec la session et un
avis d'échec non exploitable. Aucun fragment de la réponse brute invalide n'est
renvoyé ni stocké comme réponse de Clara.

**Le parseur et les vérifications de Live restent l'autorité métier finale** :
ils contrôlent toujours les refus, les accès, la version CAS, les brouillons,
les confirmations et les sauvegardes explicites. Cette vérification de
compatibilité OS ne donne aucune autorité d'écriture.

Le parcours normal de conversation, les autres produits et les appels sans
`businessContext` restent inchangés. Un fournisseur réel peut toujours
refuser ou manquer le bloc attendu : ceci produit désormais un **échec explicite**
plutôt qu'un résultat `completed` non consommable, mais ne garantit pas le
succès cognitif réel.

## Réception et limites

Tests P0 sur les cas `output_truncated`, `output_filtered`,
`provider_timeout`, `provider_failed`, présence de l'identité et absence
de fragments dans la conversation/réponse d'erreur ; compilations GitHub.

Le schéma Live `clara.production.proposal.v1` figure déjà dans
`ProductionWorksheet`. Avec le nouveau garde, une réponse de prose seule
dans le parcours Production ciblé sera **rejetée**, mais une sortie fournisseur
réellement conforme reste **NON ATTESTÉE**. Les essais d'isolation utilisent
des réponses synthétiques ; ils n'attestent pas la compréhension d'une vraie
fiche ni la pertinence des lignes proposées. Le contrat Core
`ClaraCoreResult.response` reste inchangé.

NO-GO pour annoncer une fiche Origins Of Nebulae reçue, un rattachement
Stage/Patch attesté, ou une génération fournisseur réelle. Test en
environnement autorisé avec une vraie fiche technique et les identités
projet/préparation exactes nécessaire avant toute réception globale.

Ne pas fusionner ni déployer OS ou Live sans GO explicite.
