/**
 * E2E Batch 4: Account switching isolation + Direct URL access
 */

const { chromium } = await import('playwright');

const FRONTEND = 'http://localhost:3001';
const PASSWORD = 'TestPassword123!';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assertions = [];
let failures = 0;

function assert(condition, message) {
  if (condition) { console.log(`    ✓ ${message}`); assertions.push({ pass: true }); }
  else { console.log(`    ✗ ${message}`); assertions.push({ pass: false }); failures += 1; }
}

async function testAccountSwitching() {
  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`ACCOUNT SWITCHING — session isolation`);
  console.log(`════════════════════════════════════════════════════════════════════`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Login as Governor');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.fill('#government-email', 'governor.kisii@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  // Poll for redirect up to 10 seconds
  {
    let redirected = false;
    for (let i = 0; i < 20; i++) {
      if (page.url().includes('/government/governor')) { redirected = true; break; }
      await sleep(500);
    }
    assert(redirected, 'Governor lands on governor dashboard');
  }
  await sleep(1000);
  assert(await page.locator('h3:has-text("County Executive Oversight")').count() > 0,
    'Governor welcome heading correct');

  console.log('\n[2] Logout Governor');
  await page.getByRole('button', { name: /Log Out|Sign Out/i }).first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await sleep(1000);
  assert(page.url().includes('/login'), 'Governor signed out');

  console.log('\n[3] Login as Technical Head (same context)');
  // Force navigation to login page and wait for form to be ready
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await sleep(1000);
  // Verify we're on login page (not redirected away)
  let onLogin = false;
  for (let i = 0; i < 10; i++) {
    if (page.url().includes('/login')) { onLogin = true; break; }
    await sleep(500);
  }
  if (!onLogin) {
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
    await sleep(1000);
  }
  assert(page.url().includes('/login'), 'On login page before Tech Head sign-in');
  await page.fill('#government-email', 'tech.head.infra@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  // Poll for redirect up to 10 seconds
  {
    let redirected = false;
    for (let i = 0; i < 20; i++) {
      if (page.url().includes('/government/technical-head')) { redirected = true; break; }
      await sleep(500);
    }
    assert(redirected, 'Tech Head lands on technical-head dashboard');
  }
  await sleep(1000);
  assert(await page.locator('h3:has-text("Technical Operations")').count() > 0,
    'Tech Head welcome heading correct');

  await sleep(500);
  const govLeak = await page.locator('text="County Executive Oversight — Kisii County"').count();
  assert(govLeak === 0, 'No Governor content leaked into Tech Head session');

  await browser.close();
  return failures;
}

async function testDirectUrlAccess() {
  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`DIRECT DASHBOARD URL ACCESS (authenticated)`);
  console.log(`════════════════════════════════════════════════════════════════════`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n[1] Login as CECM');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await sleep(1000);
  await page.fill('#government-email', 'cecm.infrastructure@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  // Poll for redirect up to 10 seconds
  {
    let redirected = false;
    for (let i = 0; i < 20; i++) {
      if (page.url().includes('/government/cecm')) { redirected = true; break; }
      await sleep(500);
    }
    assert(redirected, 'CECM logged in successfully');
  }
  await sleep(1000);
  const cookies = await context.cookies(FRONTEND);
  assert(Boolean(cookies.find((c) => c.name === 'crs_government_access_token')),
    'session cookie present after login');

  console.log('\n[2] Direct access to another role URL (should redirect back)');
  await page.goto(`${FRONTEND}/government/governor`, { waitUntil: 'networkidle' });
  await sleep(1500);
  assert(page.url().includes('/government/cecm'),
    `direct access redirects back to CECM (got ${page.url()})`);

  await browser.close();
  return failures;
}

async function main() {
  failures += await testAccountSwitching();
  failures += await testDirectUrlAccess();

  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`BATCH 4 SUMMARY`);
  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`Assertions: ${assertions.length} | Passed: ${assertions.filter(a => a.pass).length} | Failed: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
