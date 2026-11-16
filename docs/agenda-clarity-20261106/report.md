# Agenda — correction de présentation et sélection explicite

Base vérifiée : `c3d4a7365d5e2c33361b7c5bf2fbb4c38bbb61a9`, branche `delivery/clara-os-v1-20261025`. Branche corrective : `fix/agenda-operational-clarity-20261106`. Aucune intervention sur Make / #249.

## Diagnostic démontré et limites

Le compte Google enregistré, le compte choisi dans le fil et le calendrier autorisé sont trois états distincts. La page précédente renvoyait aux paramètres techniques, sans rendre directement visibles les deux sélections persistées.

| Situation | Preuve existante / reproduction isolée | Conclusion |
|---|---|---|
| Compte non choisi dans le fil | `nativeOperationFence`, `/api/calendar` : `NATIVE_GOOGLE_CONNECTION_REQUIRED` | Une autorisation enregistrée ne sélectionne pas automatiquement un compte. Le choix reste explicite. |
| Compte choisi, calendrier absent | `NATIVE_GOOGLE_CALENDAR_REQUIRED` ; `NativeGoogleWork.events()` vérifie également le calendrier lié | Sélectionner une ressource déjà autorisée ; aucun recours silencieux à `primary`. |
| Compte à reconnecter | État `RECONNECT_REQUIRED`, code `NATIVE_GOOGLE_REAUTH_REQUIRED` | La reconnexion existante conserve le connectionId et les scopes. Ne pas recréer le compte. |
| Scopes insuffisants | `NativeGoogleWork.scopes('calendar')`, `GOOGLE_CONSENT_REQUIRED` ; capacités `calendar=false` | Message spécifique sur la page Agenda. Ne pas déduire ce cas de la seule absence de calendrier. |
| Refus de droits | HTTP 403, contrôle canonique et de ressource | Aucun agenda vide ni succès apparent. |
| Session absente / expirée | Sans cookie : HTTP 401. Cookie expiré de fixture : refus 403 du garde natif | 401 propose la connexion Clara OS. Un refus natif 403 ne permet pas toujours de distinguer expiration, révocation et droits manquants : le refus est conservé, sans inventer sa cause. |
| Fournisseur inaccessible | Erreur 503 | Indisponibilité, jamais « aucun rendez-vous ». |

**Production : cause individuelle non certifiée.** Aucune session authentifiée du propriétaire, aucun accès SQL Production et aucun credential Google réel ne sont utilisés ici. Les captures et le code ne prouvent pas quels scopes ou sélections sont effectivement présents dans sa session. Aucun nouveau consentement recommandé sans cette vérification.

Sources examinées : `AgendaStage.tsx`, `NativeDocumentsPanel.tsx`, `NativeGoogleWorkPanel.tsx`, `google-work.ts`, `google-authority.ts`, `google-auth.ts`, `/api/calendar`, `/api/connections/google`, `/api/native/google/work`, `/api/native/runtime` et leurs tests existants.

## Correctif

- `AgendaStage.tsx` : rendez-vous, horaires début/fin, lieux, période consultée et accès au dialogue `/clara`. Les exemples sont des suggestions de texte, pas des boutons d’exécution ni des promesses d’accès fournisseur.
- Choix du compte et d’un calendrier **déjà autorisé**, par les commandes `select` existantes. Aucun identifiant technique affiché dans ces choix. Le nom du calendrier vérifié est visible ; les sélecteurs se replient lorsqu’il est déjà choisi. Droits `permissions.write`, `canManage`, capacités Calendar et appartenance à la liste retournée conditionnent les boutons.
- Si un calendrier n’est pas encore rattaché, l’accès aux contrôles existants est explicite. Son inspection/rattachement conserve les conditions natives (notamment mission et droits de gestion). Aucun calendrier ou mission créé automatiquement.
- Aujourd’hui / semaine civile / 30 prochains jours utilisent les bornes de l’API existante, en Europe/Paris. Pagination réutilisant `nextPageToken` ; réponses obsolètes ignorées lors d’un changement de période.
- Une seule section principale « Paramètres avancés », fermée par défaut, conserve les composants existants : Google, consentements, vérification des ressources, délégation, propositions et reprise. Leur chargement demeure différé. Aucune opération OAuth ou écriture déclenchée à l’ouverture.
- `calendar-window.ts` : calcul des périodes réutilisant le calcul des minuits Paris déjà présent. `calendar-read-state.ts` : distinction du consentement **limitée à Agenda**, contrat du Cockpit inchangé.
- Cinq fichiers `src/i18n/messages/{fr,en,es,de,it}/index.json` : traductions des seuls libellés concernés.
- Tests : `agenda-presentation.test.ts`, `agenda-presentation-browser.e2e.mjs`, nouveau `agenda-clarity-browser.e2e.mjs`. Les assertions de sécurité sont conservées ; seuls les horaires début/fin et le ciblage du bouton d’erreur sont adaptés au rendu.
- `vercel.json` : exclusion explicite de la seule branche corrective des déploiements Git ; aucun changement de configuration distante.

Aucun fichier d’API, SQL, OAuth, autorité, connecteur, Brain, Cockpit ou Clara Live modifié. Révisions, journaux, scopes, révocations, confirmations et absence d’invitation automatique restent régis par les moteurs existants.

## Réception

27 tests de sécurité/présentation PASS (aucun ignoré), TypeScript, lint ciblé et build optimisé Webpack PASS. Recette navigateur existante PASS ; nouvelle recette finale PASS (127 s, aucune annulation), sélection persistée après rechargement, 15 vues par version et sept états capturés. 49 captures conservées. Voir `results.txt` et `captures/*-results.json` pour les résultats effectifs. PostgreSQL réel **jetable local**, routes natives réelles, fournisseur Google simulé. Les écritures Google des tests de sécurité sont exclusivement simulées.

La première exécution de la recette étendue a été annulée à son budget total de 180 s ; ses captures supplémentaires ne constituaient pas un PASS. Cause : répétition de trois lectures de période dans chacune des 15 vues en parallèle de la suite SQL. Le test final conserve les contrôles de langues/formats, mais ne répète le même aller-retour de période qu’une fois ; aucune temporisation applicative, assertion de sécurité ou limite de test n’a été assouplie.

### Comparaison visuelle (données fictives)

| Format | Avant | Après | Rendez-vous après |
|---|---|---|---|
| Desktop | [capture](captures/before-fr-desktop.png) | [capture](captures/after-fr-desktop.png) | [capture](captures/after-events-desktop.png) |
| Tablette | [capture](captures/before-fr-tablet.png) | [capture](captures/after-fr-tablet.png) | [capture](captures/after-events-tablet.png) |
| Mobile | [capture](captures/before-fr-mobile.png) | [capture](captures/after-fr-mobile.png) | [capture](captures/after-events-mobile.png) |

Header, navigation et logo officiels conservés. Pas de logo de substitution.

## Certification et prochaine réception réelle

GO technique **isolé** ; validation visuelle finale réservée au propriétaire. Lecture Google Production et gestion via Clara : NON CERTIFIÉES par ces tests. Pour la réception réelle, utiliser la session habituelle : vérifier le contexte existant, choisir explicitement le compte actif, puis le calendrier déjà autorisé ; constater un événement connu et recharger. N’ouvrir la reconnexion/consentement que si le code et l’état de connexion le justifient. Si le calendrier nécessite un rattachement, utiliser la vérification et la validation natives existantes.

Aucun merge ni déploiement exécuté ou autorisé par ce rapport.
