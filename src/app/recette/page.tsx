import { notFound } from 'next/navigation';
import { recetteDatabase, recetteRequested } from '@/lib/recette/policy';
export const dynamic = 'force-dynamic';
export default function RecetteSessionPage() {
  if (!recetteRequested()) notFound();
  recetteDatabase();
  return <main style={{padding:'2rem'}}>
    <h1>Recette isolée Clara OS</h1>
    <p>Réponses Clara simulées. Aucun fournisseur réel. Utilisez uniquement une session canonique de test déjà délivrée dans la base de recette par un opérateur autorisé.</p>
    <form action="/api/auth/recette/session" method="post">
      <label>Espace autorisé <input name="workspaceId" required autoComplete="off" /></label>
      <label>Jeton de session de test <input name="token" type="password" required autoComplete="off" maxLength={128}/></label>
      <button type="submit">Reprendre la session de test</button>
    </form>
  </main>;
}
