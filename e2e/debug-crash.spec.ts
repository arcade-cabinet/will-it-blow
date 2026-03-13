import {expect, test} from '@playwright/test';

test('find exact crash source', async ({page}) => {
  test.setTimeout(60_000);

  const errors: string[] = [];
  page.on('pageerror', err => {
    errors.push(err.message + '\n' + err.stack?.substring(0, 1000));
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('GLTFLoader') && !text.includes('colormap')) {
        errors.push('[console] ' + text.substring(0, 500));
      }
    }
  });

  await page.goto('/', {waitUntil: 'networkidle', timeout: 60000});
  await page.waitForSelector('#root > *', {timeout: 30000});

  await page.getByText('START COOKING').click();
  await page.waitForTimeout(1000);
  await page.getByText('Medium', {exact: false}).first().click();
  await page.waitForTimeout(15000);

  console.log('\n=== CRASH ERRORS (non-GLTF) ===');
  for (const e of errors) console.log(e);

  expect(true).toBe(true);
});
