import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_APP_VERSION } from './version';

// The version lives in three places: the Android build, the update manifest the
// in-app updater reads, and the web app's own label. A release bumps all three.
const root = new URL('../../', import.meta.url);
const gradle = readFileSync(new URL('android/app/build.gradle', root), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('version.json', root), 'utf8'));

describe('app version', () => {
  it('matches android/app/build.gradle', () => {
    expect(Number(gradle.match(/versionCode\s+(\d+)/)?.[1])).toBe(CURRENT_APP_VERSION.versionCode);
    expect(gradle.match(/versionName\s+"([^"]+)"/)?.[1]).toBe(CURRENT_APP_VERSION.versionName);
  });

  it('matches version.json, whose apkUrl names the same version', () => {
    expect(manifest.versionCode).toBe(CURRENT_APP_VERSION.versionCode);
    expect(manifest.versionName).toBe(CURRENT_APP_VERSION.versionName);
    expect(manifest.apkUrl).toMatch(new RegExp(`/squircle-todo/squircle-todo_v${CURRENT_APP_VERSION.versionName.replace(/\./g, '\\.')}\\.apk$`));
  });
});
