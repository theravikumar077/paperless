async function testVercel() {
  const endpoints = [
    '/api/health',
    '/api/auth/login',
    '/api',
    '/api/',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch('https://paperless-doc.vercel.app' + ep, {
        method: ep.includes('login') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: ep.includes('login') ? JSON.stringify({ email: 'test@example.com', password: 'password' }) : undefined,
      });
      console.log(ep, '-> Status:', res.status);
      const text = await res.text();
      console.log('   Response:', text.substring(0, 100));
    } catch (e) {
      console.log(ep, '-> Error:', e.message);
    }
  }
}
testVercel();
