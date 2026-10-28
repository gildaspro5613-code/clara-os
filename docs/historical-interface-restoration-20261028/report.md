# Restauration historique Clara OS — réception du 28 octobre 2026

La restauration est conservée sur `fix/clara-os-historical-interface-20261028`. **La mission n’est pas déclarée livrée : aucune Preview distante n’a été créée ni reçue.** Production, Clara Live et Studio inchangés.

## Provenance et référence validée

- Base distante récupérée par Git : `adff3190863a9af07645091b740c2dffe202337d`, branche `delivery/clara-os-v1-20261025`, intégrant la PR #218. Cette observation Git n’atteste pas le SHA actuellement servi par Production. Aucun merge effectué pendant cette mission.
- Le propriétaire a explicitement retenu **le Hero architectural sans portrait**, source `fb2072cf4d66290bb2cc96f7a2a81e9084dc29b7`. Le décor correspondant est conservé, avec les adaptations mobiles déjà reçues.
- Layout avant sélecteur technique : `222617b`. Introduction du `NativeScopeSelector` global : `5e6488e`. La sélection canonique elle-même reste nécessaire à l’autorité et n’est pas supprimée.
- GlassPanel historique : même composant, bleu nuit, cyan, liseré vertical; aucune bibliothèque graphique ajoutée.
- `1d01f88`, malgré son titre « restore validated hero glass panels », contient une mission fictive de secours. Ce secours n’a pas été réintroduit.
- Ascendance des correctifs `624fc09` et `b2a3959` vérifiée. Rapports précédents et 137 preuves historiques conservés dans leur chaîne Git; aucune réécriture.
- Pas de capture runtime originale de `fb2072c` retrouvée dans les éléments utilisés. Les captures récentes ne sont pas présentées comme des captures historiques de ce commit.

## Corrections effectivement réalisées

1. Sélecteur retiré du contenu global. Le profil ouvre explicitement les réglages existants, leurs sélections et commandes. Aucun changement des autorités, permissions, SQL ou contrats natifs. Déconnexion confirmée par la route existante de révocation de session Clara OS (pas OAuth), refus immédiat du jeton révoqué et données retrouvées par l’autre session autorisée. Le menu se ferme à la navigation, avec Échap ou son bouton; les formulaires métier existants peuvent l’ouvrir volontairement.
2. Retour explicite au Cockpit depuis les pages métier. Logo, icônes, favicon et sections de navigation conservés.
3. Conversations : texte autorisé réellement restitué, liens vers les messages; sélection d’un fil par la commande existante `selectSession`; liste lue dans le périmètre authentifié avant le rendu différé React. Aucun digest d’authentification envoyé au composant client, aucun historique copié.
4. Clara : colonne droite contenant les conversations du projet autorisé et le contexte métier. Conversation générale sans mission testée. La sélection d’un fil précis est également disponible depuis le Cockpit et le chat Cockpit affiche les vrais échanges, sans mode compact masquant leur contenu. Dialogue multiligne, reprise et idempotence préservés.
5. Missions : ouverture directe d’un identifiant présent dans la liste autorisée; liste multimission du projet dans le Hero et les widgets. Un identifiant étranger ne devient pas une mission sélectionnée de la page. Pas de création automatique sur consultation. Un lien étranger affiche un refus explicite; le retour d’une fiche enlève le lien de détail, sans réaffecter la conversation active.
6. Panneaux du Hero empilés sans chevauchement ni compression du contenu; défilement explicite si nécessaire. Aucun panneau documentaire global dans le Cockpit. Synthèse courrier sans éditeur d’email ajouté au Cockpit.
7. État courrier : affichage de chargement tant qu’aucun aperçu autorisé n’a été reçu, puis état réel de cet aperçu. Pas d’annonce de cache avant réception.
8. Footer : « Clara est prête » uniquement après une réponse de dialogue réussie dans la page courante; état initial neutre. Ceci atteste la dernière réponse, pas une supervision continue ni la disponibilité de tous les connecteurs.
9. Google : liens distincts Documents et Agenda, contrat du hub #217 conservé. Microsoft : si la configuration manque, navigation HTML renvoyée au hub avec explication traduite; le contrat JSON 503, le refus 403, l’authentification et le parcours OAuth configuré restent inchangés. Aucun provisionnement dans ce refus.
10. Automatisations : GlassPanels existants et colonnes plus larges; aucun faux bouton d’activation ajouté.
11. Langue du dialogue : le parcours natif transmet au compositeur existant le mode conversation, distinct de la langue de l’interface. Les erreurs restent localisées. L’historique et les sources ne sont pas réécrits. Le comportement antérieur des autres appels au compositeur est conservé par défaut. La qualité linguistique d’un modèle réel reste non reçue.

12. Écart 29 % / 38 % reproduit par une fixture valide : trois vues Missions recalculaient 3/8 actions alors que le moteur stockait 29 %. Elles affichent maintenant le champ enregistré, tout en conservant le compte d’actions. Test positif/négatif des trois vues en cinq langues, sans modification des données ou du calcul métier.

## Qualification et limites

Code et tests conservés : `8bdc396ecafc98f76eb910ad8f5fa7919343a15a` (le commit documentaire final ne modifie pas le code).

Voir [validation.md](validation.md), [pages.csv](pages.csv), [i18n.csv](i18n.csv) et [captures.md](captures.md).

Les tests locaux utilisent Next.js réel, des routes natives réelles et PostgreSQL jetable. Les fournisseurs sont simulés; le test premier jour injecte les frontières fournisseur du handler mail existant. Aucune de ces preuves ne certifie Drive, IONOS, Microsoft, Make, Brevo, WeatherAPI, Twilio ou ElevenLabs en conditions réelles.

Le refus `NATIVE_DOCUMENT_REVISION_CONFLICT` protège la correspondance entre la version rattachée et la version réellement retournée par Drive (`src/lib/native/documents.ts`, `currentRights`). Il ne démontre pas un défaut OAuth. Aucun cas logiciel incorrect n’a été reproduit permettant de le supprimer ou de re-rattacher automatiquement une nouvelle révision. Une réception authentifiée doit identifier le document/version concernés, puis utiliser le parcours explicite existant de réinspection/rattachement si autorisé.

Le code `MICROSOFT_OAUTH_NOT_CONFIGURED` correspond à l’absence de `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` ou `MICROSOFT_REDIRECT_URI` dans le contexte serveur. Leurs valeurs distantes n’ont pas été inspectées. Aucun changement de configuration ou de consentement effectué.

Les cinq boîtes IONOS historiques restent un acquis; la vue affiche uniquement le registre et les messages autorisés réellement reçus. Une fixture vide ne prouve ni une panne des boîtes ni leur raccordement natif distant. Aucune recréation de compte, credential, délégation ou monitoring.

Le Hero est multimission **dans le projet explicitement autorisé**. Il ne constitue pas une agrégation globale de plusieurs clients/projets. Cette limite du moteur canonique est conservée plutôt que contournée par une session globale ou une sélection silencieuse. La salutation utilise le prénom fourni par la session; la fixture n’en fournit pas, donc aucun « Gildas » n’est inventé comme identité authentifiée.

La consultation financière Studio/Stripe n’est pas certifiée par ce lot. La carte existante reste informative; aucune vue de règlements ni nouvelle voie de paiement n’a été fabriquée. Les raccords historiques sont conservés et Studio inchangé.

Les réserves HTTP 503 historiques, le lint global et les alertes de dépendances précédemment documentées ne sont pas considérés résolus par cette réception UI.

## Preview et publication

Le réseau de l’environnement observé autorise Git HTTPS mais pas `api.github.com`; aucune capacité Vercel authentifiée n’est disponible ici. Cela ne signifie pas que les protections distantes sont absentes. Aucune demande de valeur secrète au propriétaire.

La branche est explicitement exclue des déploiements Git dans `vercel.json`; les autres exclusions et les crons Production sont inchangés. Le seul workflow modifié est une validation existante. Le workflow manuel de déploiement reste inchangé, `verify_only=true` par défaut et écritures REST désactivées.

Voir [preview-proposal.md](preview-proposal.md) pour l’opération ciblée à examiner avant toute configuration ou création de déploiement. **Aucune Preview ni réception fournisseur réelle attestée.**

## Retour arrière

Aucune migration ou réécriture des données. Avant merge/déploiement, abandonner la branche suffit à conserver le code déployé. Après une éventuelle livraison autorisée, revenir au déploiement précédent du même environnement, sans repointer une autre base ni effacer les nouveaux historiques; les changements sont compatibles avec les contrats de persistance conservés. Une réversion de code doit préserver les messages, missions et reçus créés depuis la réception.

## Décision

GO limité à la revue des corrections locales et de leurs preuves effectivement réussies. **NO-GO pour déclarer la réception Preview complète ou autoriser Production.** La Preview, sa configuration effective, les fournisseurs et les limites fonctionnelles explicites ci-dessus restent distincts des tests locaux.
