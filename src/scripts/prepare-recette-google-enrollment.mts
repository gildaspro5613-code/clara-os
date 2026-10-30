import {mkdirSync,writeFileSync,readFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {digest,emailDigest,issueEnrollmentSQL} from '../lib/auth/recette-google-enrollment';

// OFFLINE preparation only: no credentials, provider call or SQL execution.
// Later activation uses the existing scoped Neon connection, after separate GO.
try{
 const [authorization,emailFile,directory,...extra]=process.argv.slice(2);
 if(authorization!=='--prepare-single-google-enrollment'||!emailFile||!directory||extra.length)throw Error();
 const info=lstatSync(emailFile);
 if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077)!==0||info.uid!==process.getuid?.()||info.size>512)throw Error();
 const email=readFileSync(emailFile,'utf8').trim();
 if(!/^\S+@\S+\.\S+$/.test(email)||email.length>320)throw Error();
 mkdirSync(directory,{mode:0o700}); // Never overwrite an existing preparation.
 const token=randomBytes(32).toString('base64url');
 writeFileSync(join(directory,'invitation.txt'),token+'\n',{mode:0o600,flag:'wx'});
 const sql=`-- Execute ONLY after separate GO: fragrant-dream-31652403 / br-crimson-feather-b2zr00sf / neondb.
-- SQL database name alone does not prove the branch: verify connector metadata first.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='15s';
SELECT pg_advisory_xact_lock(21920261028::bigint);
DO $$ BEGIN
 IF current_database()<>'neondb' THEN RAISE EXCEPTION 'RECETTE_DATABASE_REFUSED'; END IF;
 PERFORM set_config('clara.enroll.ticket','${digest(token)}',true);
 PERFORM set_config('clara.enroll.email','${emailDigest(email)}',true);
END $$;
${issueEnrollmentSQL};
COMMIT;
`;
 writeFileSync(join(directory,'authorize.sql'),sql,{mode:0o600,flag:'wx'});
 console.log('PASS: préparation locale privée uniquement; aucune écriture distante; aucune invitation activée.');
}catch{
 console.error('PRÉPARATION REFUSÉE: aucun détail sensible publié; ne pas réutiliser un dossier partiellement créé.');
 process.exitCode=1;
}
