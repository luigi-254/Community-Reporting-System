import http from 'http';
import app from '../index.js';

process.env.NODE_ENV = 'test';
const port = 5080;

const request = (path) =>
  new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });

const server = app.listen(port, async () => {
  try {
    const counties = await request('/api/locations/counties');
    if (counties.status !== 200 || counties.body.total !== 47) {
      throw new Error(`Expected 47 counties, got ${counties.body.total}`);
    }

    const nairobi = counties.body.data.counties.find((county) => county.name === 'Nairobi City');
    const subCounties = await request(`/api/locations/counties/${nairobi.id}/sub-counties`);
    if (subCounties.status !== 200 || subCounties.body.total === 0) {
      throw new Error('Nairobi sub-counties were not returned');
    }

    const subCountyId = subCounties.body.data.subCounties[0].id;
    const wards = await request(`/api/locations/sub-counties/${subCountyId}/wards`);
    if (wards.status !== 200 || wards.body.total === 0) {
      throw new Error('Wards were not returned');
    }

    const missing = await request('/api/locations/counties/not-found/sub-counties');
    if (missing.status !== 404) throw new Error('Missing county should return 404');
    console.log('Location cascade tests passed: 47 counties, sub-counties, and wards.');
    server.close(() => process.exit(0));
  } catch (error) {
    console.error('Location tests failed:', error);
    server.close(() => process.exit(1));
  }
});
