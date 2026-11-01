# PR #223 — Raccordement vocal historique, preuve ciblée

> État historique avant raccordement. Le code et la réception suivants sont décrits dans [le compte rendu du raccordement natif](native-receipt/report.md).

Base examinée : `e50ca57d074e1b414311da5a209fb9ccdd356475`. Aucun fichier applicatif modifié. Cette livraison ajoute uniquement le reproducer dans le test de sécurité vocal existant et les résultats ci-joints.

## Provenance retrouvée

Deux parcours déjà développés sont toujours présents, et ne doivent pas être confondus :

| Parcours historique | Source / preuve Git | Fonction conservée |
|---|---|---|
| Conversation ElevenLabs directe du Cockpit | `src/components/cockpit/widgets/voice/ClaraVoiceWidget.tsx`, `/api/elevenlabs/session` ; commits `afe5ea22`, `d440aa28`, `873da212` | Microphone, URL signée, SDK Conversation, réponse audio du fournisseur et arrêt manuel. |
| Voix passant par le runtime OS | `src/components/clara/ClaraVoiceWidget.tsx` ; `0324f5d91045f8166d361cde1236dc322e3b33fd`, `0d76a648` | MediaRecorder → `/api/voice/transcribe` → `/api/clara/chat` → `/api/voice/speak`. Le chat utilise le runtime existant. |
| Synchronisation du transcript | `03c51faf996c140bb954e533d87ec52ccf2a7bff` ; ClaraChatWidget | Événement navigateur `clara:conversation-updated` après réponse du chat. Cela existe dans le parcours runtime, pas dans le widget SDK direct actuellement monté dans Stage. |
| Autorisation des routes vocales | `f41033525717f2edaa46212e8e6c575509d42aa4`, `src/lib/auth/voice-request-authorization.ts` | Session canonique, workspace serveur et capacité opérateur `connections:manage`, origine des POST. Aucun élargissement effectué. |
| Garde natif | `a523f5c6930b4abbd2a31b69cb832b3cba3c8e59` | Refus des anciens adaptateurs globaux dans le contexte natif. `141648d51b9f3bd7173eeeecfd59d5c3b9fd9b48` conserve le widget visible mais désactivé ; `ce51f0f706c9632169e4530afa3a9066ca0effdc` conserve cette protection lors du retour à la composition 781. |

Les preuves historiques et la confirmation propriétaire de conversations vocales réelles sont conservées dans `docs/delivery-v1-20261025/fournisseurs.csv` et les dossiers de réception existants. Le présent constat ne les annule pas et ne déclare pas le transport ElevenLabs défaillant.

## Cause démontrée du blocage natif

Le composant de Stage emploie le **premier** parcours. Son URL signée ouvre directement une conversation fournisseur ; elle ne transmet pas les sélecteurs natifs workspace/client/projet/session. Le composant n'installe pas de `onMessage`, n'envoie pas les tours au runtime OS, ne relit pas l'historique et ne fournit pas d'identifiant durable pour la reconnexion. Le chemin runtime historique, qui sait appeler le chat, est un autre composant et n'est pas substituable par une simple suppression de `disabled`.

Le test exécute les vrais handlers du composant transpilé, avec microphone et SDK injectés hors réseau :

- désactivé : zéro demande micro, zéro URL signée, zéro démarrage SDK, même par invocation directe du handler ;
- mode historique : demande micro → URL signée → démarrage SDK → arrêt manuel → nouveau démarrage ;
- handoff SDK observé : `onMessage=undefined`, zéro requête chat/historique ;
- passage à disabled pendant une session : zéro appel supplémentaire à `endSession` ;
- après désactivation, aucun nouveau démarrage permis.

Ce reproducer est un test unitaire du composant réel. Il n'est **ni une acquisition microphone physique, ni un test audio réel, ni une preuve de révocation SQL distante**. Il démontre pourquoi la barrière doit rester en place, pas une certification positive du parcours complet.

Les routes de transcription/synthèse sont toujours protégées par l'autorité opérateur historique, distincte du contexte natif sélectionné. La présence de cette autorité ne prouve pas une permission vocale pour chaque mission. `src/lib/native/authority.ts` documente pourquoi les anciens adaptateurs globaux restent fermés ; aucune autorisation vocale n'y est ajoutée ici.

Le contrat existant `docs/voice/conversation-link-v1.md` distingue explicitement `conversation:link` de `voice:conversation`. Il indique que le reçu concerne l'association, pas l'arrêt ElevenLabs ; une session fournisseur enregistrée sans arrêt attesté provoque un refus. Ce contrat ne peut donc pas certifier l'arrêt du widget par substitution.

## Parcours demandé : verdict exact

| Étape | Résultat actuel |
|---|---|
| Microphone → session ElevenLabs → audio | Historiquement réalisé selon les preuves conservées ; contrôle local des handlers seulement dans ce lot. Aucun appel réel exécuté. |
| Tours → runtime Clara → Conversations durables | Parcours runtime historique retrouvé ; raccordement absent dans le widget SDK de Stage. NON CERTIFIÉ pour le Cockpit natif. |
| Interruption manuelle | Appel SDK `endSession` vérifié en isolation. |
| Reprise après reconnexion | Nouveau démarrage observé ; reprise durable non démontrée pour ce widget. |
| Arrêt après révocation | Aucun lien observé entre révocation native et arrêt SDK. NON CERTIFIÉ ; garde maintenu. |

## Suite strictement nécessaire

Réutiliser le parcours vocal runtime et ses adaptateurs existants pour le composant monté dans Stage, avec les sélecteurs natifs et le stockage de chat déjà en place ; vérifier l'autorité à chaque étape et raccorder l'arrêt effectif du flux à la révocation. Ces raccordements ne sont pas actuellement établis par les mécanismes retrouvés : un simple déverrouillage serait incorrect. Aucun moteur ou connecteur concurrent n'est proposé.

La réception fournisseur complète reste en outre impossible dans cet environnement : l'état courant du runtime managé ne fournit aucun secret ou identité fournisseur et sa politique réseau n'autorise pas ElevenLabs. Aucun secret n'a été recherché ou imprimé. Il faudra un essai explicitement autorisé dans un environnement déjà équipé, après qualification isolée du raccordement ; aucune reconfiguration ni infrastructure nouvelle n'est demandée.

Résultats : six tests PASS (quatre sécurité vocale dont deux reproductions ajoutées, deux frontière canonique). TypeScript et lint ciblé PASS. Aucun test end-to-end audio réel annoncé. Les preuves PostgreSQL/reprise/révocation du lot précédent sont conservées dans `../report.md` sans être présentées comme preuve d'arrêt fournisseur.

**NO-GO levée du garde vocal natif.** Aucun changement de graphisme, ACL, moteur, connecteur, donnée, migration, merge ou déploiement. Le correctif d'activation ne peut pas être déclaré livré sur ces seules preuves.
