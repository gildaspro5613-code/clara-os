import { nativeContext } from './scoped-context';

/**
 * Authorized, request-scoped selectors only. Never infer a client/project from
 * the user's text, global missions, historical messages or a Live project.
 * No privileges, provider tokens or additional records are exposed to GPT.
 */
export function formatNativeCognitiveScope(scope: Readonly<{workspaceId:string;clientId:string;projectId:string;sessionId:string}>): string {
  const { workspaceId, clientId, projectId, sessionId } = scope;
  return [
    'CONTEXTE CANONIQUE PRIVÉ ATTESTÉ PAR CLARA OS',
    'Ce sont des identifiants de sélection du fil, pas une mission métier ni une preuve de données externes.',
    'Espace de travail : ' + workspaceId,
    'Client interne ou autorisé : ' + clientId,
    'Projet canonique sélectionné : ' + projectId,
    'Fil sélectionné : ' + sessionId,
    'Une mission métier ne doit être déclarée active que si elle est effectivement présente dans la session.',
    'Ne déduis ni permissions supplémentaires, ni rattachement des missions historiques, ni capacités de fournisseur de ces identifiants.',
  ].join('\n');
}

export function authenticatedNativeCognitiveScope(): string | null {
  const native = nativeContext();
  return native ? formatNativeCognitiveScope(native.scope) : null;
}
