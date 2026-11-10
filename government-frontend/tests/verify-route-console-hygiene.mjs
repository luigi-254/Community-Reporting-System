/**
 * Checks that every public route loads without console errors.
 */
const PLAYWRIGHT_MODULE = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(PLAYWRIGHT_MODULE);

const FRONTEND = 'http://localhost:3001';
const ROUTES = ['/', '/login', '/government'];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();

let failures = 0;
for (const route of ROUTES) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().split('\n')[0]);
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message.split('\n')[0]}`));

  await page.goto(`${FRONTEND}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const url = page.url();
  if (errors.length === 0) {
    console.log(`  ✓ ${route} -> ${url} : no console errors`);
  } else {
    failures += 1;
    console.log(`  ✗ ${route} -> ${url}`);
    for (const e of errors) console.log(`      ${e}`);
  }
  await page.close();
}

await browser.close();
if (failures) {
  console.log(`\nFAIL: ${failures} route(s) produced console errors.`);
  process.exit(1);
}
console.log('\nPASS: all public routes load cleanly.');
