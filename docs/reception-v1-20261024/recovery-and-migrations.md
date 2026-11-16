# Migrations, sauvegarde et récupération

Aucune base distante interrogée ou modifiée. La liste et les empreintes du candidat
figurent dans `migrations.json`. Aucun rôle applicatif n’est élevé pour cette mission.

## Ordre et dépendances

- Authentification : 001 → 002 → 003 (transactions de connexion).
- Les opérations documentaires/événements génériques conservent 004–007 et le registre
  canonique 008 ; l’archivage conserve 009 → 010.
- Cœur natif : 012 → 013 → 014 ; documents Google 015 ; courrier 016 ; conversations
  et reçus durables 017 ; pagination 018 ; contacts 019 ; Agenda/Drive 020 ; cinq
  boîtes 021 ; autorité de surveillance 022 → runtime de service 023.
- Rattachement tardif Mission/Contact 025 après le runtime antérieur ; continuité
  documentaire 026 après les définitions antérieures ; réparation 028 après 026.
- 011 n’existe pas ici. 024 (voix) et 027 (Stage) sont des travaux distincts, non
  intégrés au candidat V1 ; ne pas inventer de script pour combler la numérotation.
  Une base ayant d’autres branches appliquées nécessite une comparaison de schéma.

## Défaut corrigé

L’ancienne 026 remplaçait la contrainte `job_kind` en retirant `native-google` de 020.
La préparation Agenda/Drive échouait avant handoff fournisseur avec une violation
CHECK, rendue `INVALID_REGISTRY_REQUEST`. La 026 corrigée conserve les quatre
familles déjà existantes. La **028** répare les bases qui ont déjà reçu l’ancienne
026, sans nouvelle table ni backfill. Inconnus toujours refusés, aucun historique
supprimé, aucune fonction d’autorité élargie et aucun GRANT.

Le DROP/ADD de contrainte reste dans une transaction ; les verrous DDL sérialisent
avec les écritures. Prévoir une fenêtre et une stratégie d’arrêt si le verrou ne
peut pas être obtenu. Échec = rollback, pas de poursuite vers le script suivant.
La 028 requiert la propriété/droits du rôle de migration sur la table. Aucun droit
supplémentaire applicatif, CREATE de schéma ou rôle administrateur n’est requis.

Ne pas rejouer aveuglément toutes les anciennes migrations sur un schéma avancé :
017/020 remplacent des définitions plus anciennes et peuvent retirer les extensions
ultérieures. Les preuves de réapplication portent sur les scripts désignés et leur
ordre, pas sur toute permutation. En particulier ne pas rejouer une ancienne 020
sur des reçus documentaires avancés. Examiner le ledger réel avant toute autorisation.

## Preuves locales et limites

Le test de compatibilité reproduit le CHECK historique, refuse Google, applique la
028 puis conserve des reçus external-event/native-chat/native-google/native-document.
Deux réapplications 026 corrigée/028 gardent leurs lignes identiques. Un véritable
pg_dump et une restauration dans une seconde base jetable conservent les reçus et
la contrainte ; les fonctions applicatives restent SECURITY INVOKER.
Les tests natifs existants éprouvent aussi les restaurations courrier, conversations,
contacts et monitoring. Cela ne certifie ni le rôle applicatif distant ni Neon/PITR.

## Livraison ultérieure, soumise à autorisation

1. Attester l’instance, le projet/environnement Vercel, le SHA et le binding Neon exact,
   sans afficher de DSN. DATABASE_URL est prioritaire sur POSTGRES_URL. Examiner les
   droits runtime/fonctions dépendantes et le rôle de migration, sans droits admin.
2. Désigner opérateur, fenêtre, RPO/RTO, rétention et responsable de récupération.
   Distinguer branche Neon conservée, PITR disponible, export externe et restauration
   réellement éprouvée. La branche du 16 octobre n’est pas appelée sauvegarde externe.
3. Autoriser sauvegarde cohérente puis restauration sur une copie isolée. Préserver
   sessions, missions, attestations, Journal, reçus, curseurs et versions de credentials.
   Conserver les clés par le coffre existant ; ne pas les copier dans une archive Git.
4. Appliquer seulement les migrations réellement manquantes dans l’ordre contrôlé ;
   sur une cible déjà en 026, examiner la 028 avant toute écriture Google. Enregistrer
   SHA des scripts et résultat transactionnel. Aucun script de démarrage DDL ajouté.
5. Déployer uniquement après accord séparé et attestation du déclencheur Production.
   Drainer/remplacer les anciens workers avant les préparations Google. Garder relève
   et envois autonomes désactivés, ainsi que les capacités non reçues.
6. Recette minimale autorisée : connexion → contexte explicite → mission/contact →
   document → brouillon → Journal → actualisation, avec données désignées. Chaque
   action fournisseur réelle nécessite son accord ; un test simulé ne la remplace pas.

## Retour arrière non destructif

Arrêter les nouveaux handoffs et fermer explicitement les mutations concernées.
Conserver toutes les tables, références, approvals et reçus. Revenir à un code dont
les fences sont conservés, jamais au runtime global ancien ; ne pas réintroduire
le CHECK défectueux ni supprimer les jobs Google pour le satisfaire.

Une restauration ancienne peut perdre les reçus d’effets externes déjà produits et
provoquer des doublons. Réconcilier les opérations processing/uncertain avec l’opérateur
avant toute reprise. Pas de renvoi automatique. Une restauration de données est une
opération distincte du rollback applicatif et doit être autorisée séparément.
