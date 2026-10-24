# Réception signatures IONOS — consolidation du 24 octobre 2026

## Preuves exécutées par l'opérateur (Codespaces)
- 12/12 tests ciblés PASS (après correction du champ `address` et de l'assertion de langue).
- `npx tsc --noEmit` PASS (sortie vide).
- `CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/native-mail-postgres.test.ts` : **1 PASS, 0 FAIL**, 65,15 s. Base PostgreSQL réelle jetable, transport SMTP simulé. Reprise du conteneur de test initialement arrêté.
- CI GitHub `Production P0 validation` : SUCCESS sur SHA `e42fd3595c4aa567c877223d3250a79bb4342ae8`, run `40084531989`. Ne pas extrapoler ce workflow à la recette PostgreSQL.

## Comportement attesté
- Préparation de Clara avec langue déclarée EN → texte de réponse + signature `Digital collaborator` + adresse `clara@melodie.digital` dans le brouillon.
- Suite native PostgreSQL : autorités séparées, missions/bindings, chiffrement/révision, soumission/instantané, approbation propriétaire, tentative SMTP simulée à usage unique, révocation, restauration.
- Aucun fournisseur IONOS sollicité, aucun email externe envoyé ; aucun merge ou déploiement.

## Réserves encore ouvertes
1. **Synchronisation inter-dépôts** : source officielle `melodie-digital-site`, PR #21, fichier `email/signatures/identities.i18n.json`. OS possède un instantané **identique** à celui vérifié au moment de la présente réception (source blob SHA `7e9c8764b1f24526949fe03d2a740dd0645cd419`). Nouveau script read-only `node scripts/check-mail-signature-source.mjs`, nécessite accès GitHub en lecture. Ce contrôle **détecte la dérive**, il ne déploie pas les changements ; pas de synchronisation automatique opérationnelle tant que le déclenchement inter-dépôts et l'approbation ne sont pas certifiés.
2. **Langue réellement rédigée** : `language` vient du même modèle génératif que `body`. Valeur manquante/invalide rejetée, mais la concordance sémantique réelle n'est **pas** attestée indépendamment. Un test de qualification illustre cette limite. Ne pas annoncer validation linguistique automatique.
3. **HTML** : 25 signatures HTML sont générables, mais `MailEnvelope` IONOS et `sendMail` travaillent actuellement en `text/plain`. Rendus HTML à qualifier en clients email réels, et contrat MIME multipart à concevoir/tester séparément, avec snapshot durable et approbation sur le contenu exact. **Ne pas injecter `html` dans le transport actuel**.

## Résultats complémentaires (en attente d'exécution)
`node --import tsx --test src/tests/native-mail-signature-qualification.test.ts`
`node scripts/check-mail-signature-source.mjs` (avec lecture source autorisée)
`npx tsc --noEmit`

**Verdict** : GO technique limité aux signatures textuelles en isolation, **NO-GO HTML envoyé, NO-GO synchronisation automatique, NO-GO Production**. PR #207 Draft empilée sur #199. Le site PR #21 est indépendant et reste en Draft.

## Complément PR #207 — contrôles finaux (non réceptionnés à ce stade)
- PostgreSQL multipart approuvé ↔ transport simulé : **PASS opérateur**, 1/1, 64,4 s sur commit `d727cc7` ; assertions de stricte égalité texte et HTML intégrées.
- Synchronisation : `node scripts/check-mail-signature-source.mjs` détecte les dérives (lecture seule). Une mise à jour locale n'est permise qu'avec `SIGNATURE_SOURCE_SYNC_APPROVED=yes node scripts/check-mail-signature-source.mjs --sync-local` ; schéma et 5 expéditeurs vérifiés, diff Git puis PR Draft et approbation humaine obligatoires. Aucune propagation automatique, aucun déploiement. L'accès GitHub au dépôt source doit être vérifié lors de la recette.
- Langue : `verifyReplyLanguage` constitue une seconde vérification lexicale déterministe avant sauvegarde et rejette des contradictions évidentes entre corps et métadonnées. Messages ambigus non classifiés : **ce n'est pas un détecteur linguistique exhaustif**. Une qualification linguistique réelle sur corpus varié reste nécessaire avant certification complète.
- Tests ajoutés : `src/tests/native-mail-language-source-gates.test.ts`. **À exécuter** en Codespaces avant GO final : tests ciblés, TypeScript, contrôle source, recette PostgreSQL.
