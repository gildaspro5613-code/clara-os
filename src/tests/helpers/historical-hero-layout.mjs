import assert from 'node:assert/strict';
export async function assertHeroFlow(page){
 const hero=page.locator('[data-cockpit-hero]');
 assert.equal(await hero.locator('.native-context').count(),0);
 const columns=hero.locator('[data-hero-column]');
 for(const column of await columns.all()){
  if(!await column.isVisible())continue;
  const panels=await column.locator(':scope > section').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,clipped:e.scrollHeight>e.clientHeight+1&&!['auto','scroll'].includes(getComputedStyle(e).overflowY)};}));
  for(let i=0;i<panels.length;i++){
   assert.equal(panels[i].clipped,false,'Hero panel must not truncate its content');
   if(i)assert.ok(panels[i-1].bottom<=panels[i].top+1,'Hero panels must not overlap');
  }
 }
}
