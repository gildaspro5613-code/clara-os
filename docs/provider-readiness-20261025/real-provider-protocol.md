# Recette réelle minimale — préparée, NON autorisée et NON exécutée

Ne pas utiliser ce document pour déclencher un fournisseur maintenant. Aucun nouveau
compte/service, webhook, consentement OAuth ou secret n’est à créer par défaut.
Réutiliser les accès du propriétaire et les connexions déjà fonctionnelles.

## Une préparation commune, puis des GO limités

1. Le propriétaire approuve séparément la publication et l’installation du SHA
   candidat dans **l’environnement de réception existant**, s’il n’y est pas encore.
   Cette mission ne les exécute pas. Confirmer l’URL et le SHA effectivement servis,
   la base autorisée, le rôle et les migrations présents par les contrôles existants,
   sans exporter de chaînes de connexion ni copier de credentials.
2. Se connecter avec l’identité réelle autorisée, puis sélectionner explicitement
   espace/client/projet/mission de test autorisés. Aucun owner fictif dans une base
   réelle, aucun rattachement par email/titre/default.
3. Choisir une seule fiche de preuve par opération : référence locale de test,
   SHA/URL, opérateur, scope canonique, heure UTC, identifiant durable/reçu,
   résultat observé, éventuel Journal et Cockpit. Ne pas conserver token, signed URL,
   contenu confidentiel, numéro complet ou copie de clé dans GitHub/ChatGPT.
4. Le propriétaire donne un **GO fournisseur/opération** précis. Une autorisation
   de lecture n’autorise pas l’envoi, une synchronisation CRM n’autorise pas Notify
   Team, une approbation de brouillon n’autorise pas une relance après incertitude.

| Ordre | Fournisseur / opération unique | Objet / effet externe | GO requis | Preuve attendue et arrêt/récupération |
|---|---|---|---|---|
| R1 | Google : consulter un calendrier existant explicitement sélectionné | Lecture de la fenêtre du jour, aucun événement/invitation créé | Lecture Agenda, calendrier et scope de test désignés | Comparer un événement autorisé connu avec le résultat ; vérifier contexte/reload/Cockpit. Si 401/403, conserver le refus ; ne pas réinitialiser OAuth sans cause démontrée. Une liste vide n’est pas une panne. |
| R2 | Drive : rattacher et analyser un document synthétique déjà placé dans un dossier autorisé | Métadonnées, téléchargement et éventuellement OpenAI ; rattachement/analyses persistés dans la base de réception autorisée | Lecture Drive + analyse OpenAI + écriture métier de réception, document désigné | Source/version exactes, contenu original, ambiguïtés, mission et Journal DOCUMENT_RECEIVED, refresh/reprise. Stop sur droits/version différents. Rejeu uniquement via l’opération durable existante ; ne pas faire un nouvel import arbitraire. |
| R3 | IONOS : une relève manuelle d’un dossier autorisé sur une boîte choisie | Connexion IMAP TLS/read-only et persistance chiffrée des nouveaux messages/cursor ; aucun SMTP | Lecture de la boîte/dossier et écritures métier sur base autorisée | Examiner le cursor/UIDVALIDITY et les messages dans Messagerie ; aperçu Cockpit explicitement enregistré, pas toujours frais. Ne pas activer le scheduler global. Si panne, conserver cursor et erreur ; aucun renvoi/SMTP. Pour les cinq boîtes, les tester séparément sous leurs autorités existantes. |
| R4 | IONOS : préparer, enregistrer, soumettre, relire et approuver UN brouillon | OpenAI réel et écritures SQL ; **zéro envoi** | Préparation OpenAI et approbation propriétaire exacte, sujet/message/boîte autorisés | Expéditeur de la boîte, tous destinataires, langue et révision relus. Attendre MAIL_DRAFT_SAVED / MAIL_SEND_REQUESTED / MAIL_APPROVED, puis état enregistré dans Cockpit. Modifier un champ invalide l’approbation. Stop avant « Envoyer ». Un modèle ne peut pas choisir les droits ni l’identité. |
| R5 | Make 7294540 : synchronisation Brevo contrôlée | Création/mise à jour d’UN contact de test autorisé ; aucune campagne/notification | **Bloqué jusqu’au raccord natif et aux preuves d’autorité/reçu décrits ci-dessous**, puis GO unique avec adresse contrôlée choisie par le propriétaire | Entrées workspaceId/email/source, scénario exact, contactId retourné et référence OS persistée ; vérifier le contact dans Brevo et Journal/Cockpit. Sans réponse : état non confirmé, vérifier Make/Brevo en lecture, aucun second POST. Ne jamais fournir une clé produit externe pour contourner le fence natif. |
| R6 | Twilio/ElevenLabs : un échange transport contrôlé | Session/microphone OU un appel unique vers le propriétaire, consommation fournisseur possible | GO session vocale/microphone ou GO appel exact, destination choisie par propriétaire ; pas de GO implicite aux deux | Le transport historique est conservé. Une vérification API propriétaire peut attester le transport, **pas** le couplage mission/Journal absent. La page Téléphonie reste fermée ; ne pas l’ouvrir par console comme contournement. Avant recette UI complète, recevoir le raccord d’autorité/reçu décrit ci-dessous. Ne jamais relancer après timeout sans vérifier l’historique fournisseur. |

R1–R4 sont des recettes préparées du socle existant, après autorisation de l’instance
et des accès réels. Elles ne sont pas des résultats de cette mission. R5/R6 ne sont
**pas** présentés comme exécutables de bout en bout depuis l’interface actuelle.

## Deux réserves de raccord, et non deux pannes fournisseur

**Make/Brevo.** Le parcours natif est explicitement clos. Le client envoie
`{scenarioKey, payload, source:"clara-os"}` ; la présence des champs Make déclarés
par le propriétaire ne prouve pas leur mapping dans ce wrapper. L’opérateur peut
confirmer dans les scénarios existants, sans modification, quel module lit
`payload.workspaceId/email/source`, et comment le contactId est retourné.
Ne publier ni URL de webhook ni header secret. Aucun mapping n’est inventé.

Le raccord restant doit réutiliser le contexte natif vérifié, les approbations
existantes et les reçus durables existants pour l’opération exacte. Le connecteur
ne peut pas être ouvert par simple suppression de nativeOperationFence : les
identifiants canoniques, la révocation, la reprise et le lien contactId → contact OS
restent à démontrer. Notify Team 7291299 reste exclu de R5 ; son destinataire/contenu/
mission nécessitent une approbation explicite et ne contournent jamais IONOS.

**Voix.** Les routes existantes protègent le workspace configuré avec
`connections:manage`. Elles ne résolvent pas ensemble mission/session/projet et ne
persistent pas un reçu de tentative avec idempotence/Journal pour l’appel. La
réactivation UI doit passer par les autorités et registres existants, sans changer
le transport fournisseur ni injecter des identifiants de mission depuis un navigateur
comme preuve d’autorité. Une session signée ou un callSid ne prouve pas la fin de
l’appel, sa transcription ni sa persistance dans Clara. Préserver le transport
historique ; qualifier séparément la contextualisation et la clôture durable.

## SMTP : essai distinct, pas inclus dans la première recette

L’autonomie reste inactive pour les cinq boîtes. support@ et gildas@ exigent toujours
le propriétaire. Tout engagement personnalisé/financier/contractuel/confidentiel
requiert approbation. Les dépendances corrigées lèvent les avis connus, pas ces règles.

Un éventuel GO SMTP doit désigner la boîte, le destinataire contrôlé, l’opération,
le contenu figé et la version approuvée. Une seule tentative ; conserver le reçu.
`sent` signifie **SMTP accepté**, jamais livraison finale. Si `processing`/`uncertain`,
ne pas cliquer de nouveau ni restaurer une base ancienne : contrôler l’historique
fournisseur et réconcilier d’abord. Ne pas supprimer les reçus/approbations/cursors.

## Fin de recette et arrêt

Revenir au Journal et au Cockpit pour chaque opération réellement tracée. Inscrire
« non tracé » si un maillon n’existe pas ; ne pas inventer d’événement. Relire les
états approuvés/acceptés/incertains et l’Agenda, puis actualiser/reprendre la session.
Arrêter seulement le service/opération de test autorisé, sans réinitialiser les
connexions existantes. Ne supprimer aucune donnée/histoire réelle. Retenir les
opérations incertaines ; aucune restauration après effet externe sans analyse du
risque de doublons et conservation des clés/reçus.

Si la politique Recette de l’instance refuse un flux réel, conserver le refus :
ne pas désactiver son garde ni utiliser Production comme repli. Relever uniquement
le code non sensible et faire approuver l’ouverture ciblée correspondante.
