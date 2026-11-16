-- Inventaire de présence uniquement ; aucune valeur chiffrée ni identifiant propriétaire retourné.
-- À lire sur la base Production déjà attestée, via le canal administratif existant.
BEGIN TRANSACTION READ ONLY;
SELECT
 (SELECT count(*) FROM clara_connections WHERE provider='ionos') ionos_connections,
 (SELECT count(*) FROM clara_connections c JOIN clara_connection_credentials k ON k.connection_id=c.id WHERE c.provider='ionos' AND length(k.encrypted_payload)>0) ionos_encrypted_references_present,
 (SELECT count(*) FROM clara_native_mail_authority a JOIN clara_connections c ON c.id=a.connection_id WHERE c.provider='ionos' AND a.revoked_at IS NULL) active_native_mail_authorities;
ROLLBACK;
-- Une présence ne prouve ni la propriété d'une boîte, ni le déchiffrement avec la clé runtime,
-- ni la validité IMAP. Zéro ligne native ne prouve pas la disparition d'un coffre historique.
