-- SELECT uniquement. Cible à sélectionner explicitement dans le connecteur :
-- projet fragrant-dream-31652403 / branche br-crimson-feather-b2zr00sf / base neondb.
-- Ne prouve ni la branche depuis SQL ni l'appartenance du compte Google personnel :
-- ce dernier point reste vérifié par le vrai parcours OAuth, issuer + subject.
-- Aucune identité, aucun email, aucun jeton ni contenu métier n'est retourné.
SELECT current_database()='neondb' AS database_ok,
 EXISTS (
  SELECT 1 FROM clara_auth_identities i
  JOIN clara_auth_users u ON u.id=i.user_id
  JOIN clara_workspace_memberships m ON m.user_id=u.id
  JOIN clara_auth_workspaces w ON w.id=m.workspace_id
  WHERE i.issuer='https://accounts.google.com' AND length(trim(i.subject))>0
   AND m.revoked_at IS NULL AND w.id<>'default'
   AND m.role IN ('owner','admin','member','viewer')
 ) AS enrolled_google_member,
 has_table_privilege('clara_os_recette_limited','public.clara_auth_sessions','INSERT')
 AND has_table_privilege('clara_os_recette_limited','public.clara_auth_sign_in_transactions','SELECT')
 AND has_table_privilege('clara_os_recette_limited','public.clara_auth_sign_in_transactions','INSERT')
 AND has_table_privilege('clara_os_recette_limited','public.clara_auth_sign_in_transactions','UPDATE') AS sign_in_permissions;
