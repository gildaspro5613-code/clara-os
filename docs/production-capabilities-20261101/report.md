# Raccordements existants — correctifs ciblés

Branche : `fix/production-existing-capabilities-20261101`.
Base de livraison vérifiée : `18acb7cc831784cbef3f2001812faafd57d9cb36` (#223 intégrée). SHA réellement servi par Production non attesté depuis cet environnement. #224 n'est ni absorbée ni modifiée ; les commandes de reprise du chat et leur fichier restent identiques à la base.

| Fonction | Défaut reproduit | Cause | Correctif | Test isolé | Test réel | Statut |
|---|---|---|---|---|---|---|
| Voix | Réponse autorisée lente → bouton fermé ; raison indifférenciée. Non attribué sans preuve à l’incident Production. | Précontrôle initial 3 s sans nouvelle lecture ; refus/configuration/réseau confondus. | Attente initiale 10 s et lecture sur focus/retour réseau ; codes non sensibles et messages humains. Contrôles actifs 500 ms/timeout 3 s inchangés. | Lecture réelle d’autorité retardée au-delà de 3 s ; refus réel de projet maintient le bouton fermé et zéro micro ; rétablissement autorisé. Parcours vocal complet/historique/révocation testé. | NON ATTESTÉ Production/ElevenLabs. | Correctif local qualifié ; cause Production encore à lire. |
| Agenda | Sélection manquante ≠ panne ; ancienne réponse pouvant réapparaître après refus ; compteur zéro trompeur en erreur. | Codes génériques et requêtes concurrentes non invalidées. | Connexion/calendrier distingués ; erreurs localisées ; requêtes antérieures annulées/ignorées ; compteur inconnu « — ». | Calendrier reader, événement affiché, freeBusyReader refusé ; réponse ancienne tamponnée ne réapparaît pas. | NON ATTESTÉ Google réel. | Correctif local qualifié ; aucun OAuth, scope ou binding implicite modifié. |
| Météo | Réponse incomplète → 0° ; exceptions susceptibles de contenir l’URL fournisseur. | Absence de validation et valeur de remplacement. | Température/localisation/condition/date validées ; erreurs codées et nettoyées ; même WeatherAPI, appel borné sans retry. | Angers 21°/Clear synthétiques via route et moteur réels ; données invalides refusées, vrai 0° accepté ; configuration/refus/réseau distingués. | NON CERTIFIÉ WeatherAPI réel ; clé Production non inspectée. | Correctif local qualifié ; aucun nouveau fournisseur. |
| IONOS | Liste vide dans le scope ; cache sans fraîcheur attestée. | Autorité, propriétaire/délégation et droits client/projet exigés ; les connexions historiques ne sont pas des autorités implicites. Cause Production non attestée. | Libellé « Aucune boîte accessible pour ce projet ». Aucun provisionnement, GRANT ou monitoring activé. | Cache natif alimenté par transport simulé ; boîte autorisée visible, étrangère exclue ; révocation par API native → aperçu vide. Approbations couvertes par PostgreSQL. | NON ATTESTÉ IONOS réel. | Rapprochement administratif à vérifier, pas une panne ni disparition des cinq boîtes démontrée. |
| Connaissances | Module Mélodie Digital versionné absent des sources natives/rédacteur ; offres non renseignées dans le module. | Moteur natif limité à Foundation/Clara Live ; corpus d’entreprise non raccordé. | Source descriptive pour workspace serveur exact et contexte autorisé ; chemins, versions, SHA-256 et limites. Même Brain, mémoire et rédacteur. | Provenance dans session et requêtes GPT ; refus hors workspace/contexte ; aucune mutation de mission. Génération simulée. | GPT et documents commerciaux privés NON CERTIFIÉS. | PARTIEL : identité/vision/Clara OS et descriptif Live raccordés ; détail Services/priorité commerciale non établis par le corpus chargé. |
| Scrollbars | Piste/curseur non harmonisés dans les panneaux. | Styles workspace non appliqués aux GlassPanels et conteneurs de scroll. | Cyan ciblé, sans modifier dimensions, disposition ou navigation. | Couleurs calculées et captures desktop/mobile. | Production inchangée. | Qualifié en isolation. |

## Périmètre et limites des sources métier

Ressources réutilisées : `src/lib/knowledge/melodie-digital/{identity,vision,offers}.ts`, module d'entreprise version 1 ; `src/lib/knowledge/clara-live/module.ts`, version 1. Les données descriptives sont liées au workspace configuré du serveur, jamais substituées au workspace sélectionné. Les autres clients/projets et documents gardent leurs autorités natives habituelles. Les prix, clients, résultats, offre Services détaillée et priorité de lancement ne sont pas inventés. Le module descriptif Live ne certifie ni l'exhaustivité de ses domaines, ni les capacités actuellement reçues. Les documents commerciaux validés déjà existants restent à retrouver/rattacher par le parcours Documents autorisé ; aucun nouveau catalogue ou stratégie n'est créé.

## Réception

PostgreSQL jetable et endpoints applicatifs réels ; Google, WeatherAPI, IMAP, GPT et ElevenLabs simulés lorsqu'ils sont exercés. Aucun fournisseur réel ni équipement sollicité. Les captures présentent des données de fixture.

Les essais du harnais ont notamment confirmé que la révocation SQL directe sans évolution de révision est refusée par le trigger immuable ; le test utilise l'API de révocation existante, sans désactiver ce garde. Les interceptions navigateur sont drainées avant fermeture, sans ignorer les erreurs du parcours. Les assertions d'isolation restent actives.

Aucune migration, donnée Production, permission, secret ou configuration distante modifiés. Header/Hero/disposition, menu #222 et commandes de chat #224 inchangés. Une exclusion de déploiement Git explicite est ajoutée pour cette seule branche dans `vercel.json`, selon le mécanisme existant ; aucune protection globale ni environnement n'est modifié.

## Seul contrôle Production restant à collecter

Ce runtime n'a ni identité fournisseur, ni accès administratif Vercel/Neon, ni session authentifiée du propriétaire. Les journaux Vercel ne remplacent pas les réponses de cette session. Aucune indisponibilité de fournisseur n'en est déduite.

Le propriétaire peut utiliser `readonly-session-check.js` dans sa session habituelle sur `os.melodie.digital`. Il appelle seulement les cinq GET existants et n'affiche que codes/statuts/compteurs/validité, jamais cookies, jetons, contenus ou exceptions. `/api/calendar` et `/api/weather` peuvent effectuer les lectures fournisseur déjà demandées ; aucun IMAP/SMTP, appel vocal, envoi ou automatisation n'est lancé.

Interprétation minimale : refus vocal → vérifier le rôle natif existant ; configuration vocale manquante → attester les variables effectives déjà prévues, sans révéler leur valeur ; Agenda non sélectionné → utiliser la sélection explicite existante, sans nouveau consentement par défaut ; aperçu IONOS vide → contrôler l'autorité/délégation et les droits du projet, sans GRANT ou provisionnement automatique. Toute écriture administrative ou livraison exige un GO distinct.

**Décision : correctifs préparés pour revue ; NO-GO pour déclarer la réception Production complète sans ces lectures et les essais authentifiés. Aucun merge ni déploiement exécuté.**

## Résultats exécutés

48 tests ciblés et 2 recettes navigateur HTTPS : PASS, PostgreSQL réel isolé. TypeScript et build optimisé Webpack : PASS (polices locales de test). Lint ciblé : aucune erreur, un avertissement existant `no-img-element` dans WeatherWidget. Voir [sorties](results.txt), [desktop](desktop.png) et [mobile](mobile.png). Les fournisseurs et la génération sont simulés ; aucune certification Production ne résulte de ces tests.
