/**
 * E2E batch 2: DEPARTMENTAL_ADMIN, ADMIN, SUPER_ADMIN
 * Run with: node tests/e2e-batch-2.mjs
 */

const { chromium } = await import('playwright');

const FRONTEND = 'http://localhost:3001';
const PASSWORD = 'TestPassword123!';

const ROLES = [
  { role: 'DEPARTMENTAL_ADMIN', email: 'dept.admin.infra@example.com', route: '/government/departmental-admin', welcome: 'Department Administration', scope: 'Department:' },
  { role: 'ADMIN', email: 'admin.county@example.com', route: '/government/admin', welcome: 'Platform Administration', scope: 'System-wide' },
  { role: 'SUPER_ADMIN', email: 'admin.platform@example.com', route: '/government/super-admin', welcome: 'System Administration', scope: 'System-wide' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const assertions = [];
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`    ✓ ${message}`);
    assertions.push({ pass: true, message });
  } else {
    console.log(`    ✗ ${message}`);
    assertions.push({ pass: false, message });
    failures += 1;
  }
}

async function waitForRoute(page, expectedRoute, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (page.url().includes(expectedRoute)) return true;
    await sleep(300);
  }
  return false;
}

async function testRole(login) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`ROLE: ${login.role} (${login.email})`);
  console.log(`════════════════════════════════════════════════════════════════════`);

  // ── 1. Logged-out visit to /government redirects to /login ─────────
  console.log('\n[1] Logged-out protected route');
  await page.goto(`${FRONTEND}/government`, { waitUntil: 'networkidle' });
  assert(page.url().includes('/login'), 'redirects to /login when logged out');

  // ── 2. Sign in ─────────────────────────────────────────────────────
  console.log('\n[2] Sign in');
  await page.fill('#government-email', login.email);
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await sleep(2500);

  const urlOk = await waitForRoute(page, login.route);
  assert(urlOk, `auto-redirects to ${login.route} (got ${page.url()})`);

  // ── 3. Welcome heading ─────────────────────────────────────────────
  console.log('\n[3] Welcome heading');
  await sleep(2000);
  const welcomeLocator = page.locator(`h3:has-text("${login.welcome}")`);
  const welcomeCount = await welcomeLocator.count();
  assert(welcomeCount > 0, `welcome heading "${login.welcome}" is rendered`);

  // ── 4. Scope badge ─────────────────────────────────────────────────
  console.log('\n[4] Scope badge');
  await sleep(1000);
  const scopeLocator = page.locator(`text=${login.scope}`);
  const scopeCount = await scopeLocator.count();
  assert(scopeCount > 0, `scope badge contains "${login.scope}"`);

  // ── 5. Sidebar navigation ─────────────────────────────────────────
  console.log('\n[5] Sidebar navigation — every item opens correct content');
  await sleep(2000);

  const sidebarButtons = page.getByRole('button').filter({ has: page.locator('span') });
  const allButtons = await sidebarButtons.all();
  const sidebarItemTexts = [];
  for (const btn of allButtons) {
    const text = (await btn.innerText().catch(() => '')).trim();
    if (text && text !== 'Sign Out' && text !== 'My Profile' && text !== 'Notifications' && text !== 'Close navigation menu' && !sidebarItemTexts.includes(text)) {
      sidebarItemTexts.push(text);
    }
  }

  console.log(`    Found ${sidebarItemTexts.length} sidebar items: ${sidebarItemTexts.slice(0, 8).join(', ')}${sidebarItemTexts.length > 8 ? '...' : ''}`);

  for (const itemText of sidebarItemTexts) {
    try {
      const item = page.getByRole('button', { name: new RegExp(itemText, 'i') }).first();
      if ((await item.count()) === 0) continue;

      const beforeUrl = page.url();
      await item.click();
      await page.waitForLoadState('networkidle');
      await sleep(800);

      const afterUrl = page.url();
      const hasTabParam = afterUrl.includes('?tab=');
      const tabValue = hasTabParam ? afterUrl.split('?tab=')[1].split('&')[0] : '(same page)';

      assert(
        hasTabParam,
        `sidebar item "${itemText}" navigates to tab=${tabValue}`
      );
    } catch (err) {
      assert(false, `sidebar item "${itemText}" failed: ${err.message}`);
    }
  }

  // ── 6. Logout ──────────────────────────────────────────────────────
  console.log('\n[6] Logout');
  const signOut = page.getByRole('button', { name: /Sign Out/i }).first();
  if ((await signOut.count()) > 0) {
    await signOut.click();
    await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
    await sleep(1000);
    assert(page.url().includes('/login'), 'sign out redirects to /login');

    const cookies = await context.cookies(FRONTEND);
    const remaining = cookies.find((c) => c.name === 'crs_government_access_token' && c.value);
    assert(!remaining, 'session cookie cleared on sign out');
  } else {
    assert(false, 'no sign-out button found');
  }

  // ── 7. Console hygiene ─────────────────────────────────────────────
  console.log('\n[7] Console hygiene');
  const noise = consoleErrors.filter((t) => !t.includes('NEXT_REDIRECT') && !t.includes('Failed to load resource'));
  assert(noise.length === 0, `no unexpected console errors (${noise.length})`);

  await browser.close();
  return failures;
}

async function main() {
  let totalFailures = 0;

  for (const login of ROLES) {
    const roleFailures = await testRole(login);
    totalFailures += roleFailures;
  }

  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`E2E BATCH 2 TEST SUMMARY`);
  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`Total assertions: ${assertions.length}`);
  console.log(`Passed: ${assertions.filter((a) => a.pass).length}`);
  console.log(`Failed: ${failures}`);
  if (failures === 0) {
    console.log('\n✅ BATCH 2 ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failures} ASSERTION(S) FAILED`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
