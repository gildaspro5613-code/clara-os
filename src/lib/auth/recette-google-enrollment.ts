import {createHash, randomUUID} from 'node:crypto';
import {neon, type NeonQueryFunction} from '@neondatabase/serverless';
import {validateRecetteDatabaseBinding} from '@/lib/recette/database-binding';
import {isOpaqueAuthValue} from './sign-in-transaction';

export const enrollmentProvider='google-recette-enroll-v1';
export const enrollmentWorkspace='melodie-digital-recette';
export const enrollmentCookie='clara_recette_google_enrollment';
export const enrollmentOrigin='https://clara-os-recette.vercel.app';
export const digest=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
export const emailDigest=(value:string)=>digest(value.trim().toLowerCase());

export function enrollmentDatabase(env:NodeJS.ProcessEnv=process.env) {
 if(validateRecetteDatabaseBinding(env)!=='OK')throw Error('RECETTE_ENROLLMENT_REFUSED');
 try{
  if(new URL(env.CLARA_AUTH_APP_ORIGIN??'').href!==enrollmentOrigin+'/'||
   new URL(env.CLARA_AUTH_GOOGLE_REDIRECT_URI??'').href!==enrollmentOrigin+'/api/auth/google/callback')throw Error();
 }catch{throw Error('RECETTE_ENROLLMENT_REFUSED');}
 return neon(env.DATABASE_URL!,{fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
}

// This table already holds expiring single-use server-side authentication decisions.
// No schema, secret, user or permission is created by readiness checks.
export async function enrollmentReady(query:NeonQueryFunction<false,false>):Promise<boolean>{
 const [rows]=await query.transaction([query`SELECT
  (SELECT count(*)=1 AND bool_and(consumed_at IS NULL AND created_at<=NOW() AND expires_at>NOW()
   AND expires_at<=created_at+INTERVAL '30 minutes')
   FROM public.clara_auth_sign_in_transactions WHERE provider=${enrollmentProvider})
  AND NOT EXISTS(SELECT 1 FROM public.clara_auth_workspaces WHERE id=${enrollmentWorkspace})
  AND (SELECT bool_and(has_table_privilege(current_user, name, 'SELECT')
   AND has_table_privilege(current_user,name,'INSERT')) FROM (VALUES
    ('public.clara_auth_users'),('public.clara_auth_identities'),('public.clara_auth_workspaces'),
    ('public.clara_workspace_memberships'),('public.clara_auth_sign_in_transactions'),('public.clara_auth_sessions')) AS required(name))
  AND has_table_privilege(current_user,'public.clara_auth_sign_in_transactions','UPDATE')
  AND has_language_privilege(current_user,'plpgsql','USAGE')
  AND has_function_privilege(current_user,'pg_catalog.pg_advisory_xact_lock(bigint)','EXECUTE') AS ready`],{readOnly:true});
 return rows.length===1&&rows[0].ready===true;
}

export async function validateEnrollmentTicket(token:string){
 if(!isOpaqueAuthValue(token))throw Error('RECETTE_ENROLLMENT_REFUSED');
 const query=enrollmentDatabase();
 const [rows]=await query.transaction([query`SELECT EXISTS(SELECT 1 FROM public.clara_auth_sign_in_transactions
  WHERE state_hash=${digest(token)} AND provider=${enrollmentProvider} AND consumed_at IS NULL
  AND created_at<=NOW() AND expires_at>NOW() AND expires_at<=created_at+INTERVAL '30 minutes') AS valid`],{readOnly:true});
 if(rows[0]?.valid!==true)throw Error('RECETTE_ENROLLMENT_REFUSED');
}

// Parameter values never appear in SQL literals or diagnostic errors.
export const issueEnrollmentSQL=`DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.clara_auth_sign_in_transactions WHERE provider='google-recette-enroll-v1')
 OR EXISTS(SELECT 1 FROM public.clara_auth_workspaces WHERE id='melodie-digital-recette')
 THEN RAISE EXCEPTION 'RECETTE_ENROLLMENT_ALREADY_AUTHORIZED_OR_TARGET_EXISTS'; END IF;
 INSERT INTO public.clara_auth_sign_in_transactions(state_hash,provider,nonce_hash,expires_at)
 VALUES(current_setting('clara.enroll.ticket'),'google-recette-enroll-v1',
 current_setting('clara.enroll.email'),NOW()+INTERVAL '30 minutes');
 END $$`;

export async function issueEnrollment(query:NeonQueryFunction<false,false>,token:string,email:string){
 if(!isOpaqueAuthValue(token)||!email.trim()||email.length>320||!/^\S+@\S+\.\S+$/.test(email.trim()))throw Error('RECETTE_ENROLLMENT_INPUT_REFUSED');
 return query.transaction([
  query`SET LOCAL lock_timeout='5s'`,query`SET LOCAL statement_timeout='10s'`,
  query`SELECT pg_advisory_xact_lock(21920261028::bigint)`,
  query`SELECT set_config('clara.enroll.ticket',${digest(token)},true),set_config('clara.enroll.email',${emailDigest(email)},true)`,
  query.query(issueEnrollmentSQL),
 ]);
}

export const completeEnrollmentSQL=`DO $$
 DECLARE approval public.clara_auth_sign_in_transactions%ROWTYPE;
 BEGIN
 SELECT * INTO approval FROM public.clara_auth_sign_in_transactions
 WHERE state_hash=current_setting('clara.enroll.ticket') AND provider='google-recette-enroll-v1' FOR UPDATE;
 IF NOT FOUND OR approval.consumed_at IS NOT NULL OR approval.created_at>NOW() OR approval.expires_at<=NOW()
 OR approval.expires_at>approval.created_at+INTERVAL '30 minutes'
 OR approval.nonce_hash<>current_setting('clara.enroll.email')
 THEN RAISE EXCEPTION 'RECETTE_ENROLLMENT_AUTHORIZATION_REFUSED'; END IF;
 IF EXISTS(SELECT 1 FROM public.clara_auth_identities WHERE issuer='https://accounts.google.com'
 AND subject=current_setting('clara.enroll.subject'))
 OR EXISTS(SELECT 1 FROM public.clara_auth_workspaces WHERE id='melodie-digital-recette')
 OR EXISTS(SELECT 1 FROM public.clara_auth_users WHERE id=current_setting('clara.enroll.user'))
 THEN RAISE EXCEPTION 'RECETTE_ENROLLMENT_COLLISION'; END IF;
 INSERT INTO public.clara_auth_workspaces(id) VALUES('melodie-digital-recette');
 INSERT INTO public.clara_auth_users(id) VALUES(current_setting('clara.enroll.user'));
 INSERT INTO public.clara_auth_identities(issuer,subject,user_id)
 VALUES('https://accounts.google.com',current_setting('clara.enroll.subject'),current_setting('clara.enroll.user'));
 INSERT INTO public.clara_workspace_memberships(user_id,workspace_id,role)
 VALUES(current_setting('clara.enroll.user'),'melodie-digital-recette','member');
 UPDATE public.clara_auth_sign_in_transactions SET consumed_at=NOW() WHERE state_hash=approval.state_hash;
 END $$`;

/** Only called after Google cryptographic verification AND one-time state/nonce consumption. */
export async function completeRecetteEnrollment(token:string,claims:{sub?:string;email?:string;email_verified?:boolean}){
 const query=enrollmentDatabase();
 if(!isOpaqueAuthValue(token)||!claims.sub?.trim()||claims.sub.length>2048||
  claims.email_verified!==true||!claims.email?.trim()||claims.email.length>320)throw Error('RECETTE_ENROLLMENT_REFUSED');
 await query.transaction([
  query`SET LOCAL lock_timeout='5s'`,query`SET LOCAL statement_timeout='10s'`,
  query`SELECT pg_advisory_xact_lock(21920261028::bigint)`,
  query`SELECT set_config('clara.enroll.ticket',${digest(token)},true),set_config('clara.enroll.email',${emailDigest(claims.email)},true),
   set_config('clara.enroll.subject',${claims.sub},true),set_config('clara.enroll.user',${randomUUID()},true)`,
  query.query(completeEnrollmentSQL),
 ]);
}
