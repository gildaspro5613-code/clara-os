/** Explicit isolated Neon protocol fixture. Never usable with a real database URL. */
const database = "postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic";
if (process.env.DATABASE_URL !== database || process.env.POSTGRES_URL) throw new Error("Reception fixture requires its exact synthetic database URL");
const missions=Array.from({length:6},(_,i)=>({id:`mission-${i}`,title:`Source mission ${i}`,objective:"Objectif métier original français",status:i===0?"blocked":"active",priority:"medium",createdAt:"2026-10-14T12:00:00Z",tasks:[{id:`task-${i}`,title:"Action source originale",completed:false,...(i===0?{}:{execution:{autonomous:false,capabilityId:"synthetic",context:{}}})}],progress:0}));
const session={state:"STARTING",recommendation:null,brainDashboard:null,mission:missions[0],sources:[{source:"google-gmail",available:true,summary:"PRIVATE_FULL_EMAIL_BODY",data:{messages:[{id:"mail123",subject:"Original subject",from:"sender@example.invalid",labelIds:["IMPORTANT"],body:"PRIVATE_FULL_EMAIL_BODY",snippet:"PRIVATE_EMAIL_SNIPPET"}]}}],user:{firstName:"Synthetic"},conversation:[{id:"synthetic-message",role:"clara",content:"PRIVATE_FULL_EMAIL_BODY",createdAt:"2026-10-14T12:00:00Z"}],startedAt:"2026-10-14T12:00:00Z",updatedAt:"2026-10-14T12:00:00Z"};
const draft={schema:"clara.commercial-communication-draft.v1",submissionId:"synthetic-submission",channel:"email",sender:{identity:"commercial",name:"Clara — Mélodie Digital",email:"clara@melodie.digital"},recipient:{name:"Synthetic contact",email:"contact@example.invalid"},subject:"Synthetic draft subject",body:"PRIVATE_DRAFT_BODY",revision:1,updatedAt:"2026-10-14T12:00:00Z",approval:{required:true,status:"pending"},delivery:{allowed:false,reason:"operator-approval-required"}};
const qualification={opportunity:{projectType:"Synthetic project",disciplines:["Lighting"],brief:"PRIVATE_REQUEST_SOURCE",schedule:"",location:""},qualification:{missing:["schedule"],completeness:"needs-information"}};
const brief={headline:"Synthetic qualification",decision:{required:false}};
const lifecycle={state:"qualifying",decisionRequired:false,nextAction:"PRIVATE_DRAFT_BODY"};
globalThis.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(new URL(url).hostname==='api.invalid'){
  const {query}=JSON.parse(init.body);let fields=[],rows=[];
  if(/FROM clara_missions/.test(query)){fields=[{name:'data',dataTypeID:3802}];rows=missions.map(m=>[JSON.stringify(m)]);}
  if(/FROM clara_sessions/.test(query)){
   const withId=/SELECT id, data/.test(query);
   fields=withId?[{name:'id',dataTypeID:25},{name:'data',dataTypeID:3802}]:[{name:'data',dataTypeID:3802}];
   rows=withId?[['default',JSON.stringify(session)]]:[[JSON.stringify(session)]];
  }
  if(/FROM clara_acquisition_records/.test(query) && !query.includes("lifecycle->>'decisionRequired' = 'true'")) {
    fields=[{name:'submission_id',dataTypeID:25},{name:'workspace_id',dataTypeID:25},{name:'qualification',dataTypeID:3802},{name:'decision_brief',dataTypeID:3802},{name:'lifecycle',dataTypeID:3802},{name:'commercial_draft',dataTypeID:3802},{name:'created_at',dataTypeID:1184},{name:'updated_at',dataTypeID:1184}];
    rows=[['synthetic-submission','melodie-digital',JSON.stringify(qualification),JSON.stringify(brief),JSON.stringify(lifecycle),JSON.stringify(draft),'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z']];
  }
  return Response.json({fields,rows,rowCount:rows.length,command:'SELECT',rowAsArray:true});
 }
 throw new Error('Reception fixture blocks all external server fetches');
};
