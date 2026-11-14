/** Deterministic provider fixtures only. No semantic model certification. */
export function nativeDocumentCognitionFixture(input){
 const prompt=typeof input.input==='string'?input.input:JSON.stringify(input.input);
 if(prompt.includes('Retourne UNIQUEMENT un JSON valide:')){
  const segments=JSON.parse(prompt.split('Extraits:\n')[1]);
  const facts=segments.filter(s=>/PAR LED|32 A|16 A|HYPOTHESE/.test(s.text)).map(s=>({entityId:'show',property:s.text.includes('PAR LED')?'light.quantity':s.text.includes('HYPOTHESE')?'mount.hours':'power.amps',value:s.text.includes('PAR LED')?12:s.text.includes('HYPOTHESE')?2:s.text.includes('16 A')?16:32,unit:null,locator:s.locator,confidence:.8,ambiguity:null}));
  return JSON.stringify({entities:[{id:'show',name:'Spectacle synthetique',category:'equipment'}],facts,ambiguities:['Plan DMX manquant; montage 2 heures = hypothese'],conflicts:prompt.includes('32 A')&&prompt.includes('16 A')?['document-a@1:32 A triphase / document-shared@1:16 A monophase — contradiction non resolue']:[]});
 }
 if(prompt.includes('Tu es un moteur cognitif métier'))return JSON.stringify({intent:'Preparation documentaire',summary:'Verifier les faits documentaires non certifies et les contradictions',confidence:.8,entities:['spectacle'],actions:['Verifier alimentation et patch manquant'],nextAction:'Faire confirmer les sources contradictoires',importance:.7,urgency:.5,impact:.7});
 return 'SIMULATION FOURNISSEUR : 12 PAR LED; faits rapportes non certifies. Hypothese montage 2 heures. Plan DMX manquant. Conflit non resolu : 32 A triphase / 16 A monophase. Sources document-a@1 et document-shared@1. Aucune action executee.';
}
