const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIST_DIR = path.resolve(__dirname, '../dist');
const OUTPUT_DIR = '/home/constant/.gemini/antigravity/brain/a0f71020-83d4-48e4-8426-3e1ffcbb7c23/screenshots';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(DIST_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const indexPath = path.join(DIST_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

async function run() {
  await new Promise((resolve) => server.listen(0, resolve));
  const PORT = server.address().port;
  console.log(`Static server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 412,
    height: 915,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const url = `http://localhost:${PORT}`;
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  console.log('Page loaded. Capturing screenshots...');

  // Helper to click bottom tab
  async function clickTab(tabText) {
    const buttons = await page.$$('nav button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes(tabText)) {
        await b.click();
        await new Promise(r => setTimeout(r, 450));
        return true;
      }
    }
    return false;
  }

  async function switchTheme(themeName) {
    await clickTab('设置');
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes(themeName)) {
        await b.click();
        await new Promise(r => setTimeout(r, 450));
        return true;
      }
    }
    return false;
  }

  // 1. Work Tab (Default active - Warm Morning)
  await clickTab('工作');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_work_tab.png') });
  console.log('✓ 01_work_tab.png captured');

  // 1b. Click "+ 从预案库选择" to show template picker
  const pickerBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('从预案库选择'));
    if (b) { b.click(); return true; }
    return false;
  });
  if (pickerBtn) {
    await new Promise(r => setTimeout(r, 350));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_work_tab_template_picker.png') });
    console.log('✓ 01_work_tab_template_picker.png captured');
    // Close picker
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => el.textContent && el.textContent.includes('从预案库选择'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 200));
  }

  // 1c. Click manual cycle reset (↻) to trigger beautiful squircle Toast
  const clickedReset = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const resetBtn = btns.find(el => el.title && el.title.includes('手动重置'));
    if (resetBtn) { resetBtn.click(); return true; }
    return false;
  });
  if (clickedReset) {
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_work_tab_refresh_toast.png') });
    console.log('✓ 01_work_tab_refresh_toast.png captured');
    await new Promise(r => setTimeout(r, 2600)); // wait for toast to finish
  }

  // 2. Exam Tab
  await clickTab('考研');
  // Type a daily task if needed
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="快速添加今日背单词"]');
    if (input) {
      input.value = '考研英语核心高频词默写 100个';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = input.nextElementSibling;
      if (btn) btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_exam_tab.png') });
  console.log('✓ 02_exam_tab.png captured');

  // 3. Art Tab
  await clickTab('绘画');
  // Type a daily practice task to showcase the daily punch-in feature
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="快速添加今日速写"]');
    if (input) {
      input.value = '每日手势速写与色彩练习 30min';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = input.nextElementSibling;
      if (btn) btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_art_tab.png') });
  console.log('✓ 03_art_tab.png captured');

  // 4. Calendar Tab (预设事项与预案库)
  await clickTab('日历');
  // Scroll down slightly to make the bottom 预设事项与预案库 prominent
  await page.evaluate(() => window.scrollBy(0, 320));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_calendar_tab.png') });
  console.log('✓ 04_calendar_tab.png captured');

  // 4b. Open Secondary Interface (二级界面) on 【预设】员工入职流程
  const clickedEditTemplate = await page.evaluate(() => {
    const editBtns = Array.from(document.querySelectorAll('button'));
    const target = editBtns.find(b => b.textContent && b.textContent.includes('编辑子项'));
    if (target) { target.click(); return true; }
    return false;
  });
  if (clickedEditTemplate) {
    await new Promise(r => setTimeout(r, 450));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_modal_subtasks_clean.png') });
    console.log('✓ 06_modal_subtasks_clean.png (Cleaned Secondary Interface) captured');

    // Close modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find(b => b.textContent && b.textContent.trim() === '取消');
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 5. Settings Tab
  await clickTab('设置');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_settings_tab.png') });
  console.log('✓ 05_settings_tab.png captured');

  // 6. Active Emergency Detail Modal (二级处置界面: 划任务与自动完成)
  await clickTab('工作');
  const clickedActiveEmer = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('span'));
    const emer = cards.find(s => s.textContent && s.textContent.includes('地下配电房'));
    if (emer) {
      const card = emer.closest('div[class*="rounded-squircle"]');
      if (card) { card.click(); return true; }
    }
    return false;
  });
  if (clickedActiveEmer) {
    await new Promise(r => setTimeout(r, 450));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_emergency_modal.png') });
    console.log('✓ 07_emergency_modal.png (Active Emergency Subtasks Modal) captured');

    // Close modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find(b => b.textContent && b.textContent.trim() === '取消');
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 8. Theme: 冰川清晨 (Cool Morning)
  await switchTheme('冰川清晨');
  await clickTab('工作');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_theme_cool_morning.png') });
  console.log('✓ 08_theme_cool_morning.png captured');

  // 9. Theme: 暮色暗金 (Warm Evening)
  await switchTheme('暮色暗金');
  await clickTab('考研');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_theme_warm_evening.png') });
  console.log('✓ 09_theme_warm_evening.png captured');

  // 10. Theme: 深海极夜 (Cool Evening)
  await switchTheme('深海极夜');
  await clickTab('日历');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10_theme_cool_evening.png') });
  console.log('✓ 10_theme_cool_evening.png captured');

  // 11. Fullscreen Flip Clock (Live Clock)
  await switchTheme('冰川清晨');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('专注时钟'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11_focus_flip_clock.png') });
  console.log('✓ 11_focus_flip_clock.png captured');

  // 12. Fullscreen Pomodoro Focus
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('番茄专注'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_focus_pomodoro.png') });
  console.log('✓ 12_focus_pomodoro.png captured');

  // 13. Dynamic Island Capsule (Start timer & minimize)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(el => el.textContent && el.textContent.includes('开始专注'));
    if (start) start.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[title="最小化"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '14_dynamic_island_capsule.png') });
  console.log('✓ 14_dynamic_island_capsule.png captured');

  // 14. Dedicated Analytics Tab (成就) - Core stats, Streak & Quarter Heatmap
  await clickTab('成就');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '15_analytics_tab_overview.png') });
  console.log('✓ 15_analytics_tab_overview.png captured');

  // 15. Switch to 365-day year heatmap
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const yearBtn = btns.find(b => b.textContent && b.textContent.includes('全年 365 天'));
    if (yearBtn) yearBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '16_analytics_year_heatmap.png') });
  console.log('✓ 16_analytics_year_heatmap.png captured');

  // 16. Scroll down to show Embedded Flip Clock & Tri-Persona Energy Balance
  await page.evaluate(() => window.scrollBy(0, 360));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '17_analytics_flip_clock_energy.png') });
  console.log('✓ 17_analytics_flip_clock_energy.png captured');

  // 17. Scroll down to show Milestone Badges Wall & Share Report Poster
  await page.evaluate(() => window.scrollBy(0, 420));
  await new Promise(r => setTimeout(r, 400));
  // Click on a badge to showcase the badge inspector popup
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const badge = btns.find(b => b.textContent && b.textContent.includes('七日流光'));
    if (badge) badge.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '18_analytics_badges_and_report.png') });
  console.log('✓ 18_analytics_badges_and_report.png captured');

  await browser.close();
  server.close();
  console.log('All screenshots completed successfully!');


}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
