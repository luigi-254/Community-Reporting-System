/**
 * Citizen Portal Regression Tests
 * Verifies citizen portal remains functional after government portal fixes.
 */

const { chromium } = await import('playwright');

const FRONTEND = 'http://localhost:3003';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assertions = [];
let failures = 0;

function assert(condition, message) {
  if (condition) { console.log(`    ✓ ${message}`); assertions.push({ pass: true }); }
  else { console.log(`    ✗ ${message}`); assertions.push({ pass: false }); failures += 1; }
}

async function testCitizenLandingPage() {
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('CITIZEN PORTAL — Landing Page');
  console.log('════════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Citizen landing page loads');
  await page.goto(`${FRONTEND}/`, { waitUntil: 'networkidle' });
  await sleep(1000);
  assert(page.url().includes(FRONTEND.replace('http://','')), 'Landing page accessible');
  const hasCitizenHeading = await page.locator('h1, h2').count() > 0;
  assert(hasCitizenHeading, 'Citizen page has headings rendered');

  await browser.close();
  return failures;
}

async function testCitizenSignInPage() {
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('CITIZEN PORTAL — Sign-In Page');
  console.log('════════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Citizen sign-in page loads');
  await page.goto(`${FRONTEND}/sign-in`, { waitUntil: 'networkidle' });
  await sleep(1000);
  assert(page.url().includes('/sign-in'), 'Sign-in page accessible');
  const emailInput = await page.locator('input[type="email"]').count() > 0;
  assert(emailInput, 'Email input field present');
  const pwdInput = await page.locator('input[type="password"]').count() > 0;
  assert(pwdInput, 'Password input field present');

  await browser.close();
  return failures;
}

async function testCitizenReportIssuePage() {
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('CITIZEN PORTAL — Report Issue Page');
  console.log('════════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Citizen report-issue page loads');
  await page.goto(`${FRONTEND}/report-issue`, { waitUntil: 'networkidle' });
  await sleep(1000);
  assert(page.url().includes('/report-issue'), 'Report issue page accessible');
  const hasForm = await page.locator('form, input, textarea, select, button[type="submit"]').count() > 0;
  assert(hasForm, 'Report issue form elements present');

  await browser.close();
  return failures;
}

async function testAdminDashboardLanding() {
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('ADMIN DASHBOARD — Landing Page');
  console.log('════════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Admin dashboard landing page loads');
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle' });
  await sleep(1000);
  const url = page.url();
  assert(url.includes('localhost:3004'), 'Admin dashboard accessible (or redirects to login)');

  await browser.close();
  return failures;
}

async function main() {
  failures += await testCitizenLandingPage();
  failures += await testCitizenSignInPage();
  failures += await testCitizenReportIssuePage();
  failures += await testAdminDashboardLanding();

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('REGRESSION SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`Assertions: ${assertions.length} | Passed: ${assertions.filter(a => a.pass).length} | Failed: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
