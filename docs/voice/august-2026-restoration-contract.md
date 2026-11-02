# Clara OS — restauration vocale historique (août 2026)

Statut : **investigation, NO-GO déploiement**. Références GitHub vérifiées le 2 novembre 2026.

## Source d'origine retrouvée

- PR #42, commit `d8593cf2e6558a05c8a1c2cd68e264fa01dd0d14` : connecteur ElevenLabs.
- PR #46, commit `33d7ccc4b86583c55d2b2f0639143b325b55f5eb` : `src/components/clara/ClaraVoiceWidget.tsx` avec `ConversationProvider` / `useConversation` depuis `@elevenlabs/react`; `/api/voice/session?locale=...` générait une URL WebSocket signée et des overrides de langue.
- Commit `d440aa2893b6f168fcb8f4cc749703f04d3262a2` : correctif du flux ElevenLabs.

## Production actuelle et rupture

- Cockpit utilise `src/components/cockpit/widgets/voice/ClaraVoiceWidget.tsx` → `useClaraRuntimeVoice.ts` : MediaRecorder → `/api/voice/transcribe` → `/api/clara/chat` → `/api/voice/speak`.
- `src/lib/native/voice.ts` impose sélection workspace/client/projet/session, droit `connections:manage`, conversation certifiée et révocation pendant les appels.
- L'ancien `/api/voice/session` est absent de la branche de livraison. Son contrôle d'origine/referer et sa limitation de fréquence historiques ne suffisent PAS pour les autorisations actuelles.
- `ELEVENLABS_AGENT_ID` (ancien agent conversationnel) est distinct de `ELEVENLABS_VOICE_ID` (TTS). Ne jamais supposer que l'agent est configuré en Production.

## Contrat non négociable de restauration

1. Un seul appui pour démarrer, écoute continue et reprise après chaque réponse, arrêt explicite ; Safari iOS ciblé.
2. Chaque tour doit transiter par le runtime GPT/Brain natif, puis être persisté dans **la même conversation autorisée** avant d'être restitué oralement. Ne pas autoriser un second cerveau ElevenLabs autonome.
3. Interdiction d'exposer des URL signées sans autorisation native du projet/session et sans liaison durable au fil ; révocation de l'accès => arrêt de la session, du micro et des sorties audio.
4. Respect des cinq langues FR/EN/ES/DE/IT ; configuration du fournisseur côté serveur uniquement.
5. Tests d'une conversation continue et multi-tours sur iPhone réel, avec refus inter-projets, arrêt après révocation, reprise durable ; les fixtures isolées ne certifient pas les fournisseurs.

## Choix technique à établir avant de coder

L'ancien SDK `@elevenlabs/react` gère une conversation avec un agent fournisseur. Il ne garantit **pas** à lui seul l'acheminement de chaque tour vers `/api/clara/chat` et son journal natif. Il faut d'abord établir si le mécanisme d'agent existant permet de piloter de manière sûre le runtime natif, ou s'il faut conserver le pipeline STT/Brain/TTS en corrigeant son entrée audio iOS. Aucune restauration aveugle de route ou composant legacy.

## Périmètre de cette branche

Cette première étape documente les preuves et les contraintes. **Aucun code applicatif n'est modifié**, aucun déploiement n'est autorisé.

## Vérification historique complémentaire — code vs fonctionnement

- **PR #46 (15 août 2026)** : sa description reconnaît explicitement que, **avant le LOT D**, le widget ne faisait que simuler ses états. Le LOT D l'a relié réellement à ElevenLabs via un SDK conversationnel ; sa description place Chat, Brain et Runtime en **non-régression**, mais **ne décrit aucun transport des paroles au Brain**.
- Le `ClaraVoiceWidget.tsx` du commit `33d7ccc4` ne contient ni `onMessage`, ni `/api/clara/chat`, ni pont vers Brain, ni écriture d'historique. La session fournisseur pouvait converser en continu, mais le passage par GPT/Brain natif n'est pas démontré par ce code.
- **PR #72 (5 septembre 2026)** : explicite pour la première fois dans cette recherche la continuité durable Brain/GPT et Cockpit + chat. Elle était non fusionnée lors de la vérification ; son périmètre concerne la conversation écrite, et son texte ne prouve pas un pont avec ElevenLabs.
- **PR #140 (4 octobre 2026)** : demande de restaurer « Cockpit Hero + voice » avec le même contexte durable, confirmant l'intention de continuité ; ne démontre pas que le flux WebSocket historique écrivait dans la conversation native.

**Conclusion bornée** : l'écoute continue historique est retrouvée dans le code ; la preuve d'un bridge vocal→Brain durable reste absente des fichiers et PR examinés. L'existence passée d'une voix fonctionnelle ne doit pas être confondue avec la certification de cette liaison.


## Analyse complémentaire — choix du pont (2 novembre 2026)

### Nouvelle source fournisseur

La documentation officielle ElevenLabs « Integrate your own model » décrit la prise en charge d'un endpoint LLM personnalisé compatible OpenAI Chat Completions ou Responses, avec réponses en flux SSE. Source : https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm

**Option privilégiée à qualifier :** garder `@elevenlabs/react` pour la session audio continue et connecter l'agent à un **endpoint adaptateur Clara OS** compatible avec le protocole Custom LLM. Cet endpoint n'est pas un nouveau cerveau : il doit déléguer intégralement chaque tour au pipeline natif Brain/GPT, avec conversation ID serveur, autorité et persistance. L'adaptateur ne doit pas appeler directement un modèle GPT en contournant Brain.

### Pourquoi ne pas adopter immédiatement les tools webhook

Les outils webhook de l'agent sont déclenchés par la décision du modèle de l'agent, selon sa configuration. Cela n'atteste pas que chaque échange passe obligatoirement par Brain. Source : https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools

### Vérification de code supplémentaire

Le fichier `src/lib/native/voice.ts` sur cette branche conserve les contrôles natifs de scope, `connections:manage`, certification de fil et revalidation périodique de 500 ms pour les requêtes STT/TTS **bufferisées**. Son commentaire précise qu'aucune session conversationnelle autonome n'est ouverte. **Ces contrôles ne couvrent pas automatiquement un WebSocket fournisseur de longue durée** ; un bail de session et une révocation active devront être établis avant toute réutilisation de la route signée.

Le fichier `src/app/api/clara/chat/route.ts` analysé sur `main` appelle `runBrainDashboard` puis `OpenAIResponsesEngine`, mais l'extrait ne montre pas de persistance native de tour. Il ne faut donc **pas présumer** qu'un simple branchement Custom LLM vers cette route garantit le journal durable. Les routes, contrats et writers natifs de conversation restent à localiser/vérifier.

### Contrat d'implémentation à démontrer avant code applicatif

1. Authentifier la session et fixer côté serveur le workspace, le client, le projet, l'utilisateur et le fil ; aucun identifiant de contexte fourni par l'agent ne fait autorité.
2. Vérifier la capacité du fournisseur à transmettre l'identifiant de session et chaque tour au serveur Custom LLM, sans réponse autonome ni contournement.
3. Rendre le chemin vocal identique au chemin métier natif : un tour utilisateur, un dispatch Brain, une réponse gouvernée, et **persistances utilisateur + Clara** dans le fil autorisé, avec idempotence.
4. Implémenter un suivi durable du bail de session ; lors d'une révocation, l'application doit forcer l'arrêt local microphone/audio et invalider les accès serveur. Tester la latence d'annulation des tours en vol et l'absence d'émission résiduelle du fournisseur.
5. Tester sur Safari iPhone réel les cinq langues, trois tours consécutifs sans nouvel appui, coupure volontaire, navigation, reconnexion et refus inter-projets.
6. Aucun secret, URL signée ou autorisation ne doit être transmis à un autre projet/fil. La configuration ElevenLabs côté fournisseur et la compatibilité avec le protocole SSE restent à valider hors Production.

**Décision actuelle : option Custom LLM documentée, faisabilité opérationnelle non certifiée, aucune restauration applicative et NO-GO merge/Production.**


## Localisation confirmée du writer natif — étape suivante

Inspection directe de la branche de PR #228 :

- `src/app/api/clara/chat/route.ts` : `POST` délègue à `nativeChatRequest(request, () => scopedChat(request))`. `scopedChat` reconstitue le contexte opérationnel, déclenche `dispatchEvent` vers le Brain, compose la réponse et utilise `saveSession`. Le wrapper natif prend ensuite le reçu de réponse et la preuve pour l'opération transactionnelle de finalisation.
- `src/lib/native/chat.ts` : `nativeChatRequest` valide le scope et l'origine, exige un `operationId`, réserve l'opération par `clara_native_chat_command(...,'reserve',...)`, retourne le reçu en cas de rejeu, puis finalise avec `chatCommitProof` dans `withNativeScope`. La migration 017 assure l'archivage natif ancien/nouveau selon les commentaires du code. Le comportement SQL réel est à requalifier sur environnement isolé.
- `src/app/api/clara/conversation/route.ts` : lecture du même fil via `nativeCommand(scope,'history',...)`, avec comparaison stricte entre `thread` et `scope.sessionId`.
- `src/components/clara/useClaraRuntimeVoice.ts` : réutilise **déjà** `/api/clara/chat` avec `operationId` et `sessionId`, attend puis vérifie l'historique natif, fait synthétiser `messageId` via `/api/voice/speak`, et reprend `listen()` après la fin de lecture. Il s'agit donc déjà d'une boucle multi-tours dans le code, mais pas de la session conversationnelle ElevenLabs d'août. Le dysfonctionnement constaté sur navigateur réel ne saurait être considéré résolu par cette preuve de code.

### Conséquence architecturale

Il **ne faut pas créer un second writer ou appeler directement `dispatchEvent` depuis un nouvel endpoint vocal**. Le pont ElevenLabs, s'il est retenu, doit utiliser la même opération native `reserve → Brain → commit/reçu → history`, sans dupliquer les tours ni contourner `withNativeScope`.

L'adaptateur Custom LLM devra traiter le format de requête et de flux de réponse exigé par ElevenLabs ; le transport d'identité et de session entre un fournisseur externe et une route aujourd'hui fondée sur les cookies et `sameOrigin` n'est **pas résolu**. Prévoir une authentification serveur-fournisseur et une association de session à durée limitée, sans confiance dans des paramètres libres. Ne pas remplacer `sameOrigin` par une exemption publique générique.

### Deux qualifications avant une implémentation

A. Vérifier expérimentalement le contrat Custom LLM en flux (identification et séquençage des tours, exigence de persistance avant restitution, annulation, absence de réponse de secours autonome) avec un fournisseur simulé.

B. Vérifier si la session ElevenLabs continue peut être arrêtée immédiatement par Clara OS et si Safari iOS permet la reprise conforme après chaque réponse. Un flux externe SSE/WebSocket peut survivre à la fermeture de la requête applicative : l'arrêt local et la révocation sont deux exigences distinctes.

**Statut : writer natif retrouvé et réutilisation prioritaire confirmée par lecture du code ; intégration fournisseur et validation iPhone NON démontrées. Pas de code applicatif, pas de merge/déploiement.**


## Protocole isolé ajouté — qualification préalable au raccord réel

Fichiers de la PR #228 :
- `src/lib/voice/custom-llm-isolated.ts` : parseur contraint du dernier tour utilisateur (`stream:true`), adaptateur SSE Chat Completions, exigence d'une autorisation avant/après une **fonction injectée** `commitViaNativeChat`, et interdiction d'émettre le texte si la finalisation native échoue.
- `src/tests/custom-llm-isolated.test.ts` : tests de forme du message, reçu natif préalable, rejet d'une révocation et revalidation après commit.

Ce code est **une fixture isolée non branchée** : la fonction `commitViaNativeChat` n'est pas connectée à l'autorité réelle ; aucun endpoint HTTP n'est exposé, aucune configuration ElevenLabs n'a été modifiée. La disponibilité fournisseur, le transport sûr de l'identité, le contrôle de révocation WebSocket et l'enchaînement audio Safari iOS restent à qualifier avant intégration.

Commande CI/locale prévue : `node --import tsx --test src/tests/custom-llm-isolated.test.ts`, puis `npx tsc --noEmit` et `npm run build`. **Aucune exécution de ces commandes n'est attestée par cette modification GitHub.**

Documentation fournisseur consultée : https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm (Chat Completions/Responses compatibles ; SSE requis). Les tests de contrat locaux ne prouvent pas qu'ElevenLabs transmettra au système les identifiants natifs ni qu'une voix externe sera interrompue lors d'une révocation.

**GO limité à la qualification isolée. NO-GO raccord fournisseur / merge / Production.**
