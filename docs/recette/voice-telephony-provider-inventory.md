# Clara OS Recette — inventaire téléphonie et ElevenLabs

Statut : audit de configuration uniquement ; aucune activation fournisseur, aucun secret, aucun appel réel.

## Entrées du runtime vérifiées

- `src/lib/config/elevenlabs.ts` : `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_AGENT_PHONE_NUMBER_ID`.
- `src/lib/connectors/internal/telephony/telephony-engine.ts` : POST `/v1/convai/twilio/outbound-call` vers ElevenLabs. Le code transmet l'API Key, l'Agent ID et le Phone Number ID ElevenLabs ; il ne lit pas directement `TWILIO_ACCOUNT_SID` ou `TWILIO_AUTH_TOKEN` sur ce parcours.
- `src/app/api/elevenlabs/session/route.ts` : URL de session signée ElevenLabs avec API Key et Agent ID ; refus en Recette avant le fetch.
- `src/lib/auth/voice-request-authorization.ts` : autorisation opérateur requise avant le déclenchement des opérations.

## Constat sur le projet Vercel isolé

Projet : `clara-os-recette` (`prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`). Inventaire des noms de variables uniquement, sans déchiffrement : aucune variable `ELEVENLABS_*` ou `TWILIO_*` déclarée au moment du contrôle. C'est attendu pour la recette hors réseau ; ne pas les ajouter pendant cette phase.

## Points de réception

1. Confirmer quel compte ElevenLabs, quel agent et quel numéro Twilio sont destinés à Clara OS, distincts de Clara Live.
2. Vérifier la liaison Twilio ↔ ElevenLabs dans le tableau de bord fournisseur, sans recopier les secrets dans GitHub, les tickets, les logs ou les documents.
3. À l'étape d'essais réels autorisée, ajouter uniquement les secrets nécessaires au projet et à l'environnement approuvés dans Vercel, jamais au projet Recette bloqué par défaut.
4. Prévoir une autorisation opérateur explicite, un numéro de test autorisé, un plafond de coût et une fenêtre de test avant tout appel réel.
5. Conserver les protections Recette et le NO-GO Production jusqu'à la réception fonctionnelle de la vraie PR #176.

Les valeurs des identifiants et les liaisons fournisseur ne sont pas attestées par cet inventaire.
