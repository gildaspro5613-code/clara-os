# Périmètre activé et fonctions reportées

Le GO éventuel concerne **la réception guidée locale avec fixtures**, pas un
runtime distant autonome, pas les boîtes professionnelles, pas les comptes réels.
Aucun nouveau bouton, moteur d’approbation, Journal, store ou connecteur n’est créé.

| Surface | Barrière effectivement exercée | Ce que cela ne prouve pas |
|---|---|---|
| Make/Brevo natifs | nativeOperationFence refuse les routes de connexion/configuration et le chat/les missions natifs n’ouvrent pas ces exécutions. Tests native-authority et vérification HTTP en navigateur. | Aucune certification du chemin produit `/api/external/capabilities` pour les deux scénarios. Ne pas fournir d’identité/capacité produit externe pour contourner le parcours natif fermé. |
| IONOS | Réseau `CLARA_IONOS_NETWORK_ENABLED=false`, surveillance `CLARA_IONOS_MONITOR_ENABLED=false`. Transport de test injecté, compteur SMTP à zéro dans la journée guidée. | Une approbation enregistrée n’est ni un envoi ni une preuve de validité future. Les simulations d’envoi des tests PostgreSQL restent des simulations, pas des emails réels. |
| Voix/Twilio/ElevenLabs | Hero natif indisponible, contrats et refus existants préservés ; aucun bouton voix activé par ce lot. | Pas d’attestation du couplage voix/mission/journal. La page Téléphonie et ses routes ne sont pas globalement déclarées dépourvues de tout effet ; ne pas y lancer un appel. Le harnais interdit les fournisseurs réels. |
| Google | Serveur de test : transport HTTP fournisseur simulé ; navigateur : seulement origine HTTPS locale. Ressource et calendrier explicitement attestés. | Ne pas déduire de variables absentes une absence d’appels. Aucune preuve des valeurs Vercel ni des comptes Google réels sur le candidat. |
| OpenAI | Réponses déterministes du preload de test et injection moteur pour la préparation mail. | Pas de certification sémantique, factuelle ou de disponibilité OpenAI réelle. |
| OS ↔ Live / autres réseaux | Aucune nouvelle capacité activée ; le preload de test refuse les destinations non simulées. | Pas de GO pour l’ensemble des endpoints externes d’un déploiement distant. Ne pas déployer ce candidat en supposant que les fixtures sont un profil applicatif d’isolation. |

Ces barrières permettent de **reporter** Make/Brevo, voix contextualisée et
surveillance autonome dans l’essai local, sans les déclarer corrigés ou certifiés.
Elles ne suffisent pas à donner un GO de déploiement Recette distant. Les éventuels
gardes d’autres branches (#196/#197/etc.) ne sont pas intégrés ni supposés présents.

Les cinq comptes de courrier existent : aucun compte/DNS/permission fournisseur
n’est créé, réinitialisé ou modifié. Tous les envois réels restent non autorisés.
Les identités a/b des tests sont des fixtures explicites dans PostgreSQL jetable,
pas des comptes administrateurs du produit ni un bypass d’authentification.
