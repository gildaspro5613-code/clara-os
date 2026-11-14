# P0 — Configuration MagicQ durable et versionnée

Base OS vérifiée : Draft #206, `727e0d17ceed2d7635067f1e1ea570ed8d15e384`. Base Live : Draft #332, `579506f8c1c408f40bc81c9ba9d3c26249461c70`. Branches amont intactes. Branche OS `fix/magicq-config-revision`, branche Live `fix/magicq-config-recovery`. SHA livrés, dépendances et CI finale consignés dans les deux PR Draft.

## Cause racine

`ServerLightingConsoleConfigurationService.configure` réenregistrait une connexion MagicQ en fournissant systématiquement `fixtureChannels: {}`. L'upsert du repository écrasait donc `fixture_channels`. Il réactivait aussi implicitement la ligne de connexion via `connections.save`. Il n'existait ni précondition de révision ni lecture/reprise exposée à Live.

## Correctif OS

Réutilisation du service, du repository, du handler externe et des deux tables existantes. Aucun stockage de configuration parallèle. Le service MagicQ délègue à une seule transaction PostgreSQL, via le repository existant ; les autres connecteurs restent inchangés.

Migration **029**, additive et appliquée uniquement en bases jetables : colonnes `revision` et `content_sha256`, initialisation des empreintes historiques, fonctions SQL avec privilèges de l'appelant (`SECURITY INVOKER`), EXECUTE retiré à PUBLIC. Aucun nouveau droit Stage, aucune migration Production. La migration est reçue deux fois sur un enregistrement historique sans altérer ses colonnes préexistantes.

| Intention | Résultat |
|---|---|
| `fixtureChannels` absent | Mapping courant strictement conservé |
| Objet explicitement fourni + `confirmMapping: true` | Remplacement complet, validé, avec révision attendue |
| `null`, type incorrect, identifiant ambigu ou canal hors bornes | Refus |
| Objet vide sur mapping non vide | Refus : requiert une demande d'effacement distincte |
| `clearMapping: true` + confirmation, sans objet concurrent | Effacement complet explicite |
| Modification sans révision sur une connexion existante | HTTP 428 |
| Révision obsolète | HTTP 409, aucune écriture |
| Connexion inactive/révoquée | Refus ; aucune réactivation implicite |
| Contenu ou révision altérés sans empreinte concordante | Refus en lecture et sauvegarde |

Les canaux suivent les bornes MagicQ déjà présentes (1–32769), pas une déduction depuis une adresse DMX. L'empreinte lie hôte, port, mapping et révision ; elle détecte une altération incohérente, pas un administrateur capable de falsifier simultanément la base et ses empreintes.

La transaction verrouille la création par workspace puis la connexion/configuration, vérifie le statut et la révision, et effectue le commit atomique. Un identifiant de connexion étranger est refusé. Les lectures ne modifient pas les données. L'absence de migration/droits bloque le parcours ; aucun repli vers l'ancien upsert.

## Contrat et Live

Le POST externe existant accepte une opération `READ` pour MagicQ, scoped par le workspace issu du jeton produit, jamais par une valeur du navigateur. Le GET authentifié Live `/lighting/onboarding/configuration` reste OWNER-only et expose cette lecture avec `Cache-Control: no-store`. Le jeton produit reste serveur. Les champs absents ne sont pas convertis en objets vides ; les `null` explicites sont refusés.

L'assistant existant est conservé. Sélectionner MagicQ charge PostgreSQL ; le réseau et le mapping sont retrouvés après fermeture. La sauvegarde réseau transmet la révision et l'identifiant, sans transmettre le mapping. L'étape Mapping permet un remplacement/effacement explicitement confirmé. Un conflit garde la saisie et désactive la sauvegarde jusqu'au rechargement explicite. Les réponses tardives sont invalidées ; un retrait OWNER masque les données chargées. Libellés en FR/EN/ES/DE/IT. Aucune connexion physique revendiquée, aucune émission.

## Preuves et non-régression

- **22 tests OS réussis**, dont deux cas PostgreSQL réel (handlers/CAS/scope/révocation/intégrité/rôle limité et migration historique répétable), plus les contrats MagicQ/onboarding antérieurs.
- TypeScript et lint ciblé réussis, sans suppression de tests OS.
- **38 tests backend Live réussis** : intention absente/explicite, refus OWNER/authentification et contrats Runtime existants.
- **15 tests UI réussis** : reprise, paramètres transmis, conflits conservés, révocation, réponse tardive, remplacement/effacement confirmés et simulation fail-closed.
- Recette bilatérale : création UI → mapping confirmé → fermeture/réouverture → modification IP/port → conflits dans deux éditeurs et deux requêtes concurrentes → arrêt Live/OS → redémarrage du PostgreSQL dédié → reprise navigateur mobile. Mapping PostgreSQL comparé sous sa forme textuelle stricte ; configuration finale identique après reprise.
- Ancienne recette #332 conservée : son assertion du défaut devient une assertion de conservation ; ses refus, simulation et cinq langues restent vérifiés. Les artefacts historiques ne sont pas remplacés.

Le banc exécute les vrais handlers et PostgreSQL, avec adaptation du transport Neon HTTP à psql local, bases jetables et identités synthétiques. Aucun matériel, fournisseur cognitif ou connexion distante. Les suites globales OS ne sont pas déclarées reçues : les écarts antérieurs hors de ce périmètre restent distincts de la CI ciblée.

## Installation et limites

Appliquer/revoir 029 avant d'utiliser le nouveau contrat, avec un rôle de migration autorisé. Le rôle runtime doit disposer des droits explicites nécessaires sur les tables existantes et les deux fonctions ; aucune attribution globale n'est ajoutée. Un rôle sans CREATE ni privilèges superuser/bypass-RLS est testé. Aucune migration ni modification de rôle distant effectuée.

La garde OWNER à workspace produit unique reste une limite QA existante ; ce correctif ne prétend pas livrer l'onboarding multi-client, la programmation console ou un Connector Builder. GrandMA3/Titan ne sont pas développés dans ce chantier. La révision est un compteur de concurrence, pas une nouvelle interface d'historique/restauration.

**Décision : GO isolation uniquement si les deux recettes jointes et la CI ciblée passent au SHA livré. Aucun GO merge, matériel ou Production.** AntiPreview explicite sur les deux branches ; aucun déploiement autorisé.
