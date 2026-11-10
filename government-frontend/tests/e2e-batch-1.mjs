/**
 * E2E Batch 1: GOVERNOR, CECM, CHIEF_OFFICER, TECHNICAL_HEAD, TECHNICAL_SUPERVISOR
 */

const { chromium } = await import('playwright');

const FRONTEND = 'http://localhost:3001';
const PASSWORD = 'TestPassword123!';

const ROLES = [
  { role: 'GOVERNOR', email: 'governor.kisii@example.com', route: '/government/governor', welcome: 'County Executive Oversight', scope: 'County-wide' },
  { role: 'CECM', email: 'cecm.infrastructure@example.com', route: '/government/cecm', welcome: 'Department Oversight', scope: 'Department:' },
  { role: 'CHIEF_OFFICER', email: 'chief.officer.infra@example.com', route: '/government/chief-officer', welcome: 'Department Operations', scope: 'Department:' },
  { role: 'TECHNICAL_HEAD', email: 'tech.head.infra@example.com', route: '/government/technical-head', welcome: 'Technical Operations', scope: 'Department:' },
  { role: 'TECHNICAL_SUPERVISOR', email: 'tech.supervisor.infra@example.com', route: '/government/technical-supervisor', welcome: 'Field Team Supervision', scope: 'Ward:' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assertions = [];
let failures = 0;

function assert(condition, message) {
  if (condition) { console.log(`    ✓ ${message}`); assertions.push({ pass: true }); }
  else { console.log(`    ✗ ${message}`); assertions.push({ pass: false }); failures += 1; }
}

async function testRole(login) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`ROLE: ${login.role} (${login.email})`);
  console.log(`════════════════════════════════════════════════════════════════════`);

  // Logged-out protected route
  console.log('\n[1] Logged-out protected route');
  await page.goto(`${FRONTEND}/government`, { waitUntil: 'networkidle' });
  assert(page.url().includes('/login'), 'redirects to /login when logged out');

  // Sign in
  console.log('\n[2] Sign in');
  await page.fill('#government-email', login.email);
  await page.fill('#government-password', PASSWORD);
  await Promise.all([
    page.waitForURL(`**${login.route}`, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
  await sleep(1000);

  assert(page.url().includes(login.route), `auto-redirects to ${login.route} (got ${page.url()})`);

  // Welcome heading
  console.log('\n[3] Welcome heading');
  await sleep(1000);
  assert(await page.locator(`h3:has-text("${login.welcome}")`).count() > 0,
    `welcome heading "${login.welcome}" rendered`);

  // Scope badge
  console.log('\n[4] Scope badge');
  await sleep(500);
  assert(await page.locator(`text=${login.scope}`).count() > 0,
    `scope badge contains "${login.scope}"`);

  // Sidebar navigation
  console.log('\n[5] Sidebar navigation');
  await sleep(1000);
  const allButtons = await page.getByRole('button').all();
  const sidebarItemTexts = [];
  for (const btn of allButtons) {
    const text = (await btn.innerText().catch(() => '')).trim();
    if (text && !['Sign Out','Log Out','My Profile','Notifications','Close navigation menu','View Details'].includes(text) && !sidebarItemTexts.includes(text)) {
      sidebarItemTexts.push(text);
    }
  }
  console.log(`    Found ${sidebarItemTexts.length} sidebar items`);

  for (const itemText of sidebarItemTexts) {
    try {
      const item = page.getByRole('button', { name: new RegExp(itemText, 'i') }).first();
      if ((await item.count()) === 0) continue;
      const isActive = (await item.getAttribute('aria-current')) === 'page';
      if (isActive) {
        console.log(`    ⊚ sidebar item "${itemText}" already active (skipping navigation)`);
        continue;
      }
      const beforeUrl = page.url();
      await item.click();
      await page.waitForLoadState('networkidle');
      await sleep(600);
      const afterUrl = page.url();
      assert(afterUrl.includes('?tab=') || afterUrl !== beforeUrl,
        `sidebar item "${itemText}" navigates`);
    } catch (err) {
      assert(false, `sidebar item "${itemText}" failed: ${err.message}`);
    }
  }

  // Logout
  console.log('\n[6] Logout');
  const signOut = page.getByRole('button', { name: /Log Out|Sign Out/i }).first();
  if ((await signOut.count()) > 0) {
    await signOut.click();
    await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
    await sleep(800);
    assert(page.url().includes('/login'), 'sign out redirects to /login');
    const cookies = await context.cookies(FRONTEND);
    assert(!cookies.find((c) => c.name === 'crs_government_access_token' && c.value),
      'session cookie cleared on sign out');
  } else {
    assert(false, 'no sign-out button found');
  }

  // Console hygiene
  console.log('\n[7] Console hygiene');
  const noise = consoleErrors.filter((t) => !t.includes('NEXT_REDIRECT') && !t.includes('Failed to load resource'));
  assert(noise.length === 0, `no unexpected console errors (${noise.length})`);

  await browser.close();
  return failures;
}

async function main() {
  for (const login of ROLES) {
    failures += await testRole(login);
  }

  console.log(`\n════════════════════════════════════════════════════════════════════`);
  console.log(`BATCH 1 SUMMARY`);
  console.log(`════════════════════════════════════════════════════════════════════`);
  console.log(`Assertions: ${assertions.length} | Passed: ${assertions.filter(a => a.pass).length} | Failed: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
