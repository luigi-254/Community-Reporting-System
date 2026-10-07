import http from 'http';

process.env.NODE_ENV = 'test';
process.env.PORT = '5077';

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
        port: 5077,
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

async function runCategoryTests() {
  console.log('--- STARTING CATEGORY & SUBCATEGORY TESTS ---');

  server = app.listen(5077);
  await new Promise((r) => setTimeout(r, 100));

  try {
    // 0. Seed admin user
    const admin = await db.createUser({
      name: 'System Admin',
      email: 'admin.cat@example.com',
      password: 'hashedpassword',
      role: 'ADMIN',
    });
    const adminToken = generateAccessToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    // 1. POST /api/categories - createCategory
    const catRes = await request(
      'POST',
      '/api/categories',
      {
        name: 'Roads & Transport',
        code: 'ROADS',
        description: 'Potholes, road signs, traffic signals, sidewalks, and drainage.',
        icon: 'road',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 1. createCategory:', catRes.status, catRes.body.data?.category?.name);
    if (catRes.status !== 201) throw new Error('createCategory failed');
    const categoryId = catRes.body.data.category.id;

    // 2. GET /api/categories - getCategories
    const listRes = await request('GET', '/api/categories');
    console.log('✓ 2. getCategories:', listRes.status, `Total: ${listRes.body.total}`);
    if (listRes.status !== 200 || listRes.body.total < 1) throw new Error('getCategories failed');

    // 3. GET /api/categories/:id - getCategory
    const getRes = await request('GET', `/api/categories/${categoryId}`);
    console.log('✓ 3. getCategory:', getRes.status, getRes.body.data?.category?.name);
    if (getRes.status !== 200) throw new Error('getCategory failed');

    // 4. PUT /api/categories/:id - updateCategory
    const updateRes = await request(
      'PUT',
      `/api/categories/${categoryId}`,
      {
        description: 'Updated: Roads, bridges, sidewalks, traffic lights, and public transport infrastructure.',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 4. updateCategory:', updateRes.status, updateRes.body.message);
    if (updateRes.status !== 200) throw new Error('updateCategory failed');

    // 5. POST /api/subcategories - createSubcategory
    const subRes = await request(
      'POST',
      '/api/subcategories',
      {
        categoryId: categoryId,
        name: 'Dangerous Potholes',
        code: 'POTHOLE',
        description: 'Deep road potholes causing vehicle damage or hazard.',
        defaultPriority: 'HIGH',
        slaHours: 24,
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 5. createSubcategory:', subRes.status, subRes.body.data?.subcategory?.name);
    if (subRes.status !== 201) throw new Error('createSubcategory failed');
    const subcategoryId = subRes.body.data.subcategory.id;

    // 6. GET /api/subcategories - getSubcategories
    const listSubRes = await request('GET', `/api/subcategories?categoryId=${categoryId}`);
    console.log('✓ 6. getSubcategories:', listSubRes.status, `Total: ${listSubRes.body.total}`);
    if (listSubRes.status !== 200 || listSubRes.body.total < 1) throw new Error('getSubcategories failed');

    // 7. GET /api/subcategories/:id - getSubcategory
    const getSubRes = await request('GET', `/api/subcategories/${subcategoryId}`);
    console.log('✓ 7. getSubcategory:', getSubRes.status, getSubRes.body.data?.subcategory?.name);
    if (getSubRes.status !== 200) throw new Error('getSubcategory failed');

    // 8. PUT /api/subcategories/:id - updateSubcategory
    const updateSubRes = await request(
      'PUT',
      `/api/subcategories/${subcategoryId}`,
      {
        slaHours: 12,
        defaultPriority: 'URGENT',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 8. updateSubcategory:', updateSubRes.status, updateSubRes.body.message);
    if (updateSubRes.status !== 200) throw new Error('updateSubcategory failed');

    // 9. DELETE /api/subcategories/:id - deleteSubcategory
    const delSubRes = await request(
      'DELETE',
      `/api/subcategories/${subcategoryId}`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 9. deleteSubcategory:', delSubRes.status, delSubRes.body.message);
    if (delSubRes.status !== 200) throw new Error('deleteSubcategory failed');

    // 10. DELETE /api/categories/:id - deleteCategory
    const delCatRes = await request(
      'DELETE',
      `/api/categories/${categoryId}`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('✓ 10. deleteCategory:', delCatRes.status, delCatRes.body.message);
    if (delCatRes.status !== 200) throw new Error('deleteCategory failed');

    console.log('\n======================================================');
    console.log('ALL CATEGORY & SUBCATEGORY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (error) {
    console.error('CATEGORY TEST ERROR:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  }
}

runCategoryTests();
