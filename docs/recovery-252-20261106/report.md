# Remise en exploitation ciblée — #252 — 6 novembre 2026

Base : `41fc59816cbe5d533ae91ac074865f587b9d00d3`, HEAD distant de `delivery/clara-os-v1-20261025` vérifié au démarrage. Le SHA effectivement servi par Vercel reste une attestation du propriétaire : aucun accès administratif Vercel/Neon ni session Production n'est disponible ici. Lecture du ticket GitHub refusée par l'API ; la mission fournie constitue le périmètre.

## État réconcilié

| Fonction | Implémentation et preuves historiques | Vérification actuelle | Blocage réel restant |
|---|---|---|---|
| Chat natif | `native/chat.ts`, SQL 017, PR #214/#221/#223 ; reçus et révocation concurrente | Trois demandes, historique transmis au rédacteur, récupération après réponse perdue, HTTP 202 et 502 : PostgreSQL et routes réels ; génération simulée | Réception GPT authentifiée Production |
| Continuité | Sessions canoniques, réservations et archives natives | Rechargement, rejeu sans doublon, abandon confirmé, refus de finalisation tardive | Réception propriétaire dans son fil existant |
| Missions/projets | PR #221 ; `docs/incidents/mission-consultation-20261031/` | Tests SQL de consultation et de révocation concurrente ; séparation des projets et absence de mission créée par consultation | Aucun défaut supplémentaire démontré |
| Studio commercial | Ingress `api/external/project-intake`, inbox durable, worker existant ; `docs/reception-175/lot-1-commercial-continuity.md` | Qualification et ingress testés ; persistance commerciale et isolation sur PostgreSQL local | Livraison depuis Studio réel non certifiée ici |
| Agenda | PR #231/#250/#251 ; autorité et sélection natives existantes | Code réconcilié ; recettes historiques réutilisées, aucun changement Google | Connexion et calendrier effectivement sélectionnés, scopes et réponse Calendar dans la session réelle non attestés |
| Drive | Sources documentaires sélectionnées et contrôles natifs existants | Code conservé ; preuves documentaires historiques réutilisées | Lecture d'un document autorisé puis restitution réelle à recevoir séparément |
| IONOS | Raccordement existant | Intact | Hors périmètre |

Les merges historiques correspondants sont présents dans l'historique de livraison, notamment #214, #217, #218, #220, #221, #223, #231, #244–#246, #250 et #251. La PR #224 a été consultée seulement : aucune reprise de ses modifications.

## Cause et correctif chat

**Reproduction avant** : après trois échanges, une réponse est persistée mais son acquittement réseau est perdu. Après rechargement, huit messages sont en base et le job est terminé ; le widget restaure `pending` depuis sessionStorage mais ne vérifie pas automatiquement le reçu. La saisie reste verrouillée (`before.json`, `before.png`). Ce scénario reproduit un blocage possible, sans affirmer qu'il explique chaque erreur Production.

**Correction** : le runtime ajoute `X-Clara-Operation-Completed: 1` seulement après retour de la transaction existante de finalisation ou lors d'un rejeu terminé. Le widget relit le même operationId de façon bornée (huit tentatives espacées), recharge l'historique autorisé puis acquitte le pending. Un HTTP 502 finalisé permet de poursuivre avec un message compréhensible, traduit dans les cinq langues. Un HTTP 202 ou une erreur sans preuve de finalisation conserve la protection et les commandes existantes de reprise/abandon.

Aucune réservation supprimée ou récupérée de force. Une répétition dont le premier appel n'aurait jamais atteint le serveur conserve la sémantique native habituelle ; un travail déjà réservé n'est pas exécuté par un second propriétaire. Aucune annulation automatique. Les contraintes SQL, les verrous de révocation, les ACL et les identités sont inchangés.

**Après** : trois tours/six messages, historique présent dans l'entrée réelle du rédacteur ; réponse perdue récupérée sans doublon ; tour 202 protégé puis récupéré après commit ; erreur fournisseur incomplète terminalisée ; reprise dans le même fil ; abandon explicite et refus d'un commit tardif ; changement de projet sans reprise du contexte précédent (`after.json`). Fournisseur de génération simulé, PostgreSQL et routes natives réels.

## Studio : réutilisation, pas reconstruction

L'ingress authentifie le produit, vérifie la provenance, persiste l'inbox avant son accusé 202 puis programme le worker existant. Le worker conserve le dispatch Clara et la session durable ; le rattachement natif reste soumis aux autorités existantes.

Deux tests obsolètes échouaient déjà sur la base inchangée : le harnais d'ingress attendait un dispatch synchrone au lieu de l'inbox, et un test imposait une approbation à une expertise préparatoire déjà autonome depuis `4116736f`. Seuls les tests ont été alignés, avec conservation de l'approbation des actions engageantes et ajout du refus de programmer le worker si la persistance échoue. Aucun code métier Studio modifié.

## Google : constat limité et prérequis exact

Le parcours existant de connexion choisit `/agenda` pour la capacité `agenda`, sinon `/documents`, y compris le parcours `reconnect`. Cette redirection explique un comportement possible ; aucun défaut OAuth n'est déduit ni corrigé arbitrairement. Une connexion enregistrée n'est ni une connexion sélectionnée ni une ressource autorisée. Les quatre enregistrements ne prouvent pas quatre identités distinctes.

La source Calendar du Brain ne contacte le fournisseur qu'après sélection native de la connexion et du calendrier. Les droits et révisions sont recontrôlés avant restitution. Le profil existant comporte `calendar.calendarlist.readonly` et `calendar.events` ; leur présence effective Production n'est pas vérifiable ici. Aucun nouveau consentement proposé sans preuve de manque de droits.

Pour terminer la réception réelle : dans la session du propriétaire, sélectionner la connexion et le calendrier existants, lire un rendez-vous connu, demander sa restitution à Clara puis préparer une proposition sans la confirmer. Vérifier séparément un document Drive autorisé et un refus de ressource étrangère. Si une étape échoue, seul son statut HTTP et son code public sont nécessaires au diagnostic ; ne transmettre ni cookies, jetons ni contenu privé. Aucune certification Google réelle dans ce rapport.

## Données et livraison

Aucune lecture métier Production, écriture distante, migration, modification de secret ou fournisseur. Le schéma Production n'a pas été relu ; les preuves historiques de migration 030 restent des attestations historiques, pas une nouvelle observation. Aucun besoin de migration identifié pour ce correctif.

Fichiers applicatifs : widget chat, runtime natif chat et cinq traductions. Autres changements : tests ciblés, preuves et désactivation explicite du déploiement automatique de cette branche dans `vercel.json`. Aucun changement de Brain, Cockpit graphique, connecteur, IONOS, voix ou Make.

Réception après autorisation distincte de livraison : reprendre un fil existant, poser trois questions successives, recharger et poursuivre ; contrôler le contenu et l'absence de doublons. Une vraie demande encore en cours doit rester protégée ; l'abandon demande toujours confirmation. Tester un autre projet sans réutiliser l'historique précédent.

Retour arrière : revenir au déploiement applicatif précédent effectivement identifié au moment de la livraison, sous GO distinct. Aucun rollback SQL nécessaire ; ne supprimer ni jobs, ni reçus, ni conversations pour revenir en arrière. La correction se retire par revert applicatif ciblé.

**GO pour réception isolée du correctif chat ; NO-GO pour déclarer la remise en exploitation complète ou déployer automatiquement.** La certification fournisseur réelle Google/Drive/Studio/GPT reste distincte des tests locaux.

## Résultats ciblés

21 tests PostgreSQL et 21 tests unitaires Studio PASS ; trois recettes navigateur HTTPS PASS. Build Next.js Webpack, TypeScript, lint ciblé et présence de la traduction terminale dans les cinq langues PASS. Voir `results.txt`, `before.json`, `after.json` et les captures : données exclusivement fictives de la base jetable. Les captures montrent le scénario de reprise et la séparation de contexte, sans nouvelle conception graphique. Le scénario de concurrence 202 utilise un writer natif réel avec une réponse contrôlée ; ce n'est pas une génération GPT réelle.
