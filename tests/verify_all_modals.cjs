const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const SCREENSHOT_DIR = '/home/constant/.gemini/antigravity/brain/a0f71020-83d4-48e4-8426-3e1ffcbb7c23/screenshots';

async function main() {
  console.log('==> Starting Vite preview server...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8097', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('==> Starting Headless Chrome...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9224',
    '--window-size=412,915',
    'http://localhost:8097'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9224/json');
  const tabs = await tabsRes.json();
  const pageTarget = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let messageId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) { ws.removeListener('message', handler); resolve(msg.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });

  // 1. Capture RouterSyncModal under warm-morning
  console.log('==> Navigating to Settings Tab...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.setAttribute('data-theme', 'warm-morning');
      document.documentElement.classList.remove('dark');
      const settingsTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('设置'));
      if (settingsTab) settingsTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('==> Opening Router Sync Modal in warm-morning...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const syncBtn = btns.find(b => b.textContent.includes('私有云') || b.textContent.includes('局域网') || b.textContent.includes('路由'));
      if (syncBtn) syncBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'modal_routersync_warm-morning.png'), Buffer.from(shot.data, 'base64'));
  console.log('  Saved modal_routersync_warm-morning.png');

  // 2. Switch theme to warm-evening live while modal is open!
  console.log('==> Switching theme to warm-evening while modal is open...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.setAttribute('data-theme', 'warm-evening');
      document.documentElement.classList.add('dark');
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'modal_routersync_warm-evening.png'), Buffer.from(shot.data, 'base64'));
  console.log('  Saved modal_routersync_warm-evening.png');

  // Close router modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('完成'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Open Task Add Modal
  console.log('==> Opening Smart Add Task Modal in warm-evening...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const workTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('工作'));
      if (workTab) workTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('记一笔') || b.textContent.includes('新建') || b.textContent.includes('登记新突发'));
      if (addBtn) addBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'modal_addtask_warm-evening.png'), Buffer.from(shot.data, 'base64'));
  console.log('  Saved modal_addtask_warm-evening.png');

  // Switch to warm-morning live!
  console.log('==> Switching to warm-morning while Add Task modal is open...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.setAttribute('data-theme', 'warm-morning');
      document.documentElement.classList.remove('dark');
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'modal_addtask_warm-morning.png'), Buffer.from(shot.data, 'base64'));
  console.log('  Saved modal_addtask_warm-morning.png');

  chromeProcess.kill();
  viteServer.kill();
  console.log('🎉 All modal verification screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
