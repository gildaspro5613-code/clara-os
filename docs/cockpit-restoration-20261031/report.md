# Restauration historique du Cockpit — 31 octobre 2026

Base : PR #222, `dcdd76b5b53559147d59ba9e6dcaae96a18a2126`. Branche dédiée : `fix/historical-cockpit-restoration-20261031`. Cible : `delivery/clara-os-v1-20261025`. Dépendance explicite à #222 : ne pas fusionner cette préparation avant son intégration et la validation des CI.

## Comparaison et décision

Références examinées : `781976a3b53d6a8a53d31a892c33168af0b3b4f5`, `141648d51b9f3bd7173eeeecfd59d5c3b9fd9b48`, PR #218 (`docs/interface-finalization-20261027`), PR #220 (`docs/production-historical-runtime-20261030/cockpit-v2.md` et `v2-visual`), PR #221 intégrée par `fba152a6`, PR #222.

L'inventaire Git par fichier et empreinte est dans `reference-inventory.csv`. La composition Hero/Stage, Brief haut gauche, Agenda haut droite, voix bas gauche et mission bas droite de 781976a est déjà présente dans #220. Les panneaux en flux sur tablette/mobile et les limites de hauteur défilantes sur desktop sont des adaptations déjà reçues de #220 : aucune nouvelle variante. Le fond architectural, l'accueil issu de la preuve Google liée à la session, les GlassPanels, les widgets et leurs routes sont conservés, sans portrait ni contenus fictifs réintroduits.

L'écart effectivement corrigé est le bandeau de sélection natif affiché en permanence au-dessus du Hero. Sur le seul HomePage autorisé, il est désormais dans un élément details replié, sous son libellé traduit existant « Changer d'espace ou de projet ». Les formulaires, sélections et API restent identiques et accessibles à l'ouverture. Le contexte n'est ni supprimé ni remplacé. Les autres pages conservent leur présentation par défaut ; aucun moteur ou contrôle d'autorité n'est modifié.

Le Header compact et son accès Journal sont déjà rétablis dans la base. Son ancienne recherche de 781976a était un champ sans action. Le lien fonctionnel reçu vers `/documents#document-search` est conservé : aucun moteur de recherche global existant n'a été retrouvé. Il ne faut pas présenter cette recherche documentaire comme une recherche générale de toutes les données. Cette extension n'est pas implémentée dans cette restauration.

## Composants et raccordements réutilisés

| Élément | Source réutilisée / comportement | Preuve et limite |
|---|---|---|
| Header et menu #222 | Header.tsx et UserAccountMenu.tsx inchangés ; Journal, Documents, langue, profil et déconnexion existants | Hash identique à dcdd76b5 ; menu quatre entrées contrôlé dans 15 combinaisons |
| Hero / Stage / GlassPanel | Composants #220 et composition 781976a conservés | Captures, positions historiques et absence de portrait vérifiées |
| Accueil et Mission | readGoogleDisplayName, nativePage, loadMissions, contexte et session existants | PostgreSQL réel isolé, nom Google de fixture, mission autorisée, aucun nom de propriétaire inventé dans le produit |
| Clara–Brain–Missions #221 | Lecture native, projection des sources et transaction de finalisation inchangées | Tests de consultation et révocation concurrente ; génération simulée, pas de certification du fournisseur réel |
| Dialogue | ClaraChatWidget et historique durable existants | Consultation sans nouvelle mission, rechargement et reprise après perte d'acquittement |
| Messagerie | MailOverviewPanel, `/api/native/mail?action=overview`, lien `/messagerie` | Panneau déjà présent sous le Hero ; aperçu enregistré et fraîcheur non certifiée affichés honnêtement. Lecture/approbation/Journal vérifiés avec PostgreSQL et handlers réels, fournisseurs simulés |
| Agenda | AgendaPanel/AgendaWidget → `/api/calendar` natif existant | Autorité intacte ; indisponibilité affichée dans la fixture. Aucun compte Google Production testé |
| Météo | WeatherWidget → `/api/weather` existant | Absence de configuration fournisseur dans la fixture : état indisponible vérifié, aucune nouvelle clé ni appel fournisseur |
| Waze | WazeWidget → `/api/waze` et moteur de lien existants | Préparation locale réelle du lien, puis refus simulé 503 et état indisponible ; navigation externe bloquée dans le navigateur de test |
| Voix native | Widget historique conservé, toujours désactivé dans le scope natif | Aucune demande micro ni activation fournisseur |

## Réception et captures

- 22 tests ciblés : PASS, incluant autorité, compte, consultation des missions et révocation concurrente PostgreSQL.
- 3 recettes navigateur HTTPS : PASS — Cockpit cinq langues × trois formats, disponibilité/navigation/reprise, messagerie native.
- TypeScript : PASS ; lint ciblé : PASS ; build optimisé Webpack : PASS avec fixture locale des polices.
- Le premier lancement de tests PostgreSQL a précédé la disponibilité du conteneur ; reprise après `pg_isready=accepting connections`, puis 22/22 sans skip. Aucune assertion n'a été supprimée.
- La recette Cockpit vérifie le contexte fermé par défaut puis ouvert/refermé, le maintien de la mission, l'absence de chargeurs globaux et les refus interutilisateur/révocation.
- Aucune certification fournisseur réelle ou de Production n'est revendiquée.

[Desktop avant](before/fr-desktop.png) / [après](after/fr-desktop.png) ; [tablette avant](before/fr-tablet.png) / [après](after/fr-tablet.png) ; [mobile avant](before/fr-mobile.png) / [après](after/fr-mobile.png).

Les trois captures avant proviennent d'un build local isolé du SHA exact dcdd76b5, avec le même titre/objectif de mission fictive que la recette après. Les identifiants de sessions de test diffèrent ; il ne s'agit pas de données Production. Les 24 captures après couvrent FR/EN/ES/DE/IT, trois formats, widgets, voix désactivée et conversation reprise. Les références historiques #218/#220 sont conservées à leurs chemins existants ; elles ne sont pas présentées comme des captures actuelles.

Comparaison visuelle : le bandeau de contexte occupe avant une partie importante du premier écran au-dessus du Hero, particulièrement sur mobile. Après, le même Hero et les mêmes widgets sont visibles sous un accès de sélection replié. Aucun changement libre des couleurs, de la composition ou des composants graphiques. Les captures desktop/mobile ont été inspectées ; la validation artistique finale reste au propriétaire.

## Fichiers modifiés

- `src/app/page.tsx` : option compacte sur le seul Cockpit, à l'intérieur du nativePage existant.
- `src/components/layout/MainLayout.tsx` : option de présentation facultative, défaut inchangé pour les autres pages.
- `src/components/native/NativeScopeSelector.tsx` : enveloppe repliable ; contenu, lectures et commandes inchangés.
- `src/tests/helpers/native-ui-disclosures.mjs` : ouverture explicite de l'enveloppe dans les tests qui manipulent les sélections.
- `src/tests/historical-production-cockpit-browser.e2e.mjs` : contrôles de l'enveloppe, menu #222, météo/Waze et captures existantes réutilisées.
- Ce dossier : inventaire, rapport, résultats, captures.

Aucun changement de Header.tsx, UserAccountMenu.tsx, Hero, GlassPanel, widgets, lib/runtime, API, contrats, ACL, migrations, données ou connecteurs. Aucun changement de page hors HomePage. Aucun nouvel environnement distant créé.

## Décision

GO technique en isolation pour la restauration du parcours existant. Validation graphique propriétaire et CI distante nécessaires avant toute intégration. La recherche générale transversale n'est pas disponible ; seul le parcours documentaire existant est livré. Les fournisseurs et la voix native ne sont pas certifiés par cette recette et aucune autorité n'est activée. Aucun merge, migration ou déploiement autorisé/exécuté.
