/** Public presentation only: never changes native decisions or provider results. */
export function calendarReadErrorKey(status:number,code?:string){
 return ['NATIVE_GOOGLE_REAUTH_REQUIRED','GOOGLE_REAUTH_REQUIRED'].includes(code??'')?'agendaReconnectRequired':code==='NATIVE_GOOGLE_CONNECTION_REQUIRED'?'agendaConnectionRequired':code==='NATIVE_GOOGLE_CALENDAR_REQUIRED'?'agendaCalendarRequired':status===401?'agendaSessionExpired':status===403?'agendaAccessDenied':'agendaTemporarilyUnavailable';
}

/** Agenda-only wording: keep the Cockpit contract unchanged. */
export function agendaPageReadErrorKey(status:number,code?:string){
 return code==='GOOGLE_CONSENT_REQUIRED'?'agendaConsentRequired':calendarReadErrorKey(status,code);
}
