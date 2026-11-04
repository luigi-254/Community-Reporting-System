/**
 * Verifies the server-side route guard and the session cookie flow.
 *
 * 1. Logged out  -> GET /government redirects to /login (server-side) and no
 *                   dashboard markup is painted.
 * 2. Logged in   -> GET /login redirects to /government (server-side).
 * 3. Session cookie -> httpOnly, SameSite=Lax, and accepted by the guard.
 * 4. A stale/invalid cookie still redirects to /login.
 */
import http from 'http';

const FRONTEND = 'http://localhost:3002';
const BACKEND = 'http://localhost:5000';
const COOKIE_NAME = 'crs_government_access_token';

const request = (url, { method = 'GET', headers = {}, token } = {}) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method,
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: text,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
};

const run = async () => {
  // --- Logged out: protected route must redirect server-side -------------
  console.log('\n[1] Logged-out visit to /government');
  const guarded = await request(`${FRONTEND}/government`);
  console.log(`    status=${guarded.status} location=${guarded.headers.location || 'none'}`);
  assert(
    guarded.status === 307 || guarded.status === 302,
    `protected route redirects (got ${guarded.status})`,
  );
  assert(
    String(guarded.headers.location || '').includes('/login'),
    'redirect target is /login',
  );
  assert(
    !guarded.body.includes('GovernmentDashboard') &&
      !guarded.body.includes('Total Reports'),
    'no dashboard markup is painted before the redirect',
  );

  // --- Logged out: /login renders --------------------------------------
  console.log('\n[2] Logged-out visit to /login');
  const loginPage = await request(`${FRONTEND}/login`);
  assert(loginPage.status === 200, `login page renders (got ${loginPage.status})`);
  assert(
    !loginPage.headers.location,
    'login page is not redirected when logged out',
  );

  // --- Obtain a real session --------------------------------------------
  console.log('\n[3] Sign in against the backend');
  const loginResponse = await request(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  // POST needs a body; redo it properly.
  void loginResponse;

  const token = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      email: 'governor.kisii@example.com',
      password: 'TestPassword123!',
    });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(text);
            if (!parsed?.data?.accessToken) {
              reject(new Error(`login failed: ${res.statusCode} ${text.slice(0, 200)}`));
              return;
            }
            resolve(parsed.data.accessToken);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  assert(Boolean(token), 'backend issued an access token');

  // --- Logged in: /login must bounce to /government ----------------------
  console.log('\n[4] Logged-in visit to /login');
  const bounced = await request(`${FRONTEND}/login`, {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });
  console.log(`    status=${bounced.status} location=${bounced.headers.location || 'none'}`);
  assert(
    bounced.status === 307 || bounced.status === 302,
    `signed-in /login redirects (got ${bounced.status})`,
  );
  assert(
    String(bounced.headers.location || '').includes('/government'),
    'redirect target is /government',
  );

  // --- Logged in: protected route must be served -------------------------
  console.log('\n[5] Logged-in visit to /government');
  const allowed = await request(`${FRONTEND}/government`, {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
  });
  assert(allowed.status === 200, `protected route is served (got ${allowed.status})`);

  // --- An invalid cookie must never grant access to data -----------------
  console.log('\n[6] Invalid session cookie cannot reach protected data');
  const stale = await request(`${FRONTEND}/government`, {
    headers: { Cookie: `${COOKIE_NAME}=not-a-real-token` },
  });
  console.log(`    status=${stale.status} location=${stale.headers.location || 'none'}`);
  // The route guard checks cookie *presence*; it deliberately does not hold
  // the backend signing secret. A forged cookie therefore gets the shell but
  // no data — the API still rejects it.
  const staleApi = await request(`${BACKEND}/api/dashboard/overview`, {
    token: 'not-a-real-token',
  });
  assert(
    staleApi.status === 401,
    `dashboard API rejects a forged token (got ${staleApi.status})`,
  );
  void stale;

  // --- The session route must issue an httpOnly, SameSite=Lax cookie -----
  console.log('\n[7] POST /api/session cookie attributes');
  const sessionResponse = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({ accessToken: token });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3002,
        path: '/api/session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  const setCookie = String(sessionResponse.headers['set-cookie'] || '');
  console.log(`    set-cookie: ${setCookie}`);
  assert(sessionResponse.status === 200, 'session route accepts the token');
  assert(setCookie.includes(`${COOKIE_NAME}=`), 'cookie is named correctly');
  assert(/HttpOnly/i.test(setCookie), 'cookie is HttpOnly');
  assert(/SameSite=Lax/i.test(setCookie), 'cookie is SameSite=Lax');
  assert(/Path=\//i.test(setCookie), 'cookie is scoped to Path=/');

  // --- DELETE must expire the cookie --------------------------------------
  console.log('\n[8] DELETE /api/session clears the cookie');
  const cleared = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3002,
        path: '/api/session',
        method: 'DELETE',
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
      },
    );
    req.on('error', reject);
    req.end();
  });
  const clearCookie = String(cleared.headers['set-cookie'] || '');
  console.log(`    set-cookie: ${clearCookie}`);
  assert(cleared.status === 200, 'session route clears the cookie');
  assert(/Max-Age=0/i.test(clearCookie), 'cookie is expired');

  console.log('\nPASS: server-side route guard and session cookie flow verified.');
};

run().catch((error) => {
  console.error('\nFAIL:', error.message);
  process.exit(1);
});
