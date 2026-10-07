import http from 'http';

process.env.NODE_ENV = 'test';
process.env.PORT = '5055';

import app from './index.js';

let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      ...(postData && {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }),
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5055,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING ESM AUTH SUITE TESTS ---');

  server = app.listen(5055);
  await new Promise((r) => setTimeout(r, 100));

  try {
    // 0. Health check
    const healthRes = await request('GET', '/health');
    console.log('✓ GET /health:', healthRes.status, healthRes.body.status);

    // 1. POST /api/auth/register
    const registerPayload = {
      name: 'John Doe Citizen',
      email: 'citizen.john@example.com',
      phone: '+254712345678',
      password: 'StrongPassword123!',
      role: 'CITIZEN',
      ward: 'Central Ward',
    };
    const regRes = await request('POST', '/api/auth/register', registerPayload);
    console.log('✓ POST /api/auth/register:', regRes.status, regRes.body.message);
    if (regRes.status !== 201) throw new Error('Registration failed');

    const verificationCode = regRes.body.data.verificationCode;
    let accessToken = regRes.body.data.accessToken;
    let refreshToken = regRes.body.data.refreshToken;

    const verifyRes = await request('POST', '/api/auth/verify', {
      identifier: 'citizen.john@example.com',
      code: verificationCode,
    });
    console.log('✓ POST /api/auth/verify:', verifyRes.status, verifyRes.body.message);
    if (verifyRes.status !== 200) throw new Error('Verification failed');

    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'citizen.john@example.com',
      password: 'StrongPassword123!',
    });
    console.log('✓ POST /api/auth/login:', loginRes.status, loginRes.body.message);
    if (loginRes.status !== 200) throw new Error('Login failed');

    accessToken = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;
    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    console.log('✓ GET /api/auth/me:', meRes.status, 'User Name:', meRes.body.data?.user?.name);
    if (meRes.status !== 200 || !meRes.body.data?.user?.email) throw new Error('Get Me failed');

    // 5. POST /api/auth/refresh
    const refreshRes = await request('POST', '/api/auth/refresh', {
      refreshToken: refreshToken,
    });
    console.log('✓ POST /api/auth/refresh:', refreshRes.status, refreshRes.body.message);
    if (refreshRes.status !== 200) throw new Error('Token refresh failed');
    accessToken = refreshRes.body.data.accessToken;
    refreshToken = refreshRes.body.data.refreshToken;
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      identifier: 'citizen.john@example.com',
    });
    console.log('✓ POST /api/auth/forgot-password:', forgotRes.status, forgotRes.body.message);
    if (forgotRes.status !== 200) throw new Error('Forgot password failed');
    const resetToken = forgotRes.body.dev?.resetToken;
    const resetRes = await request('POST', '/api/auth/reset-password', {
      token: resetToken,
      newPassword: 'BrandNewPassword456!',
    });
    console.log('✓ POST /api/auth/reset-password:', resetRes.status, resetRes.body.message);
    if (resetRes.status !== 200) throw new Error('Reset password failed');

    // Test login with new password
    const newLoginRes = await request('POST', '/api/auth/login', {
      identifier: 'citizen.john@example.com',
      password: 'BrandNewPassword456!',
    });
    console.log('✓ POST /api/auth/login (with new password):', newLoginRes.status, newLoginRes.body.message);
    if (newLoginRes.status !== 200) throw new Error('Login with new password failed');

    // 8. POST /api/auth/logout
    const logoutRes = await request('POST', '/api/auth/logout', {
      refreshToken: newLoginRes.body.data.refreshToken,
    });
    console.log('✓ POST /api/auth/logout:', logoutRes.status, logoutRes.body.message);
    if (logoutRes.status !== 200) throw new Error('Logout failed');

    console.log('\n');
    console.log('ALL 8 ESM AUTH SUITE ENDPOINTS PASSED CLEANLY!');
    console.log('\n');
  } catch (error) {
    console.error('TEST ERROR:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close(() => {
        process.exit(process.exitCode || 0);
      });
    } else {
      process.exit(0);
    }
  }
}

runTests();
