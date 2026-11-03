export async function openContextMenu(page) {
  const dialog=page.locator('[data-native-context-dialog]');
  // Wait for the client-side Sidebar to mount after each navigation/reload.
  await page.locator('[data-open-native-context]').waitFor({state:'attached'});
  if(!(await dialog.evaluate(element=>element.open))){
    const navigation=page.locator('button[aria-controls="clara-navigation"]');
    if(await navigation.isVisible() && await navigation.getAttribute('aria-expanded')!=='true')await navigation.click();
    await page.locator('[data-open-native-context]').click();
    await dialog.waitFor({state:'visible'});
  }
  const panel=page.locator('[data-cockpit-context]');
  if(await panel.count() && !(await panel.evaluate(element=>element.open))) await panel.locator(':scope > summary').click();
}

export async function closeContextSelection(page){
  const dialog=page.locator('[data-native-context-dialog]');
  if(await dialog.count() && await dialog.evaluate(element=>element.open)){
    await dialog.press('Escape');
    await page.waitForFunction(()=>document.querySelector('[data-open-native-context]')===document.activeElement);
  }
}

export async function revealMissionCreation(page) {
  await revealBusinessContext(page);
  const panel = page.locator('[data-native-mission-create]');
  await panel.waitFor({state:'attached'});
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}

export async function revealContextSelection(page) {
  await openContextMenu(page);
  await page.locator('[data-context-loading="false"]').waitFor({state:'visible'});
  const panel = page.locator('[data-native-context-switch]');
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}

export async function revealBusinessContext(page) {
  await openContextMenu(page);
  await page.locator('[data-context-loading="false"]').waitFor();
  const panel = page.locator('[data-native-business-context]');
  await panel.waitFor();
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}

export async function revealAgendaSettings(page){
 const settings=page.locator('[data-agenda-settings]');
 if(await settings.count()&&!(await settings.evaluate(element=>element.open)))await settings.locator(':scope > summary').click();
}
