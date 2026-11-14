# Phase B — contrat métier V1 compatible

Enveloppe inchangée clara.production.proposal.v1 : schema, project_id, preparation_id, rows[]. Chaque ligne conserve section, label, value, notes ; trois champs facultatifs responsible/date/time sont raccordés aux champs déjà présents de ProductionRow. Anciennes réponses valides inchangées. L'identité proposée n'est jamais une autorisation. Live garde aperçu, refus/acceptation, brouillon, CAS et sauvegarde explicite ; toutes les suggestions restent to_verify.

Sous le même budget de génération et sans appel supplémentaire, viser cinq lots opérationnels sourcés (pas cinq champs à remplir) :

1. constraints : synthèse technique, faits établis, contradictions et risques ; conséquences sur la faisabilité.
2. tasks : feuille de route priorisée, livrables/actions concrètes, dépendances, responsable attesté ou « à désigner », échéance attestée ou « à confirmer ».
3. timeline : préparation, load-in/montage, line check/balances, exploitation, démontage ; ordre conditionnel fondé sur les dépendances. Aucun horaire/durée inventé.
4. coordination : plateau/Structure, Light, Sound, Video, Production, personnel/logistique ; liens explicites entre contraintes et métiers. Ne pas déclarer un métier documenté si ses données manquent.
5. decisions : arbitrages, conséquences et conditions de validation.

value porte les propositions concrètes et conditionnelles ; notes cite les identifiants/chemins source, révision/page quand disponibles, statut confirmed/to_verify/missing/stale et distinction fait/hypothèse/réserve. Une disponibilité ou affectation proposée n'est jamais une réservation confirmée.

Si couverture partielle/truncated, annoncer dossier partiel et portée limitée ; données omises ≠ données inexistantes. Aucun dossier complet/certification, aucun calcul, capacité fabricant, disponibilité ou horaire inventé. Une réponse fournisseur incomplete/filtered/timeout ne devient jamais completed exploitable. La qualité métier se juge séparément du parseur JSON : relation source→contrainte→conséquence→action→dépendance→validation. Les tests simulés ne certifient pas cette qualité réelle.

Les champs facultatifs responsible (texte ≤300), date (date civile valide YYYY-MM-DD) et time (HH:mm) sont omis si non documentés. Live les conserve après acceptation sans confirmer leur statut. Les identités proposées, status, depends_on et autorisations ne sont jamais importés. Mise en service future : compatibilité Live avant génération OS des champs facultatifs ; aucun déploiement autorisé ici.
