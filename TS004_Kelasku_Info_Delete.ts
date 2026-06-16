import 'dotenv/config';

import { chromium, errors, type Page } from 'playwright';
import {
  clickFirstAvailable,
  delay,
  EmailSender,
  FAILED,
  loadBaseConfig,
  loadEmailConfig,
  login,
  openKelaskuMenu,
  PdfReport,
  takeScreenshot,
  TestResult,
  waitForSpinnerToDisappear,
  type BaseTestConfig,
} from './automation_shared.js';

type TestConfig = BaseTestConfig;

async function runKelaskuInfoDeleteTest(config: TestConfig): Promise<TestResult> {
  const result = new TestResult();
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, config, result);
    await deleteKelaskuInfo(page, config, result);
    await delay(config.waitAfterActionMs);
    await takeScreenshot(page, config.screenshotPath);
  } finally {
    await context.close();
    await browser.close();
  }

  return result;
}

async function deleteKelaskuInfo(page: Page, config: TestConfig, result: TestResult): Promise<void> {
  try {
    await waitForSpinnerToDisappear(page, config, result);
    await openKelaskuMenu(page, config, result);

    await clickDeleteIcon(page, config, result);
  } catch (error) {
    if (error instanceof errors.TimeoutError) {
      result.addLog('Failed to complete Kelasku info delete steps.', FAILED);
    }
    throw error;
  }
}

async function clickDeleteIcon(page: Page, config: TestConfig, result: TestResult): Promise<void> {
  const deleteSelectors = [
    ["button role 'trash'", page.getByRole('button', { name: 'trash' })],
    ["button role 'delete'", page.getByRole('button', { name: 'delete' })],
    ["button role 'Hapus'", page.getByRole('button', { name: 'Hapus' })],
    ['Ant Design delete icon', page.locator('button:has(.anticon-delete)').first()],
    ['SVG delete icon', page.locator("button:has(svg[data-icon='delete'])").first()],
    ['SVG trash icon', page.locator("button:has(svg[data-icon='trash'])").first()],
  ] as const;

  await dumpKelaskuButtons(page, 'before delete click', result);

  try {
    await clickFirstAvailable([...deleteSelectors], config.timeoutMs);
    result.addLog('Clicked on delete icon.');
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    result.addLog('Delete icon not found. Opening class detail first.');
    await openClassDetail(page, config, result);
    await dumpKelaskuButtons(page, 'after class detail opened', result);
    await clickFirstAvailable([...deleteSelectors], config.timeoutMs);
    result.addLog('Clicked on delete icon after opening class detail.');
  }

  await confirmDeleteIfNeeded(page, result);
}

async function dumpKelaskuButtons(page: Page, label: string, result: TestResult): Promise<void> {
  const buttons = await page.locator('button').evaluateAll((buttonElements) =>
    buttonElements.map((button, index) => ({
      index,
      text: (button as HTMLButtonElement).innerText,
      ariaLabel: button.getAttribute('aria-label'),
      title: button.getAttribute('title'),
      className: button.className,
      html: button.outerHTML.slice(0, 500),
    })),
  );

  console.log(`DEBUG: Buttons found ${label}:`);
  buttons.forEach((button) => console.log(button));
  result.addLog(`Dumped ${buttons.length} buttons ${label} for selector debugging.`);
}

async function openClassDetail(page: Page, config: TestConfig, result: TestResult): Promise<void> {
  const detailSelectors = [
    ['open icon image', page.locator('button:has(img[alt="open-icon"])').first()],
    ['open icon img', page.locator('img[alt="open-icon"]').first()],
    ['first non-disabled right button', page.locator('button:not([disabled]):has(.bi-chevron-right)').first()],
    ['pagination right', page.locator("button:not([disabled]):has(svg[data-icon='right'])").first()],
  ] as const;

  await clickFirstAvailable([...detailSelectors], config.timeoutMs);
  result.addLog('Clicked on class detail/open button.');
  await delay(3000);
  result.addLog('Waited for class detail page to load.');
  await enterClassIfNeeded(page, config, result);
}

async function enterClassIfNeeded(page: Page, config: TestConfig, result: TestResult): Promise<void> {
  const enterClassButton = page.getByRole('button', { name: 'Masuk' });

  if ((await enterClassButton.count()) === 0) {
    result.addLog("No 'Masuk' button found after class detail opened. Continuing.");
    return;
  }

  const beforeUrl = page.url();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const button = enterClassButton.first();
    await button.scrollIntoViewIfNeeded({ timeout: config.timeoutMs }).catch(() => undefined);

    try {
      await button.click({ timeout: config.timeoutMs });
    } catch {
      await button.click({ timeout: config.timeoutMs, force: true });
    }

    result.addLog(`Clicked on 'Masuk' button in class detail. Attempt ${attempt}.`);
    await page.waitForLoadState('networkidle', { timeout: config.timeoutMs }).catch(() => undefined);
    await delay(3000);

    const afterUrl = page.url();
    const stillHasMasuk = (await enterClassButton.count()) > 0;
    const hasWorkspaceIndicator = (await page.locator("button:has(svg[data-icon='delete']), button:has(.anticon-delete), button:has(svg[data-icon='edit']), button:has(.anticon-edit), iframe[title*='Rich Text']").count()) > 0;

    result.addLog(`Class enter state after attempt ${attempt}: urlChanged=${beforeUrl !== afterUrl}, stillHasMasuk=${stillHasMasuk}, hasWorkspaceIndicator=${hasWorkspaceIndicator}.`);

    if (!stillHasMasuk || hasWorkspaceIndicator || beforeUrl !== afterUrl) {
      result.addLog('Class workspace appears loaded. Continuing.');
      return;
    }
  }

  await dumpMainContent(page, result);
}

async function dumpMainContent(page: Page, result: TestResult): Promise<void> {
  const pageState = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    mainText: (document.querySelector('main')?.textContent ?? document.body.textContent ?? '').trim().slice(0, 1500),
    buttons: [...document.querySelectorAll('button')].map((button, index) => ({
      index,
      text: button.innerText,
      ariaLabel: button.getAttribute('aria-label'),
      disabled: button.hasAttribute('disabled'),
      className: button.className,
      html: button.outerHTML.slice(0, 400),
    })),
  }));

  console.log('DEBUG: Page state after attempting to enter class:');
  console.log(pageState);
  result.addLog('Dumped page state after attempting to enter class.');
}

async function confirmDeleteIfNeeded(page: Page, result: TestResult): Promise<void> {
  const confirmSelectors = [
    ["confirm 'Hapus'", page.getByRole('button', { name: 'Hapus' })],
    ["confirm 'Ya'", page.getByRole('button', { name: 'Ya' })],
    ["confirm 'OK'", page.getByRole('button', { name: 'OK' })],
  ] as const;

  try {
    await clickFirstAvailable([...confirmSelectors], 2000);
    result.addLog('Confirmed delete action.');
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    result.addLog('No delete confirmation dialog found. Continuing.');
  }
}

async function main(): Promise<void> {
  const config = loadBaseConfig('screenshot4_kelasku_info_delete.png', 'test_report_kelasku_info_delete.pdf');
  let result: TestResult;

  try {
    result = await runKelaskuInfoDeleteTest(config);
  } catch (error) {
    console.error(`Test stopped because required step failed: ${String(error)}`);
    result = new TestResult();
    result.addLog('Test stopped because required step failed.', FAILED);
  }

  await new PdfReport(
    'Kelasku Info Delete Test Report',
    'TS004 Kelasku Info Delete',
    'TS004 Kelasku Info Delete Test Result',
    'Automated validation for deleting Kelasku info, including login, Kelasku navigation, delete action, optional confirmation handling, and evidence capture.',
  ).generate(result, config.screenshotPath, config.reportPath);
  await new EmailSender(loadEmailConfig()).sendAttachment(config.reportPath);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
