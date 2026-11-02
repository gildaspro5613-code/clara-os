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
