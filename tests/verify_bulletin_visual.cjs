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
  console.log('==> [1/4] Starting Vite Preview Server on port 8097...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8097', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('==> [2/4] Launching Headless Chrome (412x915 mobile viewport)...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9227',
    '--window-size=412,915',
    'http://localhost:8097'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9227/json');
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

  // Inject mock AndroidBridge and setup
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        localStorage.removeItem('squircle_read_bulletins_v1'); // Ensure bulletins are unread
        window.AndroidBridge = {
          getAppVersion: () => JSON.stringify({ versionCode: 9, versionName: '1.3.5' }),
          setStatusBarTheme: () => {},
          performHapticFeedback: () => {},
          getSafeAreaInsets: () => JSON.stringify({ top: 38, bottom: 16, left: 0, right: 0 })
        };
      } catch(e) {}
    `
  });

  await send('Page.navigate', { url: 'http://localhost:8097' });
  await new Promise(r => setTimeout(r, 2200));

  console.log('==> [3/4] Capturing Bulletin Screenshots...');

  // 1. Capture Header with Unread Bell Badge
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_01_header_unread.png'), Buffer.from(shot1.data, 'base64'));
  console.log('  Saved: bulletin_01_header_unread.png');

  // 2. Open Bulletin List Modal (Announcement Center)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const bellBtn = document.querySelector('button[aria-label="打开通知公告与更新日志"]');
      if (bellBtn) bellBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_02_center_list.png'), Buffer.from(shot2.data, 'base64'));
  console.log('  Saved: bulletin_02_center_list.png');

  // 3. Click first bulletin item to open Bulletin Detail Modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const firstItem = document.querySelector('div[class*="cursor-pointer"]');
      if (firstItem) firstItem.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_03_detail_popup.png'), Buffer.from(shot3.data, 'base64'));
  console.log('  Saved: bulletin_03_detail_popup.png');

  // 4. Close Detail Modal and Open Publish Modal (Composer)
  await send('Runtime.evaluate', {
    expression: `(() => {
      // Find "我知道了" or close button
      const closeBtn = document.querySelector('button[aria-label="关闭"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('我知道了'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  // Open list again, then click "发公告"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const bellBtn = document.querySelector('button[aria-label="打开通知公告与更新日志"]');
      if (bellBtn) bellBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const publishBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('发公告'));
      if (publishBtn) publishBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_04_composer.png'), Buffer.from(shot4.data, 'base64'));
  console.log('  Saved: bulletin_04_composer.png');

  // 5. Switch to Light Theme (晨曦暖阳)
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.setAttribute('data-theme', 'warm-morning');
      document.documentElement.classList.remove('dark');
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_05_composer_light.png'), Buffer.from(shot5.data, 'base64'));
  console.log('  Saved: bulletin_05_composer_light.png');

  // Close composer, open list modal in light mode
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('取消'));
      if (cancelBtn) cancelBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 300));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const bellBtn = document.querySelector('button[aria-label="打开通知公告与更新日志"]');
      if (bellBtn) bellBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  const shot6 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_06_center_list_light.png'), Buffer.from(shot6.data, 'base64'));
  console.log('  Saved: bulletin_06_center_list_light.png');

  // Open detail modal in light mode
  await send('Runtime.evaluate', {
    expression: `(() => {
      const firstItem = document.querySelector('div[class*="cursor-pointer"]');
      if (firstItem) firstItem.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  const shot7 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'bulletin_07_detail_light.png'), Buffer.from(shot7.data, 'base64'));
  console.log('  Saved: bulletin_07_detail_light.png');

  console.log('==> [4/4] Cleanup...');
  chromeProcess.kill();
  viteServer.kill();
  console.log('🎉 All bulletin visual verifications captured successfully!');
}

run().catch(err => {
  console.error('Error during bulletin verification:', err);
  process.exit(1);
});
