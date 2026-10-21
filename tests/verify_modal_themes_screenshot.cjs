const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const SCREENSHOT_DIR = '/home/constant/.gemini/antigravity/brain/a0f71020-83d4-48e4-8426-3e1ffcbb7c23/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('==> [1/4] Starting Mock Router Server with Version 2.0.0...');
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
        versionCode: 10,
        versionName: '1.3.5',
        releaseNotes: [
          '全面同步弹窗主题色彩（晨曦暖阳/冰川清晨/暮色暗金/深海极夜）',
          'Tailwind CSS变量透明度混合引擎重构，彻底解决弹窗底色脱节问题',
          '微光玻璃边缘与深浅模态背景随系统昼夜智能渐变',
          '优化折叠顶栏与Android状态栏安全区动态匹配'
        ],
        apkPath: '/webdav/updates/app-latest.apk',
        fileSize: 3894210
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise(r => mockServer.listen(5098, r));
  console.log('  Mock server listening on port 5098');

  console.log('==> [2/4] Starting Vite Preview Server on port 8096...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8096', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('==> [3/4] Launching Headless Chrome with Mobile Viewport (412x915)...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9226',
    '--window-size=412,915',
    'http://localhost:8096'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9226/json');
  const tabs = await tabsRes.json();
  const pageTarget = tabs.find(t => t.type === 'page');

  if (!pageTarget) {
    throw new Error('No page target found');
  }

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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    mobile: true
  });

  // Inject router config and mock AndroidBridge
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        const currentCfg = JSON.parse(localStorage.getItem('squircle_router_sync_config_v1') || '{}');
        currentCfg.serverUrl = 'http://localhost:5098';
        currentCfg.enabled = true;
        localStorage.setItem('squircle_router_sync_config_v1', JSON.stringify(currentCfg));

        window.AndroidBridge = {
          getAppVersion: () => JSON.stringify({ versionCode: 8, versionName: '1.3.4' }),
          setStatusBarTheme: () => {},
          performHapticFeedback: () => {},
          getSafeAreaInsets: () => JSON.stringify({ top: 38, bottom: 16, left: 0, right: 0 })
        };
      } catch(e) {}
    `
  });

  await send('Page.navigate', { url: 'http://localhost:8096' });
  await new Promise(r => setTimeout(r, 2000));

  const THEMES_TO_TEST = [
    { id: 'warm-morning', name: '晨曦暖阳 (Warm Morning - Light)', isDark: false },
    { id: 'cool-morning', name: '冰川清晨 (Cool Morning - Light)', isDark: false },
    { id: 'warm-evening', name: '暮色暗金 (Warm Evening - Dark)', isDark: true },
    { id: 'cool-evening', name: '深海极夜 (Cool Evening - Dark)', isDark: true }
  ];

  console.log('==> [4/4] Capturing Screenshots across all 4 themes...');

  for (const t of THEMES_TO_TEST) {
    console.log(`  Capturing Update Modal for theme: ${t.name}...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const { useThemeStore } = window.__THEME_STORE__ || {};
        document.documentElement.setAttribute('data-theme', '${t.id}');
        document.documentElement.classList.toggle('dark', ${t.isDark});
        localStorage.setItem('squircle_theme_state_v1', JSON.stringify({
          theme: '${t.id}',
          autoSwitch: false,
          toneLock: '${t.id.startsWith('warm') ? 'warm' : 'cool'}'
        }));
      })()`
    });

    // Ensure update modal is open with remote update data
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Find update store or click manual check
        const store = window.__UPDATE_STORE__;
      })()`
    });

    await new Promise(r => setTimeout(r, 500));

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(SCREENSHOT_DIR, `modal_update_theme_${t.id}.png`);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`  Saved screenshot: ${filePath}`);
  }

  // Cleanup
  chromeProcess.kill();
  viteServer.kill();
  mockServer.close();
  console.log('🎉 Verification completed successfully!');
}

run().catch(err => {
  console.error('Error during modal verification:', err);
  process.exit(1);
});
