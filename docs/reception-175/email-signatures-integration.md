# Raccord des signatures Mélodie Digital — lot A en isolation

Référence graphique officielle : `gildaspro5613-code/melodie-digital-site`, PR #21 (Draft).

## Réalisé
- Résolveur pur `src/lib/native/mail/signatures.ts` : cinq adresses connues, cinq langues.
- Correspondance stricte sur l'adresse de boîte ; inconnue = `null`, jamais de signature déduite de l'objet d'un email.
- Restitution HTML (logo officiel) + texte brut. Aucune action réseau, donnée de contact ou secret.
- Aucune altération des routes `/api/native/mail`, de `NativeMailPanel`, de la persistance brouillon ou du chemin SMTP.

## À réceptionner avant raccordement opérationnel
1. Confirmer la PR graphique #21 et le registre d'établissements final. Cette première version OS utilise uniquement Paris ; prévoir une synchronisation testée du registre pour éviter toute divergence.
2. Examiner le contrat de stockage des brouillons et l'enveloppe de soumission : la route actuelle reçoit un `body` texte. Ne pas introduire du HTML dans un champ interprété comme texte.
3. Raccorder la signature à l'identité réellement autorisée, au moment de la **préparation**, en produisant une version text/plain et une version HTML cohérentes. Aucun ajout silencieux aux brouillons persistés ni duplication à chaque réédition.
4. Réceptionner la révision du brouillon, le reçu idempotent, la validation propriétaire, la révocation, le journal et la reprise après redémarrage.
5. Tester les cinq langues, les cinq boîtes, les inconnues, les clients email bloquant les images et les substitutions d'établissement.
6. Faire tourner les suites ciblées sur la branche intégrée contenant la chaîne IONOS effective, puis une recette SMTP/IMAP explicitement autorisée et sans destinataires externes.

## Gouvernance
**NO-GO merge/Production et NO-GO activation des signatures dans les envois.**
PR Draft isolée, sans Preview, SMTP, IONOS, Brevo, SQL ni secret fournisseur.
Ne pas fusionner dans `main` ou déployer tant que la lignée des PR OS en attente n'est pas reçue.
