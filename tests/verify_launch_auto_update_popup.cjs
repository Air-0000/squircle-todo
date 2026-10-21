const http = require('http');
const { spawn } = require('child_process');

async function main() {
  console.log('==> [1/4] Starting Mock Router Server with Version 1.2.0...');
  // A mock router webdav server returning version 1.2.0 (versionCode 3)
  const mockServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/webdav/updates/version.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        versionCode: 3,
        versionName: '1.2.0',
        releaseNotes: ['彻底解决滑动卡顿', '高能效流光背景', 'Android硬件加速渲染'],
        apkPath: '/webdav/updates/app-latest.apk',
        fileSize: 3780988
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise(r => mockServer.listen(5099, r));
  console.log('  Mock server listening on port 5099');

  console.log('==> [2/4] Starting Vite Preview Server on port 8095...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8095', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('==> [3/4] Launching Headless Chrome to simulate App Open...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9227',
    'http://localhost:8095'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9227/json');
  const tabs = await tabsRes.json();
  const pageTarget = tabs.find(t => t.type === 'page');

  if (!pageTarget) {
    throw new Error('No page target found');
  }

  const WebSocket = require('ws');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let messageId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) {
        ws.removeListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  // Configure local storage router sync config to point to our mock server
  // and simulate local app version being 1.0.0 (versionCode 1)
  console.log('==> [4/4] Verifying Automatic Update Popup on App Open...');
  
  // Set localStorage and mock native AndroidBridge
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        const currentCfg = JSON.parse(localStorage.getItem('squircle_router_sync_config_v1') || '{}');
        currentCfg.serverUrl = 'http://localhost:5099';
        currentCfg.enabled = true;
        localStorage.setItem('squircle_router_sync_config_v1', JSON.stringify(currentCfg));

        window.AndroidBridge = {
          getAppVersion: () => JSON.stringify({ versionCode: 1, versionName: '1.0.0' }),
          setStatusBarTheme: () => {},
          performHapticFeedback: () => {}
        };
      } catch(e) {}
    `
  });

  // Navigate cleanly
  await send('Page.navigate', { url: 'http://localhost:8095' });

  // Wait 2.5s for cold start update check to fire
  await new Promise(r => setTimeout(r, 2500));

  // Check if update modal is opened
  const evalRes = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `
      (function() {
        const modalText = document.body.innerText;
        const hasUpdateText = modalText.includes('发现软件新版本') || modalText.includes('v1.2.0');
        const hasInstallButton = modalText.includes('立即从路由器下载并安装');
        return {
          hasUpdateText,
          hasInstallButton,
          textSnippet: modalText.slice(0, 300)
        };
      })()
    `
  });

  const value = evalRes?.result?.value || {};
  console.log('  Detection result:', value);

  ws.close();
  chromeProcess.kill();
  viteServer.kill();
  mockServer.close();

  if (value.hasUpdateText && value.hasInstallButton) {
    console.log('🎉 SUCCESS: App opened, automatically checked router update, and directly popped up the update modal!');
    process.exit(0);
  } else {
    console.error('❌ FAILED: Update modal did not pop up automatically.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
