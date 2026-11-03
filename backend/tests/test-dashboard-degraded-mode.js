import http from 'http';
import app from '../index.js';

process.env.NODE_ENV = 'test';
const port = 5086;

const request = (method, path, body, token) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const server = app.listen(port, async () => {
  try {
    const login = await request('POST', '/api/auth/login', {
      email: 'governor.kisii@example.com',
      password: 'TestPassword123!',
    });
    if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
    const token = login.body?.data?.accessToken;

    const started = Date.now();
    const overview = await request('GET', '/api/dashboard/overview', null, token);
    const elapsed = Date.now() - started;

    if (overview.status !== 200) throw new Error('overview failed');
    const data = overview.body?.data || {};
    console.log('overview elapsed ms:', elapsed);
    console.log('overview.degraded:', data.degraded);
    console.log('overview.openEscalations:', data.openEscalations);
    console.log('overview.totalReports:', data.totalReports);
    console.log('overview.scope:', JSON.stringify(data.scope));

    if (data.degraded !== false) throw new Error('expected degraded=false against a healthy database');
    if (elapsed >= 200) throw new Error(`overview too slow: ${elapsed}ms (expected <200ms)`);

    const health = await request('GET', '/api/dashboard/health', null, token);
    if (health.status !== 200) throw new Error('health endpoint failed');
    console.log('health.degraded:', health.body?.data?.degraded);
    console.log('health.totalDbErrors:', health.body?.data?.totalDbErrors);
    console.log('health.operations:', JSON.stringify(health.body?.data?.operations));

    const escalations = await request('GET', '/api/escalations', null, token);
    if (escalations.status !== 200) throw new Error('escalations failed');
    console.log('escalations.degraded:', escalations.body?.degraded);
    console.log('escalations.total:', escalations.body?.total);

    console.log('PASS: overview is live, fast, and reports degraded=false.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('FAIL:', error.message);
    server.close(() => process.exit(1));
  }
});
