import http from 'http';

process.env.NODE_ENV = 'test';
process.env.PORT = '5066';

import app from '../index.js';
import db from '../config/db.js';
import { generateAccessToken } from '../utils/jwt.js';

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
        port: 5066,
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

async function runReportTests() {
  console.log('--- STARTING REPORT CONTROLLER & ROUTES TESTS ---');

  server = app.listen(5066);
  await new Promise((r) => setTimeout(r, 100));

  try {
    // 0. Seed a citizen user and an officer user
    const citizen = await db.createUser({
      name: 'Alice Citizen',
      email: 'alice.citizen@example.com',
      password: 'hashedpassword',
      role: 'CITIZEN',
      ward: 'Kilimani Ward',
    });
    const citizenToken = generateAccessToken({
      id: citizen.id,
      email: citizen.email,
      role: citizen.role,
    });

    const officer = await db.createUser({
      name: 'Officer Bob',
      email: 'bob.officer@example.com',
      password: 'hashedpassword',
      role: 'OFFICER',
    });
    const officerToken = generateAccessToken({
      id: officer.id,
      email: officer.email,
      role: officer.role,
    });

    // 1. POST /api/reports - createReport
    const reportData = {
      title: 'Major Pothole on Argwings Kodhek Road',
      description: 'Dangerous pothole damaging vehicles right next to the shopping center.',
      category: 'Roads & Infrastructure',
      priority: 'HIGH',
      location: 'Argwings Kodhek Road, near Yaya Centre',
      ward: 'Kilimani Ward',
      county: 'Nairobi',
      latitude: -1.2921,
      longitude: 36.7842,
    };

    const createRes = await request('POST', '/api/reports', reportData, {
      Authorization: `Bearer ${citizenToken}`,
    });
    console.log('✓ 1. createReport (POST /api/reports):', createRes.status, createRes.body.message);
    if (createRes.status !== 201) throw new Error('createReport failed');
    const createdReportId = createRes.body.data.report.id;

    // 2. GET /api/reports - getReports
    const listRes = await request('GET', '/api/reports');
    console.log('✓ 2. getReports (GET /api/reports):', listRes.status, `Total: ${listRes.body.data?.total}`);
    if (listRes.status !== 200 || !listRes.body.data?.reports?.length) throw new Error('getReports failed');

    // 3. GET /api/reports/:id - getReport
    const getRes = await request('GET', `/api/reports/${createdReportId}`);
    console.log('✓ 3. getReport (GET /api/reports/:id):', getRes.status, getRes.body.data?.report?.title);
    if (getRes.status !== 200) throw new Error('getReport failed');

    // 4. GET /api/reports/me - getMyReports
    const myRes = await request('GET', '/api/reports/me', null, {
      Authorization: `Bearer ${citizenToken}`,
    });
    console.log('✓ 4. getMyReports (GET /api/reports/me):', myRes.status, `Count: ${myRes.body.data?.total}`);
    if (myRes.status !== 200 || myRes.body.data?.total < 1) throw new Error('getMyReports failed');

    // 5. PUT /api/reports/:id - updateReport
    const updateRes = await request(
      'PUT',
      `/api/reports/${createdReportId}`,
      {
        title: 'Major Pothole and Broken Curb on Argwings Kodhek',
        priority: 'URGENT',
      },
      {
        Authorization: `Bearer ${citizenToken}`,
      }
    );
    console.log('✓ 5. updateReport (PUT /api/reports/:id):', updateRes.status, updateRes.body.message);
    if (updateRes.status !== 200 || updateRes.body.data?.report?.priority !== 'URGENT') throw new Error('updateReport failed');

    // 6. PATCH /api/reports/:id/status - changeStatus (Officer marks IN_PROGRESS then RESOLVED)
    const inProgressRes = await request(
      'PATCH',
      `/api/reports/${createdReportId}/status`,
      {
        status: 'IN_PROGRESS',
        notes: 'Road maintenance crew deployed to fill the pothole.',
      },
      {
        Authorization: `Bearer ${officerToken}`,
      }
    );
    console.log('✓ 6a. changeStatus to IN_PROGRESS:', inProgressRes.status, inProgressRes.body.data?.report?.status);

    const resolveRes = await request(
      'PATCH',
      `/api/reports/${createdReportId}/status`,
      {
        status: 'RESOLVED',
        resolutionNotes: 'Curb repaired and pothole filled with asphalt overlay.',
      },
      {
        Authorization: `Bearer ${officerToken}`,
      }
    );
    console.log('✓ 6b. changeStatus to RESOLVED:', resolveRes.status, resolveRes.body.data?.report?.status);
    if (resolveRes.status !== 200) throw new Error('changeStatus failed');

    // 7. POST /api/reports/:id/reject-resolution - rejectResolution (Citizen tests rejecting resolution)
    const rejectRes = await request(
      'POST',
      `/api/reports/${createdReportId}/reject-resolution`,
      {
        reason: 'The pothole was only partially filled and loose gravel remains dangerous.',
      },
      {
        Authorization: `Bearer ${citizenToken}`,
      }
    );
    console.log('✓ 7. rejectResolution:', rejectRes.status, rejectRes.body.message);
    if (rejectRes.status !== 200 || rejectRes.body.data?.report?.status !== 'IN_PROGRESS') throw new Error('rejectResolution failed');

    // 8. Officer re-resolves
    await request(
      'PATCH',
      `/api/reports/${createdReportId}/status`,
      {
        status: 'RESOLVED',
        resolutionNotes: 'Asphalt steamroller passed again, fully smoothed out.',
      },
      {
        Authorization: `Bearer ${officerToken}`,
      }
    );

    // 9. POST /api/reports/:id/accept-resolution - acceptResolution
    const acceptRes = await request(
      'POST',
      `/api/reports/${createdReportId}/accept-resolution`,
      {
        feedback: 'Road is now completely smooth. Great work by county roads team!',
        rating: 5,
      },
      {
        Authorization: `Bearer ${citizenToken}`,
      }
    );
    console.log('✓ 8. acceptResolution:', acceptRes.status, acceptRes.body.message);
    if (acceptRes.status !== 200 || acceptRes.body.data?.report?.resolutionStatus !== 'ACCEPTED') throw new Error('acceptResolution failed');

    // 10. GET /api/reports/search - searchReports
    const searchRes = await request('GET', '/api/reports/search?q=Argwings');
    console.log('✓ 9. searchReports (GET /api/reports/search?q=Argwings):', searchRes.status, `Found: ${searchRes.body.data?.total}`);
    if (searchRes.status !== 200 || searchRes.body.data?.total < 1) throw new Error('searchReports failed');

    // 11. GET /api/reports/filter - filterReports
    const filterRes = await request('GET', '/api/reports/filter?status=RESOLVED&ward=Kilimani');
    console.log('✓ 10. filterReports (GET /api/reports/filter):', filterRes.status, `Filtered: ${filterRes.body.data?.total}`);
    if (filterRes.status !== 200 || filterRes.body.data?.total < 1) throw new Error('filterReports failed');

    // 12. Create another report to test deleteReport
    const tempReport = await request('POST', '/api/reports', {
      title: 'Temporary Duplicate Report',
      description: 'This is a duplicate test report to verify delete functionality.',
      category: 'Public Health',
      priority: 'LOW',
    }, {
      Authorization: `Bearer ${citizenToken}`,
    });
    const tempId = tempReport.body.data.report.id;

    // DELETE /api/reports/:id - deleteReport
    const deleteRes = await request('DELETE', `/api/reports/${tempId}`, null, {
      Authorization: `Bearer ${citizenToken}`,
    });
    console.log('✓ 11. deleteReport (DELETE /api/reports/:id):', deleteRes.status, deleteRes.body.message);
    if (deleteRes.status !== 200) throw new Error('deleteReport failed');

    console.log('\n======================================================');
    console.log('ALL 11 REPORT ACTIONS AND ROUTES VERIFIED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (error) {
    console.error('REPORT TEST ERROR:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  }
}

runReportTests();
