# Captures et comparaison

Toutes les données affichées sont **synthétiques** et persistées dans PostgreSQL jetable; fournisseurs simulés. Ces URL locales ne sont pas une Preview Vercel, et les viewports Chromium ne certifient pas Safari ou des appareils physiques.

La référence historique est le **code architectural sans portrait `fb2072c` confirmé par le propriétaire**. Aucune capture runtime de ce commit n’est inventée. L’état précédent ci-dessous est celui de la réception `11dcbad` (#218), pas une capture de Production prise aujourd’hui. Les jeux de données et fils sélectionnés diffèrent : comparaison ergonomique, pas identité pixel à pixel.

| Format | Interface reçue précédemment | Restauration finale, 2 missions |
|---|---|---|
| Desktop 1440×1000 | [Avant](evidence/previous-interface-11dcbad/cockpit-desktop.png) | [Après](evidence/restored-hero/cockpit-fr-desktop.png) |
| Tablette 768×1024 | [Avant](evidence/previous-interface-11dcbad/cockpit-tablet.png) | [Après](evidence/restored-hero/cockpit-fr-tablet.png) |
| Mobile 390×844 | [Avant](evidence/previous-interface-11dcbad/cockpit-mobile.png) | [Après](evidence/restored-hero/cockpit-fr-mobile.png) |

- [Cockpit final et conversations sélectionnables](evidence/restored-pages/cockpit-desktop.png)
- [Clara desktop](evidence/restored-pages/clara-desktop.png), [tablette](evidence/restored-pages/clara-tablet.png), [mobile](evidence/restored-pages/clara-mobile.png)
- [Conversations](evidence/restored-pages/conversations-desktop.png), [mobile](evidence/restored-pages/conversations-mobile.png)
- [Missions](evidence/restored-pages/missions-desktop.png), [Contacts](evidence/restored-pages/contacts-desktop.png)
- [Documents](evidence/restored-pages/documents-desktop.png), [mobile](evidence/restored-pages/documents-mobile.png)
- [Messagerie](evidence/restored-pages/messagerie-desktop.png), [Agenda](evidence/restored-pages/agenda-desktop.png)
- [Brain](evidence/restored-pages/brain-desktop.png), [Journal](evidence/restored-pages/journal-desktop.png)
- [Automatisations](evidence/restored-pages/automatisations-desktop.png), [Connexions](evidence/restored-pages/connexions-desktop.png), [Téléphonie](evidence/restored-pages/telephonie-desktop.png)
- Les quinze images `evidence/restored-hero/cockpit-{fr,en,es,de,it}-{desktop,tablet,mobile}.png` suivent les réponses HTTP des panneaux avant capture; pas un état de chargement présenté comme terminé.

Les autres fichiers `pages-6bdfad9` sont des étapes intermédiaires conservées, **pas** les captures finales du Hero. Les matrices JSON contiennent la couverture complète; un scénario agrégé n’est pas présenté comme 91 tests distincts. Les limites du hook de police local sont précisées dans `validation.md`.
