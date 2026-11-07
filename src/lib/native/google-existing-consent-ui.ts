/** Read-only UI decisions; all permissions remain enforced by native Google authority. */
export type ExistingGoogleConnection = {
  status: string;
  owned: boolean;
  scopes?: readonly string[];
};

const agendaScopes = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export function hasRecordedAgendaConsent(connection?: ExistingGoogleConnection): boolean {
  return agendaScopes.every(scope => connection?.scopes?.includes(scope) === true);
}

/** Offers an existing-connection OAuth upgrade; it never provisions a new connection. */
export function canRequestAgendaConsentOnExisting(connection?: ExistingGoogleConnection): boolean {
  return Boolean(connection?.owned &&
    (connection.status === 'ACTIVE' || connection.status === 'RECONNECT_REQUIRED') &&
    !hasRecordedAgendaConsent(connection));
}

/** Agenda must not invite another OAuth connection when existing records are selectable. */
export function preventAccidentalAgendaConnection(
  mode: 'agenda' | 'drive',
  connectionCount: number,
  selectedConnectionId: string,
): boolean {
  return mode === 'agenda' && connectionCount > 0 && !selectedConnectionId;
}
