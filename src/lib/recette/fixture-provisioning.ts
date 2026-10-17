import { assertCloudRecetteContext } from './fixture-preflight';
export {fixture,preflightRecetteFixture} from './fixture-preflight';
import { createOpaqueSessionToken } from '@/lib/auth/authenticated-session-lifecycle';
import { sessionTokenDigest } from '@/lib/auth/authenticated-workspace-session';
import type { NeonQueryFunction } from '@neondatabase/serverless';

/** Transactional, fixed namespace only. No reassignment, resurrection or schema DDL.
 * The advisory lock serializes this fixture's initializers. Revoked/expired tokens
 * are never renewed, and a second secret file cannot create a parallel live token. */
export function seedRecetteFixture(query:NeonQueryFunction<false,false>,token:string){
 const hash=sessionTokenDigest(token);if(!hash)throw Error('RECETTE_FIXTURE_TOKEN_INVALID');
 return query.transaction([
  query`SELECT pg_advisory_xact_lock(hashtext('clara-recette-fixture-v1'))`,
  query`DO $$ BEGIN
   IF EXISTS(SELECT 1 FROM public.clara_auth_users WHERE id='recette-176-fictional-user-v1') AND
    (NOT EXISTS(SELECT 1 FROM public.clara_auth_identities WHERE issuer='urn:clara:recette:fixture:v1' AND subject='fictional-operator-v1' AND user_id='recette-176-fictional-user-v1') OR
     NOT EXISTS(SELECT 1 FROM public.clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id='recette-176-fictional-user-v1' AND role='owner' AND revoked_at IS NULL) OR
     EXISTS(SELECT 1 FROM public.clara_auth_identities WHERE user_id='recette-176-fictional-user-v1' AND (issuer<>'urn:clara:recette:fixture:v1' OR subject<>'fictional-operator-v1')) OR
     EXISTS(SELECT 1 FROM public.clara_workspace_memberships WHERE user_id='recette-176-fictional-user-v1' AND workspace_id<>'recette-176-fictional-workspace-v1'))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   IF EXISTS(SELECT 1 FROM public.clara_auth_identities WHERE issuer='urn:clara:recette:fixture:v1' AND subject='fictional-operator-v1' AND user_id<>'recette-176-fictional-user-v1')
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   IF EXISTS(SELECT 1 FROM public.clara_auth_workspaces WHERE id='recette-176-fictional-workspace-v1') AND
    (NOT EXISTS(SELECT 1 FROM public.clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id='recette-176-fictional-user-v1' AND role='owner' AND revoked_at IS NULL) OR
     EXISTS(SELECT 1 FROM public.clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id<>'recette-176-fictional-user-v1'))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   INSERT INTO public.clara_auth_users(id) VALUES('recette-176-fictional-user-v1') ON CONFLICT DO NOTHING;
   INSERT INTO public.clara_auth_workspaces(id) VALUES('recette-176-fictional-workspace-v1') ON CONFLICT DO NOTHING;
   INSERT INTO public.clara_auth_identities(issuer,subject,user_id) VALUES('urn:clara:recette:fixture:v1','fictional-operator-v1','recette-176-fictional-user-v1') ON CONFLICT DO NOTHING;
   INSERT INTO public.clara_workspace_memberships(user_id,workspace_id,role) VALUES('recette-176-fictional-user-v1','recette-176-fictional-workspace-v1','owner') ON CONFLICT DO NOTHING;
  END $$`,
  query`SELECT set_config('clara.recette.fixture_hash',${hash},true)`,
  query`DO $$ BEGIN
   IF EXISTS(SELECT 1 FROM public.clara_auth_sessions WHERE token_hash=current_setting('clara.recette.fixture_hash') AND
     (user_id<>'recette-176-fictional-user-v1' OR revoked_at IS NOT NULL OR expires_at<=NOW()))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_SESSION_UNUSABLE'; END IF;
   IF EXISTS(SELECT 1 FROM public.clara_auth_sessions WHERE user_id='recette-176-fictional-user-v1' AND token_hash<>current_setting('clara.recette.fixture_hash') AND revoked_at IS NULL AND expires_at>NOW())
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_SESSION_ALREADY_ACTIVE'; END IF;
  END $$`,
  query`INSERT INTO public.clara_auth_sessions(token_hash,user_id,expires_at)
   VALUES(${hash},'recette-176-fictional-user-v1',NOW()+INTERVAL '1 hour') ON CONFLICT DO NOTHING`,
 ],{isolationLevel:'Serializable'});
}
export const newRecetteFixtureToken=createOpaqueSessionToken;

/** Cloud operator input only; never a workflow_dispatch input, URL or log value.
 * GitHub environment approval and immutable source pinning are operational prerequisites. */
export function cloudRecetteFixtureToken(env:NodeJS.ProcessEnv){
 assertCloudRecetteContext(env);
 const token=env.RECETTE_FIXTURE_SESSION_TOKEN;
 if(!token||!sessionTokenDigest(token))throw Error('RECETTE_CLOUD_SESSION_SECRET_REQUIRED');
 return token;
}
