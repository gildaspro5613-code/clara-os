/** Explicit browser-local day, converted to offset-bearing ISO boundaries. */
export function todayCalendarUrl(){const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);return '/api/calendar?'+new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString()});}
