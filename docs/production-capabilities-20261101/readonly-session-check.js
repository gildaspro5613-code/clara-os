// À exécuter uniquement par le propriétaire dans sa session authentifiée actuelle.
// GET uniquement. Aucun jeton, cookie, contenu de courrier/document ou valeur secrète imprimé.
(async () => {
  if (location.origin !== 'https://os.melodie.digital') throw new Error('Ouvrir Clara OS Production dans la session habituelle.');
  const results = [];
  for (const path of ['/api/native/runtime', '/api/voice/transcribe', '/api/calendar', '/api/weather?location=Angers', '/api/native/mail?action=overview']) {
    try {
      const response = await fetch(path, {method:'GET', credentials:'same-origin', cache:'no-store'});
      const data = await response.json();
      results.push({path, status:response.status, code:typeof data.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(data.code)?data.code:'NON_RENSEIGNE', success:data.success===true,
        ...(path==='/api/native/runtime'?{contexteComplet:!!(data.data?.workspaceId&&data.data?.clientId&&data.data?.projectId&&data.data?.sessionId),ecritureAutorisee:data.permissions?.write===true}:{}),
        ...(path==='/api/calendar'&&data.success===true?{evenementsAffiches:Array.isArray(data.events)?data.events.length:null}:{}),
        ...(path.includes('/mail?')&&data.success===true?{boitesAutorisees:Array.isArray(data.overview)?data.overview.length:null,actualiteVerifiee:data.freshnessVerified===true}:{}),
        ...(path.startsWith('/api/weather')&&data.success===true?{meteoValide:typeof data.temperatureC==='number'&&Number.isFinite(data.temperatureC)&&typeof data.condition==='string'}:{})});
    } catch { results.push({path, code:'LECTURE_NON_ATTESTEE'}); }
  }
  console.table(results);
  return results;
})();
