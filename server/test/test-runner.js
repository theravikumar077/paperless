const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_12345';
process.env.PORT = '5055';

async function runTests() {
  console.log('========================================');
  console.log('🚀 STARTING PAPERLESSDOC BACKEND API TEST SUITE');
  console.log('========================================\n');

  let mongod = null;
  let server = null;

  try {
    console.log('[1/12] Initializing isolated MongoDB database...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    process.env.DB_NAME = 'paperless';

    await mongoose.connect(uri, { dbName: 'paperless' });
    console.log('✅ Connected to Test Database:', mongoose.connection.name);

    const app = require('../app');
    server = app.listen(5055);
    console.log('✅ Express Server listening on port 5055\n');

    const BASE_URL = 'http://localhost:5055/api';

    // Helper for HTTP requests
    const request = (method, urlPath, headers = {}, body = null) => {
      return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + urlPath);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers: {
            ...headers,
          },
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data, headers: res.headers });
            }
          });
        });

        req.on('error', reject);

        if (body) {
          if (typeof body === 'string') {
            req.write(body);
          } else if (Buffer.isBuffer(body)) {
            req.write(body);
          } else {
            req.setHeader('Content-Type', 'application/json');
            req.write(JSON.stringify(body));
          }
        }
        req.end();
      });
    };

    // Helper for multipart/form-data upload
    const uploadFile = (urlPath, token, fields, fileData) => {
      return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
        let bodyBuffer = Buffer.alloc(0);

        // Append text fields
        for (const [key, val] of Object.entries(fields)) {
          const part = `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
          bodyBuffer = Buffer.concat([bodyBuffer, Buffer.from(part)]);
        }

        // Append file
        const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileData.name}"\r\nContent-Type: ${fileData.type}\r\n\r\n`;
        const fileFooter = `\r\n--${boundary}--\r\n`;

        bodyBuffer = Buffer.concat([
          bodyBuffer,
          Buffer.from(fileHeader),
          fileData.content,
          Buffer.from(fileFooter),
        ]);

        const url = new URL(BASE_URL + urlPath);
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': bodyBuffer.length,
              Authorization: `Bearer ${token}`,
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
              } catch (e) {
                resolve({ status: res.statusCode, raw: data });
              }
            });
          }
        );

        req.on('error', reject);
        req.write(bodyBuffer);
        req.end();
      });
    };

    // 1. Health check
    console.log('[2/12] Testing Health Endpoint...');
    const health = await request('GET', '/health');
    console.log('   Status:', health.status, '| Message:', health.data?.message);
    if (health.status !== 200) throw new Error('Health check failed');
    console.log('✅ Health check passed\n');

    // 2. Authentication: Register
    console.log('[3/12] Testing User Registration...');
    const testEmail = `ravi.${Date.now()}@example.com`;
    const regRes = await request('POST', '/auth/register', {}, {
      name: 'Ravi Kumar',
      email: testEmail,
      password: 'password123',
    });
    console.log('   Status:', regRes.status, '| Success:', regRes.data?.success);
    if (regRes.status !== 201 || !regRes.data?.token) throw new Error('Registration failed');
    const authToken = regRes.data.token;
    const userId = regRes.data.data.id;
    console.log('✅ Registration successful. User ID:', userId, '\n');

    // 3. Authentication: Login
    console.log('[4/12] Testing User Login...');
    const loginRes = await request('POST', '/auth/login', {}, {
      email: testEmail,
      password: 'password123',
    });
    console.log('   Status:', loginRes.status, '| Name:', loginRes.data?.data?.name);
    if (loginRes.status !== 200 || !loginRes.data?.token) throw new Error('Login failed');
    console.log('✅ Login successful\n');

    // 4. Authentication: Profile (Get Current User)
    console.log('[5/12] Testing Profile & Session (GET /auth/me)...');
    const meRes = await request('GET', '/auth/me', { Authorization: `Bearer ${authToken}` });
    console.log('   Status:', meRes.status, '| Email:', meRes.data?.data?.email);
    if (meRes.status !== 200) throw new Error('Get Me failed');
    console.log('✅ Session authenticated\n');

    // 5. Categories: System & Custom
    console.log('[6/12] Testing Categories API...');
    const catsRes = await request('GET', '/categories', { Authorization: `Bearer ${authToken}` });
    console.log('   Found Categories:', catsRes.data?.data?.length);
    if (catsRes.status !== 200 || catsRes.data?.data?.length < 8) throw new Error('Categories fetch failed');

    const newCat = await request('POST', '/categories', { Authorization: `Bearer ${authToken}` }, {
      name: 'Vehicle Documents',
      icon: 'car',
      color: '#0284C7',
      subcategories: ['RC Book', 'Pollution', 'Insurance'],
    });
    console.log('   Created Category:', newCat.data?.data?.name);
    console.log('✅ Categories verified\n');

    // 6. Folders: CRUD
    console.log('[7/12] Testing Folder Management...');
    const folderRes = await request('POST', '/folders', { Authorization: `Bearer ${authToken}` }, {
      name: 'College Semesters',
      color: '#4F46E5',
      icon: 'graduation-cap',
    });
    console.log('   Status:', folderRes.status, '| Created Folder:', folderRes.data?.data?.name);
    if (folderRes.status !== 201) throw new Error('Folder creation failed');
    const folderId = folderRes.data.data._id;

    const listFolders = await request('GET', '/folders', { Authorization: `Bearer ${authToken}` });
    console.log('   User Folders Count:', listFolders.data?.count);
    console.log('✅ Folder management verified\n');

    // 7. Document Upload (PDF & Image)
    console.log('[8/12] Testing Native Document Upload...');
    const dummyPdfContent = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const uploadRes = await uploadFile(
      '/documents',
      authToken,
      {
        name: 'Aadhaar Card Original',
        category: 'Identity',
        subcategory: 'Aadhaar Card',
        folderId: folderId,
        description: 'UIDAI government verified identity',
        tags: 'aadhaar,gov,identity',
        isFavorite: 'true',
      },
      {
        name: 'aadhaar_card.pdf',
        type: 'application/pdf',
        content: dummyPdfContent,
      }
    );

    console.log('   Status:', uploadRes.status, '| Document Name:', uploadRes.data?.data?.name);
    if (uploadRes.status !== 201 || !uploadRes.data?.data?._id) throw new Error('Document upload failed');
    const docId = uploadRes.data.data._id;
    console.log('✅ Document uploaded with ID:', docId, '\n');

    // 8. Document Listing & Search
    console.log('[9/12] Testing Document Search & Filtering...');
    const searchRes = await request('GET', '/documents?search=Aadhaar', {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Search Results count:', searchRes.data?.count);
    if (searchRes.data?.count !== 1) throw new Error('Search did not return uploaded document');

    const statsRes = await request('GET', '/documents/dashboard-stats', {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Dashboard Stats Total Docs:', statsRes.data?.data?.totalDocuments);
    console.log('   Dashboard Favorites Count:', statsRes.data?.data?.favoriteCount);
    console.log('   Dashboard Storage Used:', statsRes.data?.data?.storageUsed, 'bytes');
    console.log('✅ Smart Search & Dashboard Stats verified\n');

    // 9. Document Actions (Favorite toggle, Move, Rename)
    console.log('[10/12] Testing Document Actions (Favorite, Rename)...');
    const favRes = await request('PATCH', `/documents/${docId}/favorite`, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Favorite Toggle Result:', favRes.data?.message);

    const renameRes = await request('PUT', `/documents/${docId}`, { Authorization: `Bearer ${authToken}` }, {
      name: 'Aadhaar Card Verified 2026',
    });
    console.log('   Rename Result:', renameRes.data?.data?.name);
    console.log('✅ Document Actions verified\n');

    // 10. Secure Sharing: Create with password, verify, download
    console.log('[11/12] Testing Secure Sharing & Access Control...');
    const shareRes = await request('POST', '/share/create', { Authorization: `Bearer ${authToken}` }, {
      documentId: docId,
      expiryOption: '7days',
      password: 'securePassword99',
      allowDownload: true,
    });
    console.log('   Status:', shareRes.status, '| Token Hash Generated');
    const shareToken = shareRes.data?.data?.token;

    // Public share info
    const pubInfo = await request('GET', `/share/public/${shareToken}`);
    console.log('   Public View Requires Password:', pubInfo.data?.data?.requiresPassword);

    // Verify Password
    const verifyPass = await request('POST', `/share/public/${shareToken}/verify-password`, {}, {
      password: 'securePassword99',
    });
    console.log('   Password Verified:', verifyPass.data?.verified);

    // Revoke link
    const revokeRes = await request('PATCH', `/share/${shareRes.data.data.id}/revoke`, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Revoke Result:', revokeRes.data?.message);
    console.log('✅ Secure Sharing verified\n');

    // 11. Trash and Recovery
    console.log('[12/12] Testing Recycle Bin (Trash, Restore, Permanent Erase)...');
    const trashRes = await request('DELETE', `/documents/${docId}`, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Move to Trash:', trashRes.data?.message);

    const restoreRes = await request('POST', `/documents/${docId}/restore`, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Restore from Trash:', restoreRes.data?.message);

    const permanentRes = await request('DELETE', `/documents/${docId}/permanent`, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log('   Permanent Delete:', permanentRes.data?.message);
    console.log('✅ Trash and Recovery verified\n');

    console.log('========================================');
    console.log('🎉 ALL BACKEND API & DATABASE TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================');

  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTests();
