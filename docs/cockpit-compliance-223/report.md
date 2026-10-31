# PR #223 — Mise en conformité de la composition

Base : `6ee8d98d8feb06a976152802c15ed6b817d4b88e`. Même branche `fix/historical-cockpit-restoration-20261031`, même PR #223. Cette réception remplace la composition décrite dans le rapport précédent ; les preuves antérieures restent conservées.

## Références relues avant modification

- PR #218 : `adff3190863a9af07645091b740c2dffe202337d`, `src/components/cockpit/Stage.tsx`, et `docs/interface-finalization-20261027/README.md`. Stage importait et rendait déjà MailOverviewPanel dans le Hero, avec une variante mobile en flux.
- PR #220 : `docs/production-historical-runtime-20261030/cockpit-v2.md`, Stage, Hero, BriefPanel, TasksPanel et CockpitWidgets. Les composants et leurs ancrages sont réutilisés ; aucun GlassPanel n'est reconstruit.
- #222 : Header et UserAccountMenu sont identiques à la base approuvée ; aucune modification de leurs traductions ou mécanismes.
- #221 : aucun fichier de runtime, Brain, autorité, SQL, API ou contrat n'est modifié.

## Avant / après — décisions du propriétaire

| Élément | Avant, SHA 6ee8d98d | Après |
|---|---|---|
| Sous le Header | Enveloppe repliable et sélecteur natif | Aucun sélecteur ni enveloppe dans le rendu du Cockpit |
| Hero haut droite | AgendaPanel | MailOverviewPanel existant, aux ancrages existants haut/droite ; en flux sur mobile |
| Messagerie sous le Hero | Aperçu en doublon de destination | Retiré de CockpitWidgets ; rendu exclusivement dans le Hero |
| Agenda | Panneau dans le Hero et widget sous le Hero | Aucun panneau Agenda dans le Hero ; AgendaWidget, composants, moteur, page et accès Sidebar conservés |
| Barre sous le Hero | CockpitActionBar, six raccourcis | Aucun rendu de cette barre ; composant et destinations existantes conservés |
| Compte et Header | Menu Mélodie Digital #222 | Strictement inchangés |
| Contexte de Clara | Autorité/cookie/session natifs existants | Identiques ; suppression du sélecteur visuel uniquement |

Comparaison réelle du Cockpit complet :

- Desktop [avant](../cockpit-restoration-20261031/after/fr-desktop.png) / [après](after/fr-desktop.png).
- Mobile [avant](../cockpit-restoration-20261031/after/fr-mobile.png) / [après](after/fr-mobile.png).
- Tablette [avant](../cockpit-restoration-20261031/after/fr-tablet.png) / [après](after/fr-tablet.png).
- Les captures `*-widgets.png` et `*-conversation.png` complètent le contrôle sous le Hero. Les vues FR/EN/ES/DE/IT sont conservées dans `after/`.

Les captures « avant » sont les preuves réelles conservées de 6ee8d98d, pas une reconstitution ni la nouvelle référence graphique. Données fictives de test, jamais des données Production. La validation graphique finale appartient au propriétaire.

## Preuves fonctionnelles

Le test navigateur vérifie l'absence des sélecteurs, de leur enveloppe, du panneau Agenda dans le Hero et de la barre de raccourcis. Il vérifie un unique panneau Messagerie visible dans le Hero, avec ses liens `/messagerie` (les opérations enregistrées peuvent ajouter plusieurs liens légitimes), l'absence de doublon sous celui-ci et les destinations Agenda/Missions dans la Sidebar.

Un appel authentifié réel à `/api/native/runtime`, après ces suppressions visuelles, retourne exactement le workspace `w`, client `c1`, projet `p1` et identifiant de fil créés par la fixture, la permission de lecture et la mission autorisée. Le dialogue Clara retourne 200, conserve sa conversation après rechargement et ne crée pas de mission sur consultation. Les refus interutilisateur et après révocation restent testés.

Messagerie : le composant original et `/api/native/mail?action=overview` restent inchangés. La recette utilise les vrais handlers, les services et PostgreSQL jetable avec fournisseurs simulés : une boîte autorisée est affichée dans le Hero ; un retour 503 affiche « Aperçu du courrier indisponible », sans « Aucune boîte autorisée » ; le lien ouvre réellement `/messagerie`. Aucun message n'est fabriqué par le composant et aucune indisponibilité n'est convertie en vide. L'aperçu enregistré reste signalé comme non attesté en fraîcheur.

Les tests de layout commun conservent les vérifications des contextes sur toutes les autres pages et imposent leur absence uniquement sur `/`. Aucun contrôle de sécurité n'est supprimé. Le garde `nativePage` continue de s'exécuter avant HomePage/Cockpit : l'option hideContext ne participe pas à l'autorisation.

## Fichiers modifiés

- `src/app/page.tsx` : demande l'absence du sélecteur visuel uniquement pour le Cockpit autorisé.
- `src/components/layout/MainLayout.tsx` : option hideContext ; comportement par défaut des autres pages conservé.
- `src/components/cockpit/Stage.tsx` : MailOverviewPanel à la place d'AgendaPanel, sans autre composition libre.
- `src/components/cockpit/widgets/CockpitWidgets.tsx` : retrait du rendu CockpitActionBar et de l'aperçu mail déplacé.
- `src/tests/historical-production-cockpit-browser.e2e.mjs`, `src/tests/native-mail-browser.e2e.mjs`, `src/tests/interface-finalization-browser.e2e.mjs` : assertions de composition, de contexte et de messagerie adaptées/complétées.
- Ce dossier : captures et résultats.

## Limites

PostgreSQL et runtime applicatif réels en isolation ; générations et fournisseurs mail simulés. Aucun essai fournisseur réel ou certification Production. Voix native toujours désactivée. Aucun changement d'ACL, d'API, de route, de base ou de page métier. Aucun merge ni déploiement. L'intégration reste dépendante de #222 et des CI validées.

Les résultats exacts des contrôles locaux sont conservés dans results.txt ; ne pas les assimiler aux CI distantes.

## Validation locale

- 22 tests ciblés PASS : compte, invariants historiques, autorité native, consultation des missions et concurrence de révocation PostgreSQL.
- 3 recettes navigateur HTTPS PASS : composition du Cockpit (5 langues × 3 formats), mail natif, non-régression des 13 pages du layout partagé.
- TypeScript, lint ciblé et build optimisé Webpack PASS (polices locales de test).
- Aucun chargeur SQL global observé dans la fixture. Tous les fournisseurs métier sont simulés ou non sollicités ; PostgreSQL et les services applicatifs sont réels.

Composition contrôlée point par point en isolation. La validation visuelle finale du propriétaire et les CI distantes restent distinctes de ces résultats ; aucun GO de merge ou de déploiement n'en découle.
