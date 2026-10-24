# Première journée de réception — guide propriétaire

## Avant d’ouvrir

Ce guide prépare une réception ; il ne déclenche aucune opération. Aucun nouvel
URL ni déploiement de ce candidat n’a été créé. Utiliser uniquement une instance
explicitement autorisée, avec le SHA candidat vérifié, les migrations contrôlées
et une base isolée. Un ancien déploiement « Ready » ne prouve pas qu’il exécute ce code.

En isolation, utiliser les identités et données synthétiques du harnais existant.
Ne pas importer de données réelles ni copier une clé, un cookie, un jeton ou une
connexion Production. Pour une réception propriétaire réelle ultérieure : employer
son authentification autorisée existante, jamais une identité administrateur inventée.
Aucune valeur secrète à copier dans ChatGPT ou GitHub.

## Parcours

1. Ouvrir le Cockpit. Vérifier l’identité et le contexte affichés. Le Brief courant
   restitue la mission sélectionnée ; il ne certifie pas encore un classement global
   des cinq priorités. Une panne ou un résultat inconnu ne doit pas être annoncé résolu.
2. Choisir explicitement Espace → Client → Projet → Fil. Ne pas accepter un choix
   inféré du dernier nom de mission. En cas de refus, noter le code et le contexte,
   sans tenter une session globale ou un autre compte comme contournement.
3. Créer une mission fictive, ou sélectionner son ID exact. Deux titres identiques
   restent deux missions distinctes. Associer un contact autorisé explicitement.
   Avec un historique existant, le rattachement métier ne déplace pas la conversation :
   ouvrir un nouveau fil si le contrôle d’identité l’exige.
4. Demander à Clara l’état de cette mission. Vérifier les sources et distinguer faits,
   hypothèses, contradictions et informations manquantes. Une réponse simulée doit
   rester identifiée comme telle ; elle ne certifie pas la qualité d’un modèle réel.
5. Dans Documents, choisir la connexion et le document autorisés, revoir leur version
   et leur rattachement. Lire les deux sources synthétiques contradictoires, puis
   demander une synthèse sans résoudre automatiquement la contradiction.
6. Dans Messagerie, choisir une boîte autorisée et un message fictif. Vérifier le
   propriétaire, l’expéditeur, les destinataires et le contexte Mission/Contact.
   Préparer puis enregistrer le brouillon. Ne jamais envoyer vers une boîte réelle.
7. Revoir l’opération exacte : expéditeur, destinataires, sujet, corps, pièces jointes
   et version. Approuver seulement l’opération autorisée dans le simulateur.
   **Ne pas cliquer un envoi réel**. Une modification impose une nouvelle revue.
   Le scénario d’envoi simulé est réservé au harnais ; aucune autonomie n’est activée.
8. Ouvrir Journal. Retrouver les IDs de l’opération, de la Mission et du contexte.
   Distinguer préparation, approbation, tentative, SMTP accepté, échec et incertitude.
   Une opération incertaine est à rapprocher, pas à relancer aveuglément.
9. Dans Agenda, choisir explicitement la connexion et le calendrier autorisés. En
   réception simulée seulement, préparer l’échéance, revoir la proposition et confirmer
   l’écriture simulée. Ne jamais utiliser `primary` comme autorité implicite.
10. Actualiser, puis rouvrir le même fil/Mission par ID. Vérifier contact, documents,
    conversation et Journal. Choisir un second projet : aucun contexte du premier
    ne doit devenir actif. Revenir explicitement au premier projet pour reprendre.

## Capacités à ne pas activer dans cette réception

Pas d’envoi réel, appel sortant, session vocale fournisseur, exécution Make/Brevo,
notification d’équipe, commande Clara Live ou automation matérielle. Les connexions
réelles confirmées par le propriétaire ne sont pas reconfigurées pour ce guide.
Toute recette fournisseur réelle requiert une autorisation distincte et bornée.

Consigner les écarts dans la matrice A/B/C : page, étape, ID non sensible, code HTTP,
SHA et résultat observé. Ne pas joindre de cookie, credential, contenu confidentiel
ou capture contenant un secret. Ne pas transformer une absence de preuve en PASS.
