import http from 'http';
import app from '../index.js';
import db from '../config/db.js';
import { generateAccessToken } from '../utils/jwt.js';

process.env.NODE_ENV = 'test';
const port = 5084;
const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: {
    ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
    ...(token && { Authorization: `Bearer ${token}` }),
  } }, (res) => { let text = ''; res.on('data', (chunk) => { text += chunk; }); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) })); });
  req.on('error', reject); if (payload) req.write(payload); req.end();
});

const server = app.listen(port, async () => {
  try {
    const admin = await db.createUser({ name: 'Escalation Admin', email: 'escalation-admin@example.com', password: 'hashed', role: 'ADMIN' });
    const reporter = await db.createUser({ name: 'Escalation Reporter', email: 'escalation-reporter@example.com', password: 'hashed', role: 'CITIZEN' });
    const token = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });
    const report = await db.createReport({ title: 'Escalation test', description: 'A report for escalation.', category: 'ROADS', reporterId: reporter.id });

    const escalation = await request('POST', '/api/escalations', { reportId: report.id, reason: 'Urgent attention is required.', priority: 'URGENT' }, token);
    if (escalation.status !== 201) throw new Error('manuallyEscalate failed');
    const escalationId = escalation.body.data.escalation.id;
    if ((await request('GET', '/api/escalations', null, token)).status !== 200) throw new Error('getEscalatedReports failed');
    if ((await request('GET', `/api/escalations/${escalationId}`, null, token)).status !== 200) throw new Error('getEscalation failed');
    if ((await request('PATCH', `/api/escalations/${escalationId}/resolve`, { resolutionNotes: 'Reviewed and assigned for action.' }, token)).status !== 200) throw new Error('resolveEscalation failed');

    for (const endpoint of ['overview', 'reports', 'categories', 'departments', 'wards', 'performance', 'escalations']) {
      const result = await request('GET', `/api/dashboard/${endpoint}`, null, token);
      if (result.status !== 200) throw new Error(`dashboard ${endpoint} failed`);
    }
    const audit = await request('GET', '/api/audit-logs?entityType=REPORT', null, token);
    if (audit.status !== 200 || audit.body.total < 1) throw new Error('audit log viewing failed');
    console.log('Escalation, dashboard, and audit tests passed.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Escalation/dashboard/audit tests failed:', error);
    server.close(() => process.exit(1));
  }
});
