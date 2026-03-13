import {expect, test} from '@playwright/test';

test('debug playing phase errors', async ({page}) => {
  test.setTimeout(120_000);

  const allConsole: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    allConsole.push(text);
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await page.goto('/', {waitUntil: 'networkidle', timeout: 60000});
  await page.waitForSelector('#root > *', {timeout: 30000});

  // Click START COOKING
  await page.getByText('START COOKING').click();
  await page.waitForTimeout(1000);

  // Click Medium
  const medium = page.getByText('Medium', {exact: false});
  await medium.first().click();

  // Wait and capture everything
  await page.waitForTimeout(10000);

  console.log('\n=== ALL CONSOLE MESSAGES ===');
  for (const msg of allConsole.slice(0, 50)) {
    console.log(msg.substring(0, 300));
  }

  console.log('\n=== ERRORS ===');
  for (const e of errors) {
    console.log(e.substring(0, 500));
  }

  console.log('\n=== ROOT STATE ===');
  const rootHtml = await page.innerHTML('#root');
  console.log('Root HTML length:', rootHtml.length);
  console.log('Root HTML:', rootHtml.substring(0, 1000));

  await page.screenshot({path: 'test-results/debug-playing.png'});

  expect(true).toBe(true);
});
