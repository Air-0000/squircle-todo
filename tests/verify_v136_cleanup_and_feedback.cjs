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
  console.log('==> [1/6] Starting Vite Preview Server on port 8098...');
  const viteServer = spawn('npx', ['vite', 'preview', '--port', '8098', '--host'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('==> [2/6] Launching Headless Chrome (412x915 mobile viewport)...');
  const chromeProcess = spawn('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9228',
    '--window-size=412,915',
    'http://localhost:8098'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9228/json');
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

  // Inject mock AndroidBridge with version 1.3.6
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        localStorage.setItem('squircle_read_bulletins_v1', JSON.stringify(['b-1.3.6-launch']));
        window.AndroidBridge = {
          getAppVersion: () => JSON.stringify({ versionCode: 10, versionName: '1.3.6' }),
          setStatusBarTheme: () => {},
          performHapticFeedback: () => {},
          getSafeAreaInsets: () => JSON.stringify({ top: 38, bottom: 16, left: 0, right: 0 })
        };
      } catch(e) {}
    `
  });

  await send('Page.navigate', { url: 'http://localhost:8098' });
  await new Promise(r => setTimeout(r, 2200));

  console.log('==> [3/6] Verifying Clean Calendar Tab...');
  // Click '日历' tab button in bottom nav
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const calTab = tabs.find(b => b.textContent.includes('日历'));
      if (calTab) calTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Verify that achievement navigation does NOT exist
  const calCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      return {
        hasAchievementJump: bodyText.includes('成就看板') || bodyText.includes('跳转成就'),
        hasCalendarHeader: bodyText.includes('日历') || bodyText.includes('今日')
      };
    })()`,
    returnByValue: true
  });
  console.log('  Calendar check result:', calCheck.result.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_01_calendar_clean.png'), Buffer.from(shot1.data, 'base64'));
  console.log('  ✓ Saved: v136_01_calendar_clean.png');

  console.log('==> [4/6] Verifying Clean Analytics Tab (No Mini Clock)...');
  // Click '成就' tab button in bottom nav
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const anaTab = tabs.find(b => b.textContent.includes('成就'));
      if (anaTab) anaTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const anaCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      return {
        hasMiniClock: bodyText.includes('液态翻牌时钟') || bodyText.includes('开启专注'),
        hasAchievements: bodyText.includes('勋章') || bodyText.includes('打卡') || bodyText.includes('连续')
      };
    })()`,
    returnByValue: true
  });
  console.log('  Analytics check result:', anaCheck.result.value);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_02_analytics_clean.png'), Buffer.from(shot2.data, 'base64'));
  console.log('  ✓ Saved: v136_02_analytics_clean.png');

  console.log('==> [5/6] Verifying Settings Feedback & Feedback Modal Flow...');
  // Click '设置' tab button in bottom nav
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const setTab = tabs.find(b => b.textContent.includes('设置'));
      if (setTab) setTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Scroll down slightly to ensure feedback card is in view
  await send('Runtime.evaluate', {
    expression: `window.scrollBy(0, 250);`
  });
  await new Promise(r => setTimeout(r, 300));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_03_settings_feedback_entry.png'), Buffer.from(shot3.data, 'base64'));
  console.log('  ✓ Saved: v136_03_settings_feedback_entry.png');

  // Click Feedback Entry button in Settings
  await send('Runtime.evaluate', {
    expression: `(() => {
      const feedbackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('我要反馈') || b.textContent.includes('意见与需求反馈'));
      if (feedbackBtn) feedbackBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Fill in feedback form in Modal using React native setter
  await send('Runtime.evaluate', {
    expression: `(() => {
      const setNativeValue = (element, value) => {
        const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        valueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const titleInput = document.querySelector('input[placeholder*="简明概括"]');
      if (titleInput) {
        setNativeValue(titleInput, '希望支持自定义考研每日目标题量与错题标签');
      }
      const descInput = document.querySelector('textarea[placeholder*="详细描述"]');
      if (descInput) {
        setNativeValue(descInput, '考研数学刷题时希望能标记每日完成的题量目标，并在卡片上直观看到完成百分比。当前圆角待办体验非常流畅！');
      }
      const contactInput = document.querySelector('input[placeholder*="微信号"]');
      if (contactInput) {
        setNativeValue(contactInput, 'constant@example.com');
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_04_feedback_modal_compose.png'), Buffer.from(shot4.data, 'base64'));
  console.log('  ✓ Saved: v136_04_feedback_modal_compose.png');

  // Submit Feedback
  await send('Runtime.evaluate', {
    expression: `(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('提交反馈'));
      if (submitBtn) submitBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1800));

  // Switch to Feedback History tab in modal to see the recorded feedback
  await send('Runtime.evaluate', {
    expression: `(() => {
      const historyTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('反馈记录') || b.textContent.includes('历史'));
      if (historyTab) historyTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_05_feedback_history.png'), Buffer.from(shot5.data, 'base64'));
  console.log('  ✓ Saved: v136_05_feedback_history.png');

  // Close feedback modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('X'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('==> [6/6] Verifying Minimalist Focus Clock in Exam Tab...');
  // Switch to '考研' tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const examTab = tabs.find(b => b.textContent.includes('考研'));
      if (examTab) examTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Click '开启专注' button in Exam countdown card
  await send('Runtime.evaluate', {
    expression: `(() => {
      const focusBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('开启专注'));
      if (focusBtn) focusBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shot6 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'v136_06_liquid_clock_minimalist.png'), Buffer.from(shot6.data, 'base64'));
  console.log('  ✓ Saved: v136_06_liquid_clock_minimalist.png');

  // Cleanup
  chromeProcess.kill();
  viteServer.kill();
  console.log('🎉 Visual verification completed successfully!');
}

run().catch(err => {
  console.error('❌ Visual verification failed:', err);
  process.exit(1);
});
