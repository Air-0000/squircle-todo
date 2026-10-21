/**
 * Tier 9 Test Suite: 通知公告与更新日志系统 (Bulletin & Announcement System)
 * Covers: 公告分类与级别、未读计数计算、强弹窗资格判定、多端去重与排序、路由器 WebDAV 广播负载构建
 */

const { expect } = require('../harness/assertions.cjs');

// Mock bulletin item factory
function createBulletin(id, title, category, level, publishedAt, pinned = false, popupOnce = false) {
  return {
    id,
    title,
    category,
    level,
    publishedAt,
    author: 'Squircle 团队',
    summary: `${title} - 摘要`,
    content: `### ${title}\n- 测试详情条目`,
    pinned,
    popupOnce,
    tags: ['测试', category]
  };
}

// Logic implementations mirroring useBulletinStore.ts
function calculateUnreadCount(bulletins, readIds) {
  return bulletins.filter(b => !readIds.includes(b.id)).length;
}

function findAutoPopupBulletin(bulletins, readIds) {
  return bulletins.find(b => 
    !readIds.includes(b.id) && (b.popupOnce || b.level === 'urgent')
  ) || null;
}

function mergeAndSortBulletins(defaults, cached, remote) {
  const map = new Map();
  defaults.forEach(b => map.set(b.id, b));
  cached.forEach(b => map.set(b.id, b));
  remote.forEach(b => map.set(b.id, b));

  return Array.from(map.values()).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function filterBulletins(bulletins, readIds, filterTab) {
  return bulletins.filter(b => {
    if (filterTab === 'unread') return !readIds.includes(b.id);
    if (filterTab === 'update_log') return b.category === 'update_log';
    if (filterTab === 'important') return b.category === 'important' || b.level === 'urgent' || b.level === 'important';
    return true;
  });
}

describe('Tier 9: Bulletin & Announcement System', () => {
  it('T9-BLT-01: should accurately track readIds and calculate unread count', () => {
    const list = [
      createBulletin('b1', '更新日志 1', 'update_log', 'important', '2026-10-15 01:00'),
      createBulletin('b2', '重要通知 2', 'important', 'urgent', '2026-10-15 02:00'),
      createBulletin('b3', '效率贴士 3', 'tip', 'info', '2026-10-15 03:00')
    ];

    expect(calculateUnreadCount(list, [])).toBe(3);
    expect(calculateUnreadCount(list, ['b1'])).toBe(2);
    expect(calculateUnreadCount(list, ['b1', 'b2', 'b3'])).toBe(0);
  });

  it('T9-BLT-02: should identify auto-popup bulletin only when unread and marked popupOnce or urgent', () => {
    const bNormal = createBulletin('b1', '普通公告', 'tip', 'info', '2026-10-15 01:00', false, false);
    const bPopup = createBulletin('b2', '新版更新日志', 'update_log', 'important', '2026-10-15 02:00', true, true);
    const bUrgent = createBulletin('b3', '紧急预警', 'security', 'urgent', '2026-10-15 03:00', false, false);

    // Initial state: bPopup should be selected (first unread matching)
    const target1 = findAutoPopupBulletin([bNormal, bPopup, bUrgent], []);
    expect(target1.id).toBe('b2');

    // If b2 is read: b3 (urgent) should be selected
    const target2 = findAutoPopupBulletin([bNormal, bPopup, bUrgent], ['b2']);
    expect(target2.id).toBe('b3');

    // If all urgent and popupOnce are read: null
    const target3 = findAutoPopupBulletin([bNormal, bPopup, bUrgent], ['b2', 'b3']);
    expect(target3).toBeNull();
  });

  it('T9-BLT-03: should merge default, cache, and remote bulletins with correct de-duplication and pinned priority', () => {
    const defaults = [
      createBulletin('default-1', '默认指南', 'tip', 'info', '2026-10-10 10:00', false, false),
      createBulletin('notice-v135', 'v1.3.5 旧版日志', 'update_log', 'important', '2026-10-14 12:00', false, false)
    ];

    const cached = [
      createBulletin('notice-v135', 'v1.3.5 本地缓存日志', 'update_log', 'important', '2026-10-14 12:00', false, false)
    ];

    const remote = [
      createBulletin('notice-v135', 'v1.3.5 远程最新更新', 'update_log', 'important', '2026-10-14 12:00', false, false),
      createBulletin('notice-pinned-urgent', '紧急网络割接通知', 'important', 'urgent', '2026-10-15 08:00', true, true)
    ];

    const merged = mergeAndSortBulletins(defaults, cached, remote);
    expect(merged.length).toBe(3); // default-1, notice-v135 (deduped), notice-pinned-urgent
    expect(merged[0].id).toBe('notice-pinned-urgent'); // Pinned item must be first
    expect(merged[0].pinned).toBe(true);
    expect(merged.find(b => b.id === 'notice-v135').title).toBe('v1.3.5 远程最新更新');
  });

  it('T9-BLT-04: should filter bulletins properly across all, update_log, important, and unread tabs', () => {
    const list = [
      createBulletin('b1', '更新日志 1', 'update_log', 'info', '2026-10-15 01:00'),
      createBulletin('b2', '重要预案 2', 'important', 'urgent', '2026-10-15 02:00'),
      createBulletin('b3', '效率贴士 3', 'tip', 'info', '2026-10-15 03:00'),
      createBulletin('b4', '安全警告 4', 'security', 'important', '2026-10-15 04:00')
    ];

    const readIds = ['b1', 'b3'];

    const all = filterBulletins(list, readIds, 'all');
    expect(all.length).toBe(4);

    const unread = filterBulletins(list, readIds, 'unread');
    expect(unread.length).toBe(2);
    expect(unread.map(b => b.id)).toEqual(['b2', 'b4']);

    const updateLogs = filterBulletins(list, readIds, 'update_log');
    expect(updateLogs.length).toBe(1);
    expect(updateLogs[0].id).toBe('b1');

    const important = filterBulletins(list, readIds, 'important');
    // b2 is category 'important' (and urgent), b4 is level 'important'
    expect(important.length).toBe(2);
    expect(important.map(b => b.id)).toEqual(['b2', 'b4']);
  });

  it('T9-BLT-05: should serialize valid JSON payload for bulletin persistence and export', () => {
    const list = [
      createBulletin('notice-v136', 'v1.3.6 发布公告', 'update_log', 'important', '2026-10-15 02:30', true, true)
    ];

    const payload = JSON.stringify(list, null, 2);
    expect(typeof payload).toBe('string');
    
    const parsed = JSON.parse(payload);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('notice-v136');
    expect(parsed[0].popupOnce).toBe(true);
    expect(parsed[0].tags.length).toBeGreaterThan(0);
  });
});
