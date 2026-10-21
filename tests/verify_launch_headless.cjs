/**
 * Headless Launch Verification via Chrome DevTools Protocol
 * Tests that the production build loads in real Chrome browser with:
 * 1. Root DOM element rendered with React tree
 * 2. ZERO uncaught JavaScript runtime exceptions (no white screen / crash)
 * 3. Cold start timers and auto-sync scheduler execute safely
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = 8089;
const CDP_PORT = 9222;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('==> [1/4] Starting Vite Preview Server on port ' + PORT + '...');
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: __dirname + '/..',
    stdio: 'ignore'
  });

  await delay(1500);

  console.log('==> [2/4] Launching Google Chrome in Headless Mode with Remote Debugging...');
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${CDP_PORT}`,
    '--user-data-dir=/tmp/chrome_launch_test_' + Date.now(),
    `http://127.0.0.1:${PORT}`
  ], {
    stdio: 'ignore'
  });

  await delay(2000);

  const errors = [];
  const consoleMessages = [];

  try {
    console.log('==> [3/4] Connecting to Chrome DevTools Protocol (CDP)...');
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No page target found on CDP endpoint');
    }

    const WS = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');
    const ws = new WS(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const parsed = JSON.parse(event.data);
          if (parsed.id === id) {
            ws.removeEventListener('message', handler);
            resolve(parsed.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.method === 'Runtime.exceptionThrown') {
          errors.push(parsed.params.exceptionDetails);
        } else if (parsed.method === 'Runtime.consoleAPICalled') {
          const type = parsed.params.type;
          const text = parsed.params.args.map(a => a.value || a.description).join(' ');
          consoleMessages.push(`[${type}] ${text}`);
          if (type === 'error') {
            errors.push({ text });
          }
        }
      } catch (e) {}
    });

    await sendCommand('Runtime.enable');
    await sendCommand('Console.enable');

    console.log('==> Waiting 3.5 seconds to let cold start, React render, and auto-sync schedulers run...');
    await delay(3500);

    // Evaluate root element and title
    const evalRes = await sendCommand('Runtime.evaluate', {
      expression: '({ rootHtmlLength: document.getElementById("root") ? document.getElementById("root").innerHTML.length : 0, title: document.title, buttonsCount: document.querySelectorAll("button").length })',
      returnByValue: true
    });

    console.log('\n==> [4/4] Evaluating Launch Verification Results:');
    const pageMetrics = evalRes.result ? evalRes.result.value : null;
    console.log('  Page Title:         ', pageMetrics ? pageMetrics.title : 'N/A');
    console.log('  Root HTML Length:   ', pageMetrics ? pageMetrics.rootHtmlLength : 0, 'characters');
    console.log('  Rendered Buttons:   ', pageMetrics ? pageMetrics.buttonsCount : 0);
    console.log('  Console Messages:   ', consoleMessages.length);
    console.log('  Logged Errors:      ', errors.length);

    ws.close();

    if (errors.length > 0) {
      console.error('\n❌ CRITICAL: Uncaught runtime exceptions detected on launch:');
      errors.forEach((err, idx) => console.error(`  ${idx + 1}.`, err));
      process.exit(1);
    }

    if (!pageMetrics || pageMetrics.rootHtmlLength < 100) {
      console.error('\n❌ CRITICAL: Root DOM is empty (White Screen of Death)');
      process.exit(1);
    }

    console.log('\n🎉 SUCCESS: Application loads cleanly with ZERO crashes, complete UI rendering, and safe scheduler execution!\n');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    try { chrome.kill(); } catch (e) {}
    try { server.kill(); } catch (e) {}
  }
}

run();
