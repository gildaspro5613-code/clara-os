# Démarrage vocal — correction ciblée

Base exclusive : Production `06c16d114a1a9ad938c26d9071023b9c602ea6f3`. Branche : `fix/native-voice-startup-20261102`. Aucun développement de #228 repris.

## Cause démontrée et limite de l'attribution Production

Le contrôle périodique lancé toutes les 500 ms et les contrôles de premier plan de `listen()`/du traitement peuvent ouvrir simultanément la même vérification d'autorité. Sur le source exact Production, le test reproduit **3 appels au lieu de 2**, soit une requête périodique supplémentaire pendant la lecture déjà en attente. Une seconde course permet à un ancien `200` de disponibilité de rétablir l'état visuel autorisé après un refus actif plus récent (**true au lieu de false**). Les protections serveur restent effectives : ce défaut d'état n'est pas un contournement d'ACL.

Le relevé Chrome du propriétaire montre des HTTP 200 entre 1,08 et 3,00 s et une annulation à 561 ms. Il est compatible avec une amplification des lectures près de la limite, mais **ne désigne pas la requête qui provoque le rouge**. Méthodes et JSON `success` de ces réponses Production non attestés par ce runtime. Aucune cause fournisseur ou refus de permission réelle n'est inventé.

## Correctif minimal

- `src/components/clara/useClaraRuntimeVoice.ts` : partage uniquement de la promesse d'autorité **en cours**, libérée en `finally` ; aucun cache d'autorisation ni nouveau délai. Les contrôles demandés attendent le résultat, puis vérifient que le tour n'a pas été interrompu.
- Une disponibilité antérieure au tour actif ou au refus ne peut plus modifier son autorisation : contrôle d'époque et d'activité.
- Un HTTP 200 n'est accepté que si le JSON contient `success:true`. Délai expiré, refus 401/403, conflit/certification 409, erreur navigateur et erreur fournisseur sont distingués dans l'état interne, avec seulement étape/type/statut/code public filtré. Aucun message d'exception, corps privé, cookie ou jeton copié. L'arrêt volontaire invalide l'époque ; une réponse tardive ne le transforme pas en erreur ni en redémarrage.
- `src/tests/native-voice.test.ts`, `src/tests/native-voice-browser.e2e.mjs` : cas positifs, courses et refus ajoutés aux suites déjà exécutées par le workflow existant.
- `vercel.json` : cette seule branche exclue des déploiements Git automatiques, selon la protection historique existante. Aucune configuration distante modifiée.

**Inchangés** : limites initiale 10 s / active 3 s, cadence 500 ms, limite de phase 120 s, contrats vocaux, routes STT/TTS, autorisations serveur, révocation, session/idempotence/historique, Brain, composants graphiques, traductions, workflows et #228. Toute lecture dépassant réellement 3 s continue de fermer le parcours ; aucun allongement arbitraire ni répétition automatique après refus.

## Preuves et réception

Les tests avant chargent le hook exact extrait du SHA Production dans le harnais existant : deux échecs attendus sur concurrence et réponse obsolète. La recette de latence réutilise le délai SQL des fixtures existantes, sans intercepter les réponses applicatives : **vrai PostgreSQL**, vraies routes, HTTP 200 et JSON `success:true`, maximum d'une lecture active en vol. Un dépassement injecté produit un véritable `TimeoutError` navigateur ; l'autorité SQL reste valide, aucun microphone supplémentaire ne démarre. Une révocation SQL réelle en fixture produit 403 et empêche le démarrage.

Le parcours continu existant teste trois échanges après un clic, MediaRecorder, transcription → Brain → historique durable → audio → reprise d'écoute, arrêt pendant écoute/STT/TTS, rejeu sans doublon et révocation pendant la session. STT/GPT/TTS restent **simulés**, même si le transport audio et PostgreSQL sont réels. Aucun essai ElevenLabs réel ni session Production accessible ici.

Les premiers essais du nouveau harnais réseau ont été arrêtés sur une synchronisation Playwright ; le test final utilise le délai SQL déjà présent. Aucun changement d'autorisation ou de temporisation applicative n'a été fait pour les satisfaire. La fixture TLS locale expirée a été renouvelée localement, sans modification de domaine ou de Vercel.

## Décision

**GO pour une recette authentifiée ciblée après revue/CI et autorisation distincte de livraison. NO-GO pour déclarer la voix Production rétablie avant cet essai réel.** Vérifier le JSON/méthode des réponses 200 proches de 3 s ; puis un clic, trois échanges audibles dans le même fil et Arrêter. Si une lecture reste au-delà de 3 s, relever uniquement méthode/statut/code public et motif d'annulation connu, sans audio ni données privées.

Aucun merge, déploiement, migration, modification de secret/droit ou écriture Production. Une seule branche et une seule PR Draft demandée.

## Validation finale groupée terminée

**31 tests unitaires/sécurité et 2 recettes navigateur HTTPS : PASS, aucun échec/ignoré. TypeScript, lint ciblé et build optimisé Webpack : PASS.** Polices locales de fixture utilisées au build. Voir [avant sur le source Production](before.txt) et [résultats finaux](results.txt). Le parcours continu dure 107 s, le cas de démarrage retardé 11 s. Aucune certification ElevenLabs réelle n'en est déduite.

Les deux fichiers de tests existaient déjà et sont exécutés par la CI native actuelle ; aucun changement de workflow nécessaire. La branche est protégée contre le déploiement Git automatique. Création de la PR Draft et statut CI distant à vérifier séparément ; ne pas attribuer un SUCCESS distant à partir de ces résultats locaux.
