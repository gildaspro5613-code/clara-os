# Reprise vocale OS — 21 novembre 2026

Correction locale réceptionnée : 35 tests PASS et TypeScript PASS. STT/TTS et navigateur simulés dans les tests ; aucun fournisseur réel appelé. Aucun build cloud relancé.

La voix reprend uniquement le reçu natif correspondant au même operationId, à la même session et au même texte. HTTP 202 autorise des lectures bornées du même reçu, pas une nouvelle génération. Une erreur réseau, une identité différente ou une sortie sans accusé final ne déclenche aucune synthèse. L'arrêt par bouton conserve le reçu. Seul le message correspondant retrouvé dans l'historique canonique peut être prononcé.

Brain, personnalité, contrats, permissions et PR Make #289 inchangés. Les exclusions AntiPreview de la branche vocale et de la Production actuelle sont conservées. Aucun workflow modifié. Publication avec `[skip ci]` ; aucune Actions payante autorisée.

Les fichiers perdus du 20 novembre ont été recherchés dans les emplacements persistants et les objets Git ; leur absence est consignée, sans prétendre retrouver leur ancien SHA. Les régressions sont reconstruites et exécutées à nouveau. Les premières tentatives ne sont pas comptées comme des PASS.

Le code, les régressions et ces preuves doivent être présents dans le même commit publié et vérifié sur GitHub. Le SHA exact est fourni dans le compte rendu de publication ; les liens doivent viser ce commit immuable. Un commit local dans `/tmp` reste éphémère avant cette vérification. L'accès aux fichiers distants est contrôlé avant d'annoncer leur conservation.

États distincts : travail local → commit Git enregistré → commit publié et vérifié ; aucune fusion ni aucun déploiement. La réception vocale réelle et sa dépense nécessitent un GO distinct.
