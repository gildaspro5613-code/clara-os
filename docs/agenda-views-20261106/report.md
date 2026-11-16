# Agenda final — vues natives de consultation

Base vérifiée : `1db19a36a6fbac8da4fa5fc46b4f8dd0273e70e2` (fusion #250), branche de livraison `delivery/clara-os-v1-20261025`. Branche corrective : `fix/agenda-calendar-views-20261106`.

## Livraison

- **Jour** : grille horaire, rendez-vous positionnés et chevauchements séparés.
- **Semaine** : sept jours du lundi au dimanche ; grille horaire et bande des journées entières / événements longs. Sur mobile, la grille défile horizontalement dans son panneau, sans débordement de la page.
- **Mois** : grille de semaines complètes, jours occupés identifiables, ouverture du jour ou des détails. Les dates de fin des journées entières restent exclusives dans les données Google et sont présentées par leur dernier jour inclus dans les détails.
- Aujourd’hui, Précédent, Suivant et détails accessibles au clavier ; fermeture par Échap ou bouton et retour du focus. Heures exactes et fuseau dans les détails. Lors du retour à l’heure d’hiver, deux occurrences de la même heure ne sont ni fusionnées ni perdues ; la grille reste une présentation en heures civiles.
- Pagination native conservée : tant qu’un jeton est retourné, une indication explicite signale une lecture partielle et permet de charger la suite. Un échec ne devient jamais un calendrier vide.
- Aucun sélecteur technique, compte numéroté, consentement, délégation, proposition ou formulaire de création dans Agenda. Le lien « Parler avec Clara » ouvre `/clara` ; aucune commande conversationnelle non certifiée n’est présentée comme exécutable.

## Administration préservée

Le même `NativeDocumentsPanel workspaceMode="agenda"` est accessible dans **Connexions → Administration Google Agenda**, replié par défaut et chargé à l’ouverture. Aucun moteur, adaptateur ou formulaire métier recopié.

L’entrée directe `/connexions#google-agenda-administration` ne monte pas le hub des autres fournisseurs. Le test complet a démontré que ce hub pouvait déclencher une initialisation globale de dépôt SQL sans rapport avec l’administration Google ; cette tentative a été bloquée par le garde de recette. Le correctif reste **présentation uniquement** : le hub général et les connecteurs ne sont pas modifiés, les gardes ne sont ni élargis ni désactivés. La recette finale exige toujours zéro tentative de chargeur global. Aucun correctif Microsoft ou Make n’est revendiqué.

## Compte et blocage Production

La liste native `/api/connections/google` fournit des identifiants, statuts, appartenance propriétaire et sélection courante ; elle ne fournit pas d’adresse Google attestée. L’interface ne transforme pas ces lignes en utilisateurs distincts, ne devine aucune adresse et ne nettoie aucune connexion. Seul le nom du calendrier retourné par les ressources autorisées est affiché, quand il est vérifié ; à défaut, le libellé neutre Google Agenda est conservé.

**La cause individuelle du blocage Production est NON ATTESTÉE dans cet environnement.** Aucun accès SQL Production, credential ou session authentifiée du propriétaire n’est disponible. Les scénarios suivants sont reproduits en isolation, sans les confondre :

| Réponse native | Signification conservée |
|---|---|
| `NATIVE_GOOGLE_CONNECTION_REQUIRED` | Pas de compte choisi dans le fil ; action vers la sélection existante dans Connexions. |
| `NATIVE_GOOGLE_CALENDAR_REQUIRED` | Pas de calendrier choisi ; instruction simple et lien vers son administration. |
| `NATIVE_GOOGLE_REAUTH_REQUIRED` | Compte existant à reconnecter ; pas de recréation ni révocation automatique. |
| `GOOGLE_CONSENT_REQUIRED` | Contrat de scopes natif non satisfait ; aucune nouvelle demande de consentement automatique. |
| HTTP 401 | Connexion Clara OS nécessaire. |
| HTTP 403 | Refus réel conservé. Un cookie expiré peut aussi recevoir un 403 sans raison publique plus précise ; ne pas l’interpréter comme une absence d’événements. |
| HTTP 503 | Lecture indisponible, jamais agenda vide. |

Limite exacte du connecteur existant : la lecture native vérifie actuellement `calendar.calendarlist.readonly` et `calendar.events` dans son profil Agenda. La présence éventuelle d’autres scopes Google ne doit pas être supposée équivalente ni déclencher une extension automatique. Les droits réels Production restent à vérifier avant toute proposition de consentement ; ce contrat n’est pas modifié ici.

L’unique preuve extérieure manquante pour identifier le refus actuel est le **statut HTTP et le code public de `/api/calendar` dans la session authentifiée concernée**, puis, si le code indique un consentement insuffisant, l’attestation des droits déjà enregistrés. Aucun cookie, jeton, contenu d’événement ou secret à transmettre.

## Fichiers et protections

- `src/modules/agenda/AgendaStage.tsx`, `calendar-presentation.css`, `calendar-view.ts` : présentation et calcul des plages/positions seulement, API `/api/calendar` existante.
- `GoogleAgendaAdministration.tsx` et deux pages `src/app/{agenda,connexions}/page.tsx` : styles et déplacement du composant natif.
- Cinq dictionnaires `src/i18n/messages/{fr,en,es,de,it}/index.json` : traduction des nouveaux libellés.
- Tests : `agenda-calendar-views.test.ts`, `agenda-presentation.test.ts`, `agenda-clarity-browser.e2e.mjs`, `agenda-presentation-browser.e2e.mjs` et deux helpers existants. La fixture HTTP Google représente désormais les intersections de périodes et les dates à la journée entière, au lieu de filtrer uniquement les débuts d’événements.
- `vercel.json` : exclusion explicite de la seule branche corrective des déploiements Git. Aucun workflow ou réglage Vercel distant modifié.

Aucun fichier Brain, OAuth, connecteur de Production, route API, fonction PostgreSQL, Make ou Clara Live modifié. Autorités, scopes, révocations, propositions, confirmations, journalisation et interdiction des invitations automatiques restent dans les mêmes moteurs natifs.

## Tests et preuves

PASS : suite Google/SQL de 33 tests, suite finale dates/SSR de 15 tests (recouvrement, ne pas additionner), neuf tests navigateur après correction dont 45 combinaisons langue/format/vue et le parcours Google complet déplacé dans Connexions. TypeScript, lint ciblé et build Next.js optimisé Webpack PASS. 75 captures conservées. La recette avant est aussi PASS sur la base exacte. Voir `results.txt` et `captures/after-results.json` pour les résultats finaux. Les suites de dates/SSR et de sécurité Google se recouvrent ; leurs compteurs ne sont pas additionnés artificiellement.

Le build utilise les polices Geist locales déjà disponibles via la fixture de construction existante, sans désactivation TLS. Les captures sont prises avec Chromium en formats desktop/tablette/mobile ; elles ne constituent pas un test physique Safari/iOS.

Les recettes utilisent PostgreSQL **réel, local et jetable**, les routes natives et les stores existants. Google est **simulé** ; les écritures de test du parcours d’administration ne quittent jamais cet environnement. Les tests positifs/négatifs, refus interutilisateurs/interprojets, révocation, confirmation exacte et reprise durable sont conservés.

| Format | Avant (#250) | Jour | Semaine | Mois |
|---|---|---|---|---|
| Desktop | [capture](captures/before-fr-desktop.png) | [capture](captures/after-fr-desktop-day.png) | [capture](captures/after-fr-desktop-week.png) | [capture](captures/after-fr-desktop-month.png) |
| Tablette | [capture](captures/before-fr-tablet.png) | [capture](captures/after-fr-tablet-day.png) | [capture](captures/after-fr-tablet-week.png) | [capture](captures/after-fr-tablet-month.png) |
| Mobile | [capture](captures/before-fr-mobile.png) | [capture](captures/after-fr-mobile-day.png) | [capture](captures/after-fr-mobile-week.png) | [capture](captures/after-fr-mobile-month.png) |

[Détails desktop](captures/after-details-desktop.png) · [Détails mobile](captures/after-details-mobile.png). Données exclusivement fictives. Les cinq langues sont contrôlées sur les trois formats.

## Décision

GO technique isolé : validations finales PASS. Validation visuelle propriétaire et lecture Google réelle restent distinctes. Le lien vers Clara est vérifié ; la gestion conversationnelle d’un rendez-vous réel n’est pas certifiée par ces simulations et n’a pas été modifiée.

Aucun merge, déploiement, migration, changement de droits ou donnée Production exécuté. Aucun nouveau chantier Recette.
