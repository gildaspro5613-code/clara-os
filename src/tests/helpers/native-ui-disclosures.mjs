export async function revealAccountSettings(page) {
  const menu=page.locator('#native-account-menu');
  if (!(await menu.evaluate(element=>element.open))) await menu.locator(':scope > summary').click();
}

export async function revealMissionCreation(page) {
  await revealBusinessContext(page);
  const panel = page.locator('[data-native-mission-create]');
  await panel.waitFor({state:'attached'});
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}

export async function revealContextSelection(page) {
  await revealAccountSettings(page);
  await page.locator('[data-context-loading="false"]').waitFor();
  const panel = page.locator('[data-native-context-switch]');
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}

export async function revealBusinessContext(page) {
  await revealAccountSettings(page);
  await page.locator('[data-context-loading="false"]').waitFor();
  const panel = page.locator('[data-native-business-context]');
  await panel.waitFor();
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
}
