import {neon} from '@neondatabase/serverless';
import {validateRecetteDatabaseBinding} from './database-binding';

export const recetteOAuthOrigin='https://clara-os-recette.vercel.app';
/** Build/operator-only check. No Google request, no enrollment, no session issuance.
 * A positive identity result proves existence of an enrolled Google member, NOT
 * that a particular person owns its subject. Real OAuth must still prove that match. */
export async function attestRecetteOAuthReception(env:NodeJS.ProcessEnv,onDiagnostic?:(stage:'DATABASE_BINDING'|'GOOGLE_CONFIGURATION'|'EXISTING_GOOGLE_MEMBERSHIP')=>void):Promise<'PASS'|'FAIL'|'NON ATTESTÉ'>{
 let stage:'DATABASE_BINDING'|'GOOGLE_CONFIGURATION'|'EXISTING_GOOGLE_MEMBERSHIP'='DATABASE_BINDING';
 const result=(status:'PASS'|'FAIL'|'NON ATTESTÉ')=>{if(status!=='PASS')onDiagnostic?.(stage);return status;};
 const binding=validateRecetteDatabaseBinding(env);
 if(binding==='FAIL')return result('FAIL');if(binding!=='OK')return result('NON ATTESTÉ');
 stage='GOOGLE_CONFIGURATION';
 if(!env.GOOGLE_CLIENT_ID?.trim()||!env.GOOGLE_CLIENT_SECRET?.trim())return result('NON ATTESTÉ');
 if(env.CLARA_AUTH_APP_ORIGIN!==recetteOAuthOrigin||env.CLARA_AUTH_GOOGLE_REDIRECT_URI!==recetteOAuthOrigin+'/api/auth/google/callback')return result('FAIL');
 stage='EXISTING_GOOGLE_MEMBERSHIP';
 try{
  const sql=neon(env.DATABASE_URL!,{fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
  const [rows]=await sql.transaction([sql`SELECT EXISTS (
   SELECT 1 FROM clara_auth_identities i
   JOIN clara_auth_users u ON u.id=i.user_id
   JOIN clara_workspace_memberships m ON m.user_id=u.id
   JOIN clara_auth_workspaces w ON w.id=m.workspace_id
   WHERE i.issuer='https://accounts.google.com' AND length(trim(i.subject))>0
    AND m.revoked_at IS NULL AND w.id<>'default'
    AND m.role IN ('owner','admin','member','viewer')
  ) AS enrolled_google_member,
  has_table_privilege(current_user,'public.clara_auth_sessions','INSERT')
   AND has_table_privilege(current_user,'public.clara_auth_sign_in_transactions','SELECT')
   AND has_table_privilege(current_user,'public.clara_auth_sign_in_transactions','INSERT')
   AND has_table_privilege(current_user,'public.clara_auth_sign_in_transactions','UPDATE') AS sign_in_permissions`],{readOnly:true});
  return result(rows.length===1&&rows[0].enrolled_google_member===true&&rows[0].sign_in_permissions===true?'PASS':'FAIL');
 }catch{return result('NON ATTESTÉ');}
}
