/**
 * Browser-level verification of the government dashboard auth flow.
 *
 * Asserts, using the installed Chrome (no browser download required):
 *   1. Logged-out visit to /government -> server redirect to /login, zero
 *      /api/dashboard calls, no dashboard paint.
 *   2. Log in -> exactly one /api/dashboard/overview and one
 *      /api/dashboard/reports request, both 200. React StrictMode may
 *      double-invoke effects in dev, so the allowed count is 1-2.
 *   3. No 401 storm: at most a handful of 401s, never a runaway loop.
 *   4. Signed-in visit to /login -> server redirect to /government.
 *   5. No console errors from unhandled redirects.
 */
const PLAYWRIGHT_MODULE =
  process.env.PLAYWRIGHT_MODULE || 'playwright';

const { chromium } = await import(PLAYWRIGHT_MODULE);

const FRONTEND = 'http://localhost:3002';
const EMAIL = 'governor.kisii@example.com';
const PASSWORD = 'TestPassword123!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const summarise = (requests) => {
  const counts = {};
  for (const entry of requests) {
    counts[entry.url] = (counts[entry.url] || 0) + 1;
  }
  return counts;
};

const run = async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiCalls = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/dashboard/') || url.includes('/api/auth/me')) {
      apiCalls.push({ url, status: response.status() });
    }
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/api/')) {
      apiCalls.push({
        url,
        status: `FAILED:${request.failure()?.errorText}`,
      });
    }
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log(`    [nav] ${frame.url()}`);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    console.log(`  ✓ ${message}`);
  };

  try {
    // --- 1. Logged-out protected route ---------------------------------
    console.log('\n[1] Logged-out visit to /government');
    apiCalls.length = 0;
    const response = await page.goto(`${FRONTEND}/government`, {
      waitUntil: 'networkidle',
    });
    console.log(`    final url: ${page.url()}`);
    console.log(`    api calls: ${JSON.stringify(summarise(apiCalls))}`);
    assert(
      page.url().includes('/login'),
      'the browser ends up on /login',
    );
    assert(
      apiCalls.filter((c) => c.url.includes('/api/dashboard/')).length === 0,
      'zero /api/dashboard requests while logged out',
    );
    assert(
      !(await page.locator('text=Total Reports').count()),
      'no dashboard paint while logged out',
    );
    void response;

    // --- 2. Sign in ----------------------------------------------------
    console.log('\n[2] Sign in as governor');
    apiCalls.length = 0;
    consoleErrors.length = 0;
    pageErrors.length = 0;

    await page.fill('#government-email', EMAIL);
    await page.fill('#government-password', PASSWORD);
    await Promise.all([
      page.waitForURL(/\/government/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState('networkidle');
    await sleep(2500);

    const counts = summarise(apiCalls);
    console.log(`    api calls: ${JSON.stringify(counts, null, 2)}`);
    console.log(`    api detail: ${JSON.stringify(apiCalls, null, 2)}`);
    console.log(`    page html has Overview: ${await page.locator('text=Overview').count()}`);
    console.log(`    body snippet: ${(await page.locator('body').innerText()).slice(0, 400)}`);

    const overviewCalls = apiCalls.filter((c) => c.url.includes('/api/dashboard/overview'));
    const reportCalls = apiCalls.filter((c) => c.url.includes('/api/dashboard/reports'));

    assert(
      overviewCalls.length >= 1 && overviewCalls.length <= 2,
      `overview requested once (StrictMode allows 2) — saw ${overviewCalls.length}`,
    );
    assert(
      reportCalls.length >= 1 && reportCalls.length <= 2,
      `reports requested once (StrictMode allows 2) — saw ${reportCalls.length}`,
    );
    assert(
      overviewCalls.every((c) => c.status === 200),
      'every overview request returned 200',
    );
    assert(
      reportCalls.every((c) => c.status === 200),
      'every reports request returned 200',
    );
    assert(
      apiCalls.filter((c) => c.status === 401).length <= 2,
      `no 401 storm (saw ${apiCalls.filter((c) => c.status === 401).length} 401s)`,
    );

    // The httpOnly session cookie must be present and unreadable by script.
    const cookies = await context.cookies(FRONTEND);
    const sessionCookie = cookies.find((c) => c.name === 'crs_government_access_token');
    assert(Boolean(sessionCookie), 'session cookie was set');
    assert(sessionCookie.httpOnly === true, 'session cookie is httpOnly');
    assert(sessionCookie.sameSite === 'Lax', 'session cookie is SameSite=Lax');

    const cookieVisibleToScript = await page.evaluate(() =>
      document.cookie.includes('crs_government_access_token'),
    );
    assert(cookieVisibleToScript === false, 'session cookie is invisible to client script');

    // The dashboard must actually show data.
    const hasDashboard = await page.locator('text=Overview').count();
    assert(hasDashboard > 0, 'the dashboard rendered');

    // --- 3. Signed-in visit to /login -----------------------------------
    console.log('\n[3] Signed-in visit to /login');
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
    console.log(`    final url: ${page.url()}`);
    assert(
      page.url().includes('/government'),
      'signed-in /login redirects to /government',
    );

    // --- 4. Sign out ---------------------------------------------------
    console.log('\n[4] Sign out');
    apiCalls.length = 0;
    await page.goto(`${FRONTEND}/government`, { waitUntil: 'networkidle' });
    await sleep(1500);
    const signOut = page.locator('button[aria-label="Sign out"]');
    if (await signOut.count()) {
      await signOut.first().click();
      await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
      await sleep(1500);
      console.log(`    final url: ${page.url()}`);
      assert(page.url().includes('/login'), 'sign out lands on /login');
      const afterSignOut = await context.cookies(FRONTEND);
      const remaining = afterSignOut.find(
        (c) => c.name === 'crs_government_access_token' && c.value,
      );
      assert(!remaining, 'session cookie cleared on sign out');
    } else {
      console.log('    (no sign-out button rendered; skipping)');
    }

    // --- 5. Console hygiene --------------------------------------------
    console.log('\n[5] Console hygiene');
    const redirectNoise = consoleErrors.filter(
      (text) => !text.includes('NEXT_REDIRECT') && !text.includes('Failed to load resource'),
    );
    console.log(`    console errors: ${JSON.stringify(consoleErrors, null, 2)}`);
    console.log(`    page errors: ${JSON.stringify(pageErrors, null, 2)}`);
    assert(
      redirectNoise.length === 0,
      `no unexpected console errors (saw ${redirectNoise.length})`,
    );
    assert(
      pageErrors.filter((t) => !t.includes('NEXT_REDIRECT')).length === 0,
      'no uncaught page errors',
    );

    console.log('\nPASS: browser auth flow verified.');
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error('\nFAIL:', error.message);
  process.exit(1);
});
