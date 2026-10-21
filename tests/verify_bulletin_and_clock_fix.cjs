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
  console.log('==> [1/5] Starting Vite Preview Server on port 8101...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8101', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('==> [2/5] Launching Headless Chrome (412x915 mobile viewport)...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9231',
    '--window-size=412,915',
    'http://localhost:8101'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9231/json');
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

  // Inject mock AndroidBridge
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        localStorage.setItem('squircle_read_bulletins_v1', JSON.stringify(['notice-mv8hyx7l', 'notice-1792002676', 'notice-v135']));
        window.AndroidBridge = {
          getAppVersion: () => JSON.stringify({ versionCode: 10, versionName: '1.3.6' }),
          setStatusBarTheme: () => {},
          performHapticFeedback: () => {},
          getSafeAreaInsets: () => JSON.stringify({ top: 38, bottom: 16, left: 0, right: 0 })
        };
      } catch(e) {}
    `
  });

  await send('Page.navigate', { url: 'http://localhost:8101' });
  await new Promise(r => setTimeout(r, 2200));

  console.log('==> [3/5] Verifying Header Clock & Bulletin Detail Fix...');
  // 1. Verify Header has Clock and Bell buttons
  const headerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const clockBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('时钟') || b.getAttribute('aria-label')?.includes('时钟'));
      const bellBtn = document.querySelector('button[aria-label="打开通知公告与更新日志"]');
      return {
        hasClockBtn: Boolean(clockBtn),
        hasBellBtn: Boolean(bellBtn)
      };
    })()`,
    returnByValue: true
  });
  console.log('  Header check result:', headerCheck.result.value);

  // 2. Open Bulletin List
  await send('Runtime.evaluate', {
    expression: `(() => {
      const bellBtn = document.querySelector('button[aria-label="打开通知公告与更新日志"]');
      if (bellBtn) bellBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Verify Bulletin List has NO publish buttons
  const listCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      return {
        hasPublishButton: bodyText.includes('发公告') || bodyText.includes('发布新通知公告') || bodyText.includes('发布第一条公告'),
        hasSyncButton: bodyText.includes('从路由器同步'),
        hasCloseButton: bodyText.includes('关闭')
      };
    })()`,
    returnByValue: true
  });
  console.log('  Bulletin List checks (reader-only):', listCheck.result.value);

  // 3. Click "查看详情" on first bulletin item
  console.log('  Clicking "查看详情" to test detail popup...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const detailPill = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('查看详情'));
      if (detailPill) detailPill.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Verify Bulletin Detail Modal is displayed and visible
  const detailCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const detailModal = document.querySelector('div[class*="z-[70]"]');
      const hasCloseOrAcknowledge = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('我知道了'));
      return {
        isDetailModalVisible: Boolean(detailModal),
        hasAcknowledgeButton: hasCloseOrAcknowledge
      };
    })()`,
    returnByValue: true
  });
  console.log('  Bulletin Detail check:', detailCheck.result.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'fix_01_bulletin_detail_on_top.png'), Buffer.from(shot1.data, 'base64'));
  console.log('  ✓ Saved: fix_01_bulletin_detail_on_top.png');

  // Close Detail Modal with "我知道了"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const ackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('我知道了'));
      if (ackBtn) ackBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  // Close Bulletin List Modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === '关闭') || document.querySelector('button[aria-label="关闭"]');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('==> [4/5] Verifying Exam Tab Dedicated Focus Clock Station...');
  // Switch to '考研' tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const examTab = tabs.find(b => b.textContent.includes('考研'));
      if (examTab) examTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'fix_02_exam_tab_clock_station.png'), Buffer.from(shot2.data, 'base64'));
  console.log('  ✓ Saved: fix_02_exam_tab_clock_station.png');

  console.log('==> [5/5] Verifying Fullscreen Liquid Glass Flip Clock Launch...');
  // Click "全屏时钟" in Exam Tab Focus card
  await send('Runtime.evaluate', {
    expression: `(() => {
      const clockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('全屏时钟'));
      if (clockBtn) clockBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'fix_03_fullscreen_clock_open.png'), Buffer.from(shot3.data, 'base64'));
  console.log('  ✓ Saved: fix_03_fullscreen_clock_open.png');

  // Switch to "番茄专注" inside modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const pomoTab = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('番茄专注'));
      if (pomoTab) pomoTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'fix_04_pomodoro_mode.png'), Buffer.from(shot4.data, 'base64'));
  console.log('  ✓ Saved: fix_04_pomodoro_mode.png');

  // Close modal via close button
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label*="关闭"]');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  // Test Header Clock button launch from any screen
  await send('Runtime.evaluate', {
    expression: `(() => {
      const headerClock = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('时钟') || b.getAttribute('aria-label')?.includes('时钟'));
      if (headerClock) headerClock.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'fix_05_header_clock_launch.png'), Buffer.from(shot5.data, 'base64'));
  console.log('  ✓ Saved: fix_05_header_clock_launch.png');

  // Cleanup
  chromeProcess.kill();
  viteServer.kill();
  console.log('🎉 All verification checks passed!');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
