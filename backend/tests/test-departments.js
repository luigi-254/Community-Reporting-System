import http from 'http';
import app from '../index.js';
import db from '../config/db.js';
import { generateAccessToken } from '../utils/jwt.js';

process.env.NODE_ENV = 'test';
const port = 5081;

const request = (method, path, body = null, token = null) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
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
      name: 'Department Test Admin',
      email: 'department-admin@example.com',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    const token = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });

    const created = await request('POST', '/api/departments', {
      name: 'Roads and Transport',
      code: 'ROADS',
      description: 'Road infrastructure and transport services.',
    }, token);
    if (created.status !== 201) throw new Error('createDepartment failed');
    const id = created.body.data.department.id;

    const list = await request('GET', '/api/departments');
    if (list.status !== 200 || list.body.total < 1) throw new Error('getDepartments failed');

    const fetched = await request('GET', `/api/departments/${id}`);
    if (fetched.status !== 200) throw new Error('getDepartment failed');

    const updated = await request('PUT', `/api/departments/${id}`, {
      description: 'Updated roads and transport department.',
    }, token);
    if (updated.status !== 200) throw new Error('updateDepartment failed');

    const deleted = await request('DELETE', `/api/departments/${id}`, null, token);
    if (deleted.status !== 200) throw new Error('deleteDepartment failed');

    console.log('Department CRUD tests passed.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Department tests failed:', error);
    server.close(() => process.exit(1));
  }
});
