# PR #223 — Raccordement effectif du bouton vocal natif

Base : `19d047f8ad3e37168645f3c32799227e9454c3dd`. Cette réception remplace le verdict d'activation antérieur dans le périmètre local ci-dessous ; les preuves historiques restent conservées.

## Code livré

Le bouton existant du Hero conserve intégralement son JSX visuel, ses classes et ses traductions. Il utilise maintenant le parcours historique de `src/components/clara/ClaraVoiceWidget.tsx`, extrait dans `useClaraRuntimeVoice.ts` et partagé par les deux vues existantes :

**MediaRecorder → `/api/voice/transcribe` → `/api/clara/chat` → Conversations natives → `/api/voice/speak` → HTMLAudioElement.**

Aucun agent Conversation ElevenLabs autonome n'est ouvert par le bouton natif. Les routes, le moteur STT/TTS et le modèle vocal existants sont réutilisés. Aucun nouveau service, connecteur, abonnement, table ou migration.

- La page transmet les quatre sélecteurs déjà autorisés à Cockpit → Hero → Stage. Aucun digest, cookie, jeton ou identifiant fournisseur n'est envoyé comme prop. L'accès au contexte AsyncLocalStorage dans un composant serveur rendu ultérieurement n'est pas utilisé comme raccourci.
- Sans contexte complet ou fil natif certifié, le bouton reste fermé. Une vérification serveur en lecture seule, sur la route de transcription existante, est exigée avant l'accès micro.
- La permission opérateur vocale historique `connections:manage` est conservée, **ainsi que** les droits natifs de gestion client/projet/session et le contrôle du fil. Un membre qui ne possède pas ces droits ne les reçoit pas par ce correctif. Les anciennes routes globales ne peuvent pas servir de repli à une sélection native.
- Le chat conserve son `operationId`, sa réservation, sa transaction de finalisation et ses contrôles concurrents #221. Les tours utilisent exactement le stockage et l'historique des messages écrits.
- La même clé `clara.pending-chat:<session>` conserve une opération sans acquittement. Une reconnexion puis une action explicite reprend cette opération ; aucune répétition automatique. L'historique est relu par la route existante. L'événement de synchronisation visuelle est lié au fil exact.
- La synthèse native accepte uniquement un `messageId` Clara de l'historique autorisé. Le serveur retrouve le texte ; un texte libre, un message utilisateur ou une référence étrangère est refusé.

## Révocation et interruption

L'autorité est contrôlée avant chaque étape, après chaque retour fournisseur et pendant les opérations actives. Le navigateur et les requêtes fournisseur surveillent l'autorité toutes les **500 ms**. Une erreur de contrôle ferme le parcours ; les lectures navigateur ont un délai maximal de 3 secondes. Ce contrôle périodique ne prétend pas être une notification instantanée de révocation.

L'arrêt termine les pistes du micro, neutralise le callback de fin d'enregistrement, annule les requêtes HTTP par AbortController, met l'audio en pause, retire sa source et révoque son URL Blob. Changement de contexte, démontage, page masquée, interruption manuelle et refus d'autorité exécutent ce nettoyage. Les représentations desktop/mobile existantes se coordonnent pour ne pas maintenir deux activités vocales.

Le serveur annule les requêtes STT/TTS en cours sur révocation détectée ou déconnexion et contrôle encore l'autorité avant de restituer les résultats tamponnés. Cette annulation HTTP ne prétend pas attester l'arrêt d'un calcul interne ElevenLabs après réception ; aucune session conversationnelle distante autonome n'est créée dans ce parcours.

## Preuves

La recette HTTPS utilise le runtime applicatif optimisé et PostgreSQL jetable réels. Chromium utilise son périphérique micro synthétique avec le vrai MediaRecorder ; le vrai HTMLAudioElement lit un WAV local. **ElevenLabs et la génération du Brain sont simulés, aucun fournisseur réel appelé.**

Scénarios du test `src/tests/native-voice-browser.e2e.mjs` :

1. Refus sans session, autre utilisateur, autre projet et synthèse libre/étrangère ; refus du repli vers `/api/elevenlabs/session`.
2. Enregistrement, transcription, chat, deux tours persistés, réponse audio et synchronisation du dialogue.
3. Rechargement : mêmes messages et mêmes identifiants, aucune création/modification de mission sur consultation.
4. Acquittement perdu après commit SQL : reprise explicite avec le même identifiant, reçu de rejeu, aucun doublon et aucune nouvelle transcription.
5. Révocation du projet pendant l'enregistrement : pistes terminées, aucun appel STT.
6. Révocation pendant la requête fournisseur : AbortSignal observé, aucun nouveau tour.
7. Révocation de session pendant l'audio : lecture réellement mise en pause et bouton fermé.
8. Parcours mobile et captures desktop/mobile.

Le proxy HTTPS de test transmet désormais la déconnexion navigateur à sa requête amont ; un test dédié interdit toute répétition. Cela n'introduit aucun proxy applicatif.

Les anciens tests qui imposaient une désactivation vocale permanente ont été ajustés au nouveau contrat : les lectures d'autorité sont permises ; aucun fournisseur ni microphone ne démarre spontanément. Les assertions d'isolation et de refus sont conservées et complétées par le test vocal.

## Limite de certification

La recette ElevenLabs authentique reste à exécuter dans un environnement déjà configuré, sous autorisation distincte. Aucun secret fournisseur n'est disponible dans ce runtime managé et ElevenLabs n'est pas une destination autorisée par sa politique réseau. Cela ne remet pas en cause les essais vocaux réels historiques, et ne bloque pas la qualification locale du raccordement livré.

Le garde ne devient pas `disabled=false` : le bouton ne s'ouvre qu'avec un contexte certifié et un contrôle serveur positif. Les refus d'autorité, les protections Recette contre les effets externes et les contrôles de révocation restent actifs.

Aucun merge, déploiement, migration, modification de Production, ACL ou configuration fournisseur.

## Résultats techniques et réserves de réception

- 40 tests ciblés PostgreSQL/sécurité/consultation/conversations, tous PASS ; les transactions concurrentes de révocation #221 sont conservées et vérifiées.
- 4 tests du transport HTTPS isolé, tous PASS, dont propagation de la déconnexion vers l'amont sans répétition.
- TypeScript, lint des fichiers impactés et build optimisé Webpack PASS. Polices substituées par une ressource locale de test pour éviter Google Fonts dans ce runtime ; aucune modification des polices applicatives versionnées.
- Le parcours de navigation historique et les 15 vues langue/format ont également passé leurs recettes pendant la préparation. Leur tentative d'initialisation de `clara_connections` lors de l'ouverture de Connexions est **bloquée** par le harnais comme avant ce correctif (`connection-repository.ts` existe à la base). Elle n'est pas autorisée pour rendre un indicateur vert. Les recettes recherche/capacités/voix finales utilisent le groupe de base fraîche prévu par le workflow existant, avec interdiction inchangée des chargeurs métier globaux.
- Un premier lint trop large a rencontré l'erreur préexistante de `ClaraRecommendation.tsx`, fichier inchangé ; le lint ciblé de tous les fichiers de ce correctif est vert. Aucun test ni règle de sécurité n'est désactivé.

Le workflow Native Authority existant inclut les tests et le parcours vocal, avec credentials et fournisseurs **strictement synthétiques**. Aucun workflow de déploiement n'est modifié.

**Décision : GO technique isolé du raccordement natif pour un opérateur déjà autorisé ; réception ElevenLabs réelle non certifiée.** Les utilisateurs sans contexte/droits/configuration et le mode Recette protégé restent fermés. Ce résultat n'autorise aucun merge ou déploiement.

### Recettes finales sur le bundle courant

| Recette HTTPS | Résultat |
|---|---|
| Recherche native du header : droits, destinations, clavier, FR/EN/ES/DE/IT et trois formats | PASS |
| Agenda autorisé/refus/révocation, Météo indisponible et préparation Waze | PASS |
| Voix native, historique SQL, reprise du reçu, refus et révocations ; desktop/mobile | PASS |

La dernière recette vocale vérifie une lecture audio non pausée avec `currentTime > 0`, puis une pause et le retrait de source après révocation. Elle vérifie également que le message synthétisé appartient au reçu du chat, et non à une réponse écrite concurrente plus récente.

Captures réelles du navigateur de test : [desktop](desktop.png), [mobile](mobile.png). Résultats bruts dans [results.txt](results.txt). Les sources audio, la transcription et la réponse simulées sont explicitement des fixtures ; aucune intelligibilité ni latence ElevenLabs réelle n'est certifiée ici.
