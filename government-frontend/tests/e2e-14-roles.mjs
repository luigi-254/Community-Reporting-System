/**
 * Comprehensive Playwright E2E test for all 14 government roles.
 *
 * Covers:
 *   1. Login for each role → auto-redirect to correct role-specific dashboard
 *   2. Dashboard renders correct welcome heading + scope badge
 *   3. Every sidebar item opens correct content (verified by URL tab param)
 *   4. Logout clears session and redirects to /login
 *   5. Account switching — no session leakage between accounts
 *   6. Direct dashboard URL access — URL role ≠ session role redirects to own dashboard
 *
 * Run with: node tests/e2e-14-roles.mjs
 */

const { chromium } = await import('playwright');

const FRONTEND = 'http://localhost:3001';
const PASSWORD = 'TestPassword123!';

// All 14 government test accounts (from prisma/dev-seed.js)
const ROLES = [
  { role: 'GOVERNOR', email: 'governor.kisii@example.com', route: '/government/governor', welcome: 'County Executive Oversight', scope: 'County-wide' },
  { role: 'CECM', email: 'cecm.infrastructure@example.com', route: '/government/cecm', welcome: 'Department Oversight', scope: 'Department:' },
  { role: 'CHIEF_OFFICER', email: 'chief.officer.infra@example.com', route: '/government/chief-officer', welcome: 'Department Operations', scope: 'Department:' },
  { role: 'TECHNICAL_HEAD', email: 'tech.head.infra@example.com', route: '/government/technical-head', welcome: 'Technical Operations', scope: 'Department:' },
  { role: 'TECHNICAL_SUPERVISOR', email: 'tech.supervisor.infra@example.com', route: '/government/technical-supervisor', welcome: 'Field Team Supervision', scope: 'Ward:' },
  { role: 'SUBCOUNTY_ADMIN', email: 'subcounty.admin.bobasi@example.com', route: '/government/sub-county-administrator', welcome: 'Sub-County Administration', scope: 'Sub-County:' },
  { role: 'WARD_ADMIN', email: 'ward.admin.bassicentral@example.com', route: '/government/ward-administrator', welcome: 'Ward Administration', scope: 'Ward:' },
  { role: 'FIELD_OFFICER', email: 'field.officer.1@example.com', route: '/government/field-officer', welcome: 'Field Operations', scope: 'Personal:' },
  { role: 'DISASTER_MANAGER', email: 'disaster.manager@example.com', route: '/government/disaster-manager', welcome: 'Disaster Management', scope: 'Department:' },
  { role: 'ENFORCEMENT_OFFICER', email: 'enforcement.officer@example.com', route: '/government/enforcement-officer', welcome: 'Enforcement Operations', scope: 'Department:' },
  { role: 'OFFICER', email: 'officer.general@example.com', route: '/government/officer', welcome: 'Government Officer', scope: 'Personal:' },
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

  // Get all sidebar buttons (inside the nav with aria-label="Government navigation")
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

  // Test each sidebar item by clicking and checking that URL changes with tab param
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

async function testAccountSwitching() {
  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`ACCOUNT SWITCHING — session isolation`);
  console.log(`════════════════════════════════════════════════════════════════════`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login as Governor
  console.log('\n[1] Login as Governor');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.fill('#government-email', 'governor.kisii@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await sleep(2500);
  const govUrlOk = await waitForRoute(page, '/government/governor');
  assert(govUrlOk, 'Governor lands on governor dashboard');
  await sleep(2000);
  const govWelcome = await page.locator('h3:has-text("County Executive Oversight")').count();
  assert(govWelcome > 0, 'Governor welcome heading correct');

  // Logout
  console.log('\n[2] Logout Governor');
  await page.getByRole('button', { name: /Sign Out/i }).first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
  assert(page.url().includes('/login'), 'Governor signed out');

  // Login as Technical Head — same browser context, no session leakage
  console.log('\n[3] Login as Technical Head (same context)');
  await page.fill('#government-email', 'tech.head.infra@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await sleep(2500);
  const thUrlOk = await waitForRoute(page, '/government/technical-head');
  assert(thUrlOk, 'Tech Head lands on technical-head dashboard');
  await sleep(2000);
  const thWelcome = await page.locator('h3:has-text("Technical Operations")').count();
  assert(thWelcome > 0, 'Tech Head welcome heading correct');

  // Verify NO Governor content leaks
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

  // Login as CECM
  console.log('\n[1] Login as CECM');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.fill('#government-email', 'cecm.infrastructure@example.com');
  await page.fill('#government-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await sleep(2500);
  const cecmUrlOk = await waitForRoute(page, '/government/cecm');
  assert(cecmUrlOk, 'CECM logged in successfully');

  // Verify session cookie is present
  const cookies = await context.cookies(FRONTEND);
  const sessionCookie = cookies.find((c) => c.name === 'crs_government_access_token');
  assert(Boolean(sessionCookie), 'session cookie present after login');

  // Directly navigate to a different role's URL — should redirect back to own role
  console.log('\n[2] Direct access to another role URL (should redirect to own dashboard)');
  await page.goto(`${FRONTEND}/government/governor`, { waitUntil: 'networkidle' });
  await sleep(2500);
  const finalUrl = page.url();
  assert(
    finalUrl.includes('/government/cecm'),
    `direct access to governor URL redirects back to CECM (got ${finalUrl})`
  );

  await browser.close();
  return failures;
}

async function main() {
  let totalFailures = 0;

  // Test each role
  for (const login of ROLES) {
    const roleFailures = await testRole(login);
    totalFailures += roleFailures;
  }

  // Test account switching
  totalFailures += await testAccountSwitching();

  // Test direct URL access
  totalFailures += await testDirectUrlAccess();

  // Summary
  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`E2E 14-ROLE TEST SUMMARY`);
  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`Total assertions: ${assertions.length}`);
  console.log(`Passed: ${assertions.filter((a) => a.pass).length}`);
  console.log(`Failed: ${failures}`);
  if (failures === 0) {
    console.log('\n✅ ALL 14-ROLE E2E TESTS PASSED');
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
