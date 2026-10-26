export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  releaseName: string;
  githubRepo: string;
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  versionCode: 14,
  versionName: '1.4.0',
  releaseName: 'Squircle To-Do Open Source Edition',
  githubRepo: 'https://github.com/Air-0000/squircle-todo',
};
