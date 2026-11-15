async function inspectLive() {
  try {
    const res = await fetch('https://paperless-doc.vercel.app');
    const html = await res.text();
    console.log('HTML length:', html.length);
    const regex = /src="([^"]+\.js)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const scriptUrl = 'https://paperless-doc.vercel.app' + match[1];
      console.log('Checking script:', scriptUrl);
      const sRes = await fetch(scriptUrl);
      const code = await sRes.text();
      const urls = code.match(/https?:\/\/[a-zA-Z0-9\.\-_:]+/g) || [];
      const interesting = urls.filter(u => 
        !u.includes('w3.org') && 
        !u.includes('github') && 
        !u.includes('google') && 
        !u.includes('vite')
      );
      console.log('Found backend URLs in script:', [...new Set(interesting)]);
    }
  } catch (err) {
    console.error(err);
  }
}
inspectLive();
