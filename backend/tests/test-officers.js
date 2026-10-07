import http from 'http';
import app from '../index.js';
import db from '../config/db.js';
import { generateAccessToken } from '../utils/jwt.js';

process.env.NODE_ENV = 'test';
const port = 5082;

const request = (method, path, body = null, token = null) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }, (res) => {
      let response = '';
      res.on('data', (chunk) => { response += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(response) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const server = app.listen(port, async () => {
  try {
    const admin = await db.createUser({
      name: 'Officer Test Admin',
      email: 'officer-admin@example.com',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    const token = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });

    const created = await request('POST', '/api/officers', {
      name: 'Jane Officer',
      email: 'jane.officer@example.com',
      password: 'secure-password',
      departmentId: 'roads-department',
    }, token);
    if (created.status !== 201) throw new Error('createOfficer failed');
    const officerId = created.body.data.officer.id;
    if (created.body.data.officer.password) throw new Error('Officer password leaked');

    const list = await request('GET', '/api/officers', null, token);
    if (list.status !== 200 || list.body.total < 1) throw new Error('getOfficers failed');

    const fetched = await request('GET', `/api/officers/${officerId}`, null, token);
    if (fetched.status !== 200 || fetched.body.data.officer.role !== 'OFFICER') {
      throw new Error('getOfficer failed');
    }

    const updated = await request('PUT', `/api/officers/${officerId}`, {
      name: 'Jane Senior Officer',
    }, token);
    if (updated.status !== 200) throw new Error('updateOfficer failed');

    const deactivated = await request('PUT', `/api/officers/${officerId}/deactivate`, null, token);
    if (deactivated.status !== 200 || deactivated.body.data.officer.isActive !== false) {
      throw new Error('deactivateOfficer failed');
    }

    const activated = await request('PUT', `/api/officers/${officerId}/activate`, null, token);
    if (activated.status !== 200 || activated.body.data.officer.isActive !== true) {
      throw new Error('activateOfficer failed');
    }

    console.log('Officer CRUD and activation tests passed.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Officer tests failed:', error);
    server.close(() => process.exit(1));
  }
});
