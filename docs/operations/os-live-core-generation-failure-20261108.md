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

## Réception et limites

Tests P0 sur les cas `output_truncated`, `output_filtered`,
`provider_timeout`, `provider_failed`, présence de l'identité et absence
de fragments dans la conversation/réponse d'erreur ; compilations GitHub.

Le schéma Live `clara.production.proposal.v1` est contenu dans le
prompt de `ProductionWorksheet` mais n'est pas encore garanti par une
réponse structurée fournisseur. Le prompt utilise « If you propose… » ;
une réponse OS `completed` peut donc rester de la prose. **Ce correctif
n'atteste pas la production de propositions réelles** et ne change pas
le contrat Core `ClaraCoreResult.response`.

NO-GO pour annoncer une fiche Origins Of Nebulae reçue, un rattachement
Stage/Patch attesté, ou une génération fournisseur réelle. Test en
environnement autorisé avec une vraie fiche technique et les identités
projet/préparation exactes nécessaire avant toute réception globale.

Ne pas fusionner ni déployer OS ou Live sans GO explicite.
