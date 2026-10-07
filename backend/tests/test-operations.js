import http from 'http';
import app from '../index.js';
import db from '../config/db.js';
import { generateAccessToken } from '../utils/jwt.js';

process.env.NODE_ENV = 'test';
const port = 5083;
const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: {
    ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
    ...(token && { Authorization: `Bearer ${token}` }),
  } }, (res) => {
    let text = '';
    res.on('data', (chunk) => { text += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const server = app.listen(port, async () => {
  try {
    const admin = await db.createUser({ name: 'Operations Admin', email: 'operations-admin@example.com', password: 'hashed', role: 'ADMIN' });
    const officer = await db.createOfficer({ name: 'Operations Officer', email: 'operations-officer@example.com', password: 'hashed' });
    const reporter = await db.createUser({ name: 'Reporter', email: 'operations-reporter@example.com', password: 'hashed', role: 'CITIZEN' });
    const token = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });
    const report = await db.createReport({ title: 'Operations test report', description: 'A report for assignment testing.', category: 'ROADS', reporterId: reporter.id });

    const assigned = await request('POST', '/api/assignments', { reportId: report.id, officerId: officer.id }, token);
    if (assigned.status !== 201) throw new Error('assignReport failed');
    const reassigned = await request('PUT', `/api/assignments/${report.id}/reassign`, { officerId: officer.id }, token);
    if (reassigned.status !== 200) throw new Error('reassignReport failed');
    const history = await request('GET', `/api/assignments/history/${report.id}`, null, token);
    if (history.status !== 200 || history.body.total < 2) throw new Error('getAssignmentHistory failed');

    const rule = await request('POST', '/api/routing-rules', { name: 'Roads rule', category: 'ROADS', officerId: officer.id }, token);
    if (rule.status !== 201) throw new Error('createRoutingRule failed');
    const ruleId = rule.body.data.rule.id;
    if ((await request('GET', '/api/routing-rules', null, token)).status !== 200) throw new Error('getRoutingRules failed');
    if ((await request('GET', `/api/routing-rules/${ruleId}`, null, token)).status !== 200) throw new Error('getRoutingRule failed');
    if ((await request('PUT', `/api/routing-rules/${ruleId}`, { isActive: false }, token)).status !== 200) throw new Error('updateRoutingRule failed');
    if ((await request('DELETE', `/api/routing-rules/${ruleId}`, null, token)).status !== 200) throw new Error('deleteRoutingRule failed');

    const notification = await db.createNotification({ userId: admin.id, title: 'Test', message: 'Notification test' });
    if ((await request('GET', '/api/notifications', null, token)).status !== 200) throw new Error('getNotifications failed');
    if ((await request('GET', '/api/notifications/unread', null, token)).status !== 200) throw new Error('getUnreadNotifications failed');
    if ((await request('PATCH', `/api/notifications/${notification.id}/read`, null, token)).status !== 200) throw new Error('markAsRead failed');
    if ((await request('PATCH', '/api/notifications/read-all', null, token)).status !== 200) throw new Error('markAllAsRead failed');
    if ((await request('DELETE', `/api/notifications/${notification.id}`, null, token)).status !== 200) throw new Error('deleteNotification failed');

    console.log('Assignment, routing, and notification tests passed.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Operations tests failed:', error);
    server.close(() => process.exit(1));
  }
});
