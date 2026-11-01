# PR #223 — Personnalité historique, dialogue écrit et vocal

Base : `cdd3eaecedde5e1afd93b6bcea324038459f2ec5`. Aucun nouveau modèle, moteur, connecteur, chemin conversationnel ou changement graphique.

## Provenance et défauts précis

- `8d2d35228fa9bb2af405e0667105162c790e703b` : `src/lib/knowledge/assistant/personality.ts`, traits, communication, attitude et principes historiques. Ce module existait mais n'était pas importé par le rédacteur.
- `762123d5` : `src/i18n/prompts/clara-invariant.md`, `clara.{fr,en,es,de,it}.md`, `index.ts`. Ils prévoient une collaboratrice naturelle, professionnelle, claire, sans invention de faits ni extension de droits. Les variantes FR/ES/DE/IT utilisent toutefois la forme de politesse par défaut. Le tutoiement du présent correctif suit **la consigne actuelle du propriétaire**, pas une fausse affirmation selon laquelle ces fichiers le demandaient déjà.
- `26f445ecc712442792acc43b381cbca5d039ce47` : prénom occasionnel, chaleur, continuité et réponses complètes dans le rédacteur existant. Le code courant en conservait déjà une partie dans son prompt ; la personnalité n'était donc pas entièrement absente.
- Le Cockpit utilise `readGoogleDisplayName`, preuve chiffrée, expirante et liée au digest de la session authentifiée. Le dialogue lisait seulement `session.user.firstName` : souvent null dans les sessions natives, ou valeur historique/default non attestée. Il ne partageait pas cette preuve de présentation.

## Raccordement livré

Chemin unique conservé : **Cockpit écrit ou vocal → `/api/clara/chat` → autorité et réservation natives → Clara/orchestrateur → Brain et GPT de raisonnement → rédacteur GPT existant → finalisation SQL → Conversations → synthèse vocale pour la voix.**

1. `personality.ts` expose une projection des traits et règles existants, avec registre personnel tu/you/tú/du/tu et respect d'une préférence explicite différente. Elle est transmise dans `instructions` au rédacteur déjà présent, en conservant les instructions de sources non fiables et d'absence d'outils. Le bloc de style redondant de son `prompt` est retiré : aucun prompt concurrent.
2. La route de chat récupère le prénom par le mécanisme sécurisé déjà utilisé par le Cockpit, **après autorisation native**. Le contexte de requête porte `authenticatedFirstName`, pas une nouvelle autorité. Le même prénom entre dans l'événement du Brain et dans l'identité du rédacteur. Une ancienne valeur de session ou un prénom par défaut n'est jamais une preuve d'identité.
3. Le style reste naturel, chaleureux, professionnel et spontané ; le prénom n'est pas demandé à chaque tour. Les conseils, propositions et résultats exécutés restent distincts. Aucun titre de mission, contenu documentaire ou résultat fournisseur n'est inventé ou traduit en base.
4. La langue active reste la préférence existante `NEXT_LOCALE`. Le message et l'historique autorisé récent transmettent les préférences explicites de registre/concision/niveau technique. Aucun magasin séparé de préférences structurées n'a été identifié dans ce chemin : aucun n'est inventé, et la reprise de préférences plus anciennes que la fenêtre actuelle n'est pas certifiée.
5. La voix passe par cette même route et le même rédacteur. Aucune personnalité ElevenLabs parallèle n'est créée. Le registre des brouillons commerciaux destinés aux tiers n'est pas modifié.

## Réception et limites

- **18 tests PASS** : personnalité/instructions dans les cinq langues, absence de prénom non attesté, preuve de prénom liée à la session, traduction, consultation réelle des missions PostgreSQL et révocation concurrente #221.
- **1 recette navigateur HTTPS PASS** sur le runtime optimisé avec PostgreSQL réel : 30 échanges persistés dans cinq fils linguistiques (25 avec prénom authentifié de fixture, 5 après retrait de la preuve de prénom), dont 5 tours vocaux avec MediaRecorder et lecture audio du navigateur. Aucune mission créée.
- La capture du **véritable corps HTTP destiné à OpenAI** confirme les instructions de personnalité, la langue, le prénom ou son absence, la présence des préférences dans l'historique repris et l'absence d'outils du rédacteur. Le transport HTTP OpenAI est remplacé par un fournisseur de test contrôlé.
- TypeScript, lint ciblé et build Webpack PASS. Les polices du build de test sont locales, comme dans la réception vocale précédente. Aucun fichier d'interface ou de traduction modifié.

**Les réponses de `examples-simulated.json` sont des réponses SCRIPTÉES du substitut HTTP, retournées par le chemin applicatif testé. Elles ne sont pas produites par un GPT réel et ne certifient pas son naturel, son respect effectif du registre ou la qualité d'une voix ElevenLabs réelle.** La fixture refuse de répondre si les instructions attendues ou la langue n'arrivent pas dans la requête. `payload-attestation.json` ne contient ni jeton, ni subject Google, ni secret, ni donnée Production. Camille est un prénom de fixture, pas une identité du propriétaire.

Exemples FR de cette simulation :

| Réception | Réponse du substitut |
|---|---|
| Salutation | Bonjour Camille ! Comment vas-tu ? |
| Question simple | Oui, on peut regarder ça ensemble. |
| Professionnel | Je peux t’aider à préparer les étapes utiles, sans engager d’action à ta place. |
| Reprise | On reprend notre échange précédent. Tu préfères qu’on commence par quel point ? |
| Voix | Je t’écoute. On peut faire le point ensemble. |

Les variantes EN/ES/DE/IT et leurs demandes figurent dans le JSON. Aucune génération GPT réelle n'est exécutée : le runtime managé n'a pas de credential fournisseur configuré et son réseau ne permet pas cet essai. La réception qualitative réelle reste nécessaire dans l'environnement existant autorisé, sans reconfiguration présumée.

**GO technique isolé pour la transmission de la personnalité et de l'identité. Personnalité du fournisseur réel NON CERTIFIÉE.** Aucun merge, déploiement, modification de Production, migration, autorisation ou secret changé.
