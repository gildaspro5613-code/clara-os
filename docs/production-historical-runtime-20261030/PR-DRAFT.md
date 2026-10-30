Le Cockpit de la branche de livraison utilise un fond architectural et sa barre historique de raccourcis ne navigue pas. Cette préparation remet le Hero avec portrait, le GlassPanel original et la composition de main autour du runtime natif déjà consolidé, avec les données autorisées de mission, les liens réels et le dialogue durable existant.

Base runtime : adff3190863a9af07645091b740c2dffe202337d (delivery/clara-os-v1-20261025). Référence visuelle : main a4d865a3d4a307425c057e69ea2132c9e0361f00. Aucune reprise globale de #219. Aucun changement src/lib, API, HomePage ou migration SQL.

Le widget vocal est visible mais reste désactivé dans le contexte natif non certifié. Aucun fournisseur, autorité ou secret modifié. Le panneau courrier existant reste accessible sous le Hero, avec son autorité native.

Validation : 29 tests composants/autorité/récupération et 2 recettes HTTPS PASS ; 5 langues x 3 formats ; TypeScript, lint ciblé et build optimisé Webpack PASS. Les polices locales de fixture ne constituent pas une validation du build Turbopack distant. Les fournisseurs sont simulés ; aucune certification réelle déduite.

Rapport, 21 captures et résultats : docs/production-historical-runtime-20261030/.

Préparation uniquement : aucun merge, déploiement, migration distante ou opération fournisseur. Production NO-GO jusqu’à validation explicite.
