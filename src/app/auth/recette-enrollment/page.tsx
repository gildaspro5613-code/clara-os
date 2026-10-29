import {notFound} from 'next/navigation';
import {validateRecetteDatabaseBinding} from '@/lib/recette/database-binding';
export const dynamic='force-dynamic';
export default function RecetteEnrollment(){
 if(validateRecetteDatabaseBinding(process.env)!=='OK')notFound();
 return <main style={{maxWidth:520,margin:'4rem auto',padding:24}}>
  <h1>Accès administrativement autorisé — Recette</h1>
  <p>Utilisez uniquement l’invitation privée remise par l’administrateur. Connectez-vous ensuite au compte Google expressément autorisé. Aucun accès aux données Production n’est accordé.</p>
  <form method="post" action="/api/auth/google/enroll">
   <label htmlFor="ticket">Invitation à usage unique</label>
   <input id="ticket" name="ticket" type="password" required autoComplete="off" minLength={43} maxLength={128}/>
   <button type="submit">Vérifier mon compte Google</button>
  </form>
 </main>;
}
