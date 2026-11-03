# Cockpit / Agenda — correction de présentation

Référence vérifiée : `delivery/clara-os-v1-20261025` pointait exactement sur `1f7b25b0cd8ff41c9f08c04089405662285bd1fa` à l'ouverture du chantier, puis au contrôle avant publication. Aucun commit ultérieur à préserver n'a été observé. Branche corrective créée depuis ce SHA : `fix/agenda-presentation-date-20261103`. Les captures avant proviennent d'un checkout détaché exact de cette référence, pas d'une ancienne PR.

## Changements limités

- **AgendaWidget** : remplace « Aujourd’hui » par le jour/date/mois/année, avec la même typographie, dans le panneau existant. Le lien ouvre `/agenda`, sans forcer l'ouverture de paramètres techniques. Aucun panneau déplacé ou recréé.
- **Date et fenêtre de lecture existante** : Intl et React déjà installés, fuseau Europe/Paris. Aucun réglage utilisateur de fuseau pour cette interface n'a été trouvé ; aucun nouveau réglage n'est ajouté. Minuit, journées de 23/25 heures et reprise d'un onglet sont traités. L'instantané serveur/hydratation est un tiret stable, remplacé après hydratation par la date locale métier, indépendamment de Google. Aucune suppression de warning d'hydratation. Au changement de jour, seule la lecture quotidienne existante est renouvelée ; aucun moteur de synchronisation, notification ou écriture ajouté.
- **AgendaStage** : titre/date et rendez-vous prioritaires. L'agenda vide n'est présenté qu'après `success: true` et un tableau d'événements reçu. Connexion absente, calendrier non choisi, reconnexion, session non authentifiée, refus et panne sont distingués avec les messages publics existants de #231. Les compteurs inconnus affichent un tiret, pas un faux zéro.
- **Paramètres avancés repliés** : réutilisent intégralement NativeDocumentsPanel et NativeGoogleWorkPanel. Ils ne sont montés qu'après ouverture explicite, puis conservent leur état quand la section est refermée. Les anciennes ancres de paramètres restent accessibles. Les actions d'état ouvrent clairement cette zone ; aucun consentement ou commande n'est déclenché automatiquement. Champs/boutons contraints à la largeur de l'Agenda, sans modification de ces composants partagés sur Documents.
- Traductions des libellés modifiés : FR/EN/ES/DE/IT. Les titres et lieux des événements ne sont pas traduits ou modifiés.

Fichiers applicatifs : `src/components/cockpit/widgets/agenda/AgendaWidget.tsx`, `src/modules/agenda/AgendaStage.tsx`, `calendar-window.ts`, `useBusinessDay.ts`, `calendar-read-state.ts`, et les cinq dictionnaires `src/i18n/messages/*/index.json`.

**Diff nul** pour routes OAuth/API, scopes, SQL/migrations, autorités, connecteurs, NativeDocumentsPanel, NativeGoogleWorkPanel, Header/Sidebar, Cockpit/Hero/Stage, moteurs et voix. IONOS reste inchangé. Seule protection de publication complémentaire : exclusion de la branche dans le garde `git.deploymentEnabled` existant ; aucun réglage Vercel distant modifié.

## Preuves visuelles

Toutes les captures utilisent des données fictives et PostgreSQL local ; pas de données Production ni de fournisseur réel.

| Vue | Avant (Google non sélectionné) | Après (même état) | Après (calendrier autorisé simulé) |
|---|---|---|---|
| Cockpit ordinateur | [Avant](captures/cockpit-no-google-desktop-before.png) | [Après](captures/cockpit-no-google-desktop-after.png) | [Date/événement](captures/cockpit-desktop-after.png) |
| Cockpit mobile | [Avant](captures/cockpit-no-google-mobile-before.png) | [Après](captures/cockpit-no-google-mobile-after.png) | [Date/événement](captures/cockpit-mobile-after.png) |
| Agenda ordinateur | [Avant](captures/agenda-no-google-desktop-before.png) | [Après](captures/agenda-no-google-desktop-after.png) | [Rendez-vous](captures/agenda-desktop-after.png) |
| Agenda mobile | [Avant](captures/agenda-no-google-mobile-before.png) | [Après](captures/agenda-no-google-mobile-after.png) | [Rendez-vous](captures/agenda-mobile-after.png) |

Cockpit en haut de page : [ordinateur](captures/cockpit-desktop-top-after.png), [mobile](captures/cockpit-mobile-top-after.png). Commandes réutilisées : [ordinateur](captures/advanced-desktop.png), [tablette](captures/advanced-tablet.png), [mobile](captures/advanced-mobile.png). Les autres captures et la [matrice](captures/results.json) couvrent également la tablette et les cinq langues.

## Qualification

Voir [résultats et commandes](results.txt). La nouvelle recette de dates/SSR est importée par les tests historiques déjà exécutés dans Native Authority. Les recettes techniques existantes ouvrent désormais la section avancée explicitement ; aucune assertion de permissions, de confirmation ou de rejeu n'est retirée. Aucun nouveau workflow.

Trois niveaux distincts : rendu/interaction vérifiés ; autorité et persistance PostgreSQL réelles en isolation ; fournisseur Google simulé. La non-régression existante vérifie la proposition, la confirmation humaine, le résultat incertain, la reprise et l'absence de double exécution. Les mutations de cette recette sont exclusivement fictives et déclenchées explicitement, à distinguer de zéro mutation automatique lors de l'ouverture des interfaces.

La vérification Mail confirme localement « Aucune boîte autorisée » sans simuler cinq boîtes. L'absence d'autorités IONOS Production demeure le constat fourni par le propriétaire, pas une nouvelle inspection distante. Aucun provisionnement, credential, IMAP, SMTP ou monitoring touché. La procédure #217 reste distincte.

**GO technique isolé pour revue.** Réception graphique finale du propriétaire attendue. Aucun merge, déploiement ni accès Neon Production ; aucune certification fournisseur Production déduite des simulations. L'état des CI et la publication de la PR doivent être confirmés séparément par les accès GitHub disponibles.
