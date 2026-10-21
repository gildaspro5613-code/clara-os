-- CLARA OS / PR #176 / LECTURE 7 — VERSION CORRIGEE, NON EXECUTEE
-- PROJET DE RECETTE : NE PAS EXECUTER AVANT GO SEPARE.
-- Usage futur uniquement via psql, sur la branche Neon isolee controlee.
-- Aucune connexion IONOS, aucun SMTP, aucun secret reel.
-- Toute transaction non COMMITtee est annulee a la fermeture de la session.
\set ON_ERROR_STOP on
-- Preconditions HORS SQL : verifier host ep-young-cake-b2ekuozh,
-- branch br-autumn-heart-b2ei69zx, projet fragrant-dream-31652403.
-- Le SQL ne peut pas prouver a lui seul l'identite de branche Neon.
-- Lancer plus tard uniquement dans une session psql dediee avec
-- psql -X -v ON_ERROR_STOP=1 -f <fichier>, SANS --single-transaction.
-- Ne pas lancer via un outil qui decoupe les requetes.
BEGIN;
DO $preflight$
BEGIN
  IF current_database() <> 'neondb' THEN
    RAISE EXCEPTION 'STOP: wrong database';
  END IF;
  IF current_user <> 'neondb_owner' THEN
    RAISE EXCEPTION 'STOP: unexpected execution role';
  END IF;
END
$preflight$;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

DO $$
DECLARE
  prefix text := 'recette176_l5_' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  ua text := prefix || '_owner_a';
  ub text := prefix || '_owner_b';
  wa text := prefix || '_workspace_a';
  wb text := prefix || '_workspace_b';
  ca text := prefix || '_connection_a';
  cb text := prefix || '_connection_b';
  generation_before bigint;
  generation_after bigint;
  result jsonb;
  error_message text;
BEGIN
  -- Garde : les fixtures ne doivent pas coexister avec une autorite IONOS preexistante.
  IF EXISTS (SELECT 1 FROM public.clara_native_mail_authority)
     OR EXISTS (SELECT 1 FROM public.clara_native_mail_monitor_grants)
  THEN RAISE EXCEPTION 'STOP: authorities/grants already present'; END IF;

  INSERT INTO public.clara_auth_users(id) VALUES (ua),(ub);
  INSERT INTO public.clara_auth_workspaces(id) VALUES (wa),(wb);
  INSERT INTO public.clara_auth_identities(issuer,subject,user_id)
    VALUES ('recette176',ua,ua),('recette176',ub,ub);
  INSERT INTO public.clara_workspace_memberships(user_id,workspace_id,role)
    VALUES (ua,wa,'owner'),(ub,wb,'owner');
  INSERT INTO public.clara_connections(id,workspace_id,provider,status,scopes)
    VALUES (ca,wa,'ionos','ACTIVE','[]'::jsonb),
           (cb,wb,'ionos','ACTIVE','[]'::jsonb);
  -- Adresses strictement conformes a la contrainte existante.
  -- Elles servent d'etiquettes SQL ; aucun reseau fournisseur n'est utilise.
  INSERT INTO public.clara_native_mail_authority
    (connection_id,workspace_id,owner_user_id,address,reviewed_by,review_reason)
    VALUES
    (ca,wa,ua,'clara@melodie.digital',ua,'Recette synthetique isolation proprietaire A'),
    (cb,wb,ub,'support@melodie.digital',ub,'Recette synthetique isolation proprietaire B');

  INSERT INTO public.clara_native_mail_monitor_grants
    (connection_id,workspace_id,granted_by,reviewed_by,review_reason,enabled)
    VALUES
    (ca,wa,ua,ua,'Recette synthetique autorisation A temporaire',true),
    (cb,wb,ub,ub,'Recette synthetique autorisation B temporaire',false);

  -- Autorite positive A, negative B (desactivee), et negative inter-workspace.
  result := public.clara_native_mail_monitor_authority(ca,wa);
  IF result->>'connectionId' IS DISTINCT FROM ca THEN
    RAISE EXCEPTION 'FAIL: positive authority A'; END IF;

  BEGIN
    PERFORM public.clara_native_mail_monitor_authority(cb,wb);
    RAISE EXCEPTION 'FAIL: disabled grant B accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    IF error_message <> 'MAIL_MONITOR_DENIED' THEN
      RAISE EXCEPTION 'FAIL: unexpected denial: %', error_message;
    END IF;
  END;

  BEGIN
    PERFORM public.clara_native_mail_monitor_authority(ca,wb);
    RAISE EXCEPTION 'FAIL: cross-workspace accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    IF error_message <> 'MAIL_MONITOR_DENIED' THEN
      RAISE EXCEPTION 'FAIL: unexpected denial: %', error_message;
    END IF;
  END;

  SELECT generation INTO generation_before
  FROM public.clara_native_mail_monitor_grants WHERE connection_id=ca;
  UPDATE public.clara_native_mail_monitor_grants
     SET enabled=false,revoked_at=clock_timestamp()
   WHERE connection_id=ca;
  SELECT generation INTO generation_after
  FROM public.clara_native_mail_monitor_grants WHERE connection_id=ca;
  IF generation_after<>generation_before+1 THEN
    RAISE EXCEPTION 'FAIL: generation did not advance'; END IF;

  BEGIN
    PERFORM public.clara_native_mail_monitor_authority(ca,wa);
    RAISE EXCEPTION 'FAIL: revoked grant accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    IF error_message <> 'MAIL_MONITOR_DENIED' THEN
      RAISE EXCEPTION 'FAIL: unexpected denial: %', error_message;
    END IF;
  END;

  -- Immutabilite de l'autorite : changement de proprietaire refuse.
  BEGIN
    UPDATE public.clara_native_mail_authority
       SET owner_user_id=ub,revision=revision+1 WHERE connection_id=ca;
    RAISE EXCEPTION 'FAIL: owner reassignment accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    IF error_message <> 'NATIVE_GOOGLE_AUTHORITY_IMMUTABLE' THEN
      RAISE EXCEPTION 'FAIL: unexpected immutable-authority denial: %', error_message;
    END IF;
  END;

  RAISE NOTICE 'PASS: fixtures, owner isolation, revocation, generation, immutable authority';
END $$;

-- IMPORTANT : jamais COMMIT. L'annulation couvre TOUTES les fixtures.
-- Les controles SELECT suivants sont executes APRES ROLLBACK, dans la meme session.
-- En cas d'erreur avant ROLLBACK : FERMER LA SESSION, puis executer
-- ces memes SELECT dans une nouvelle session en lecture seule.
-- Un GO distinct sera requis avant toute execution.
ROLLBACK;


-- CONTROLES POST-ROLLBACK (lecture seule) :
SELECT 'authorities' AS object, count(*) AS total FROM public.clara_native_mail_authority
UNION ALL SELECT 'grants', count(*) FROM public.clara_native_mail_monitor_grants
UNION ALL SELECT 'messages', count(*) FROM public.clara_native_mail_messages
UNION ALL SELECT 'sync', count(*) FROM public.clara_native_mail_sync;

SELECT 'users' AS object, count(*) AS remaining FROM public.clara_auth_users WHERE id LIKE 'recette176_l5_%'
UNION ALL SELECT 'workspaces', count(*) FROM public.clara_auth_workspaces WHERE id LIKE 'recette176_l5_%'
UNION ALL SELECT 'identities', count(*) FROM public.clara_auth_identities WHERE issuer='recette176' AND subject LIKE 'recette176_l5_%'
UNION ALL SELECT 'memberships', count(*) FROM public.clara_workspace_memberships WHERE user_id LIKE 'recette176_l5_%'
UNION ALL SELECT 'connections', count(*) FROM public.clara_connections WHERE id LIKE 'recette176_l5_%';
-- Tous les compteurs doivent etre a zero sur la branche de recette.
-- Ne pas activer de role LOGIN, ne pas creer de secret ni de reseau IONOS.
