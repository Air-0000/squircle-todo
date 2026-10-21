export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  releaseName: string;
  githubRepo: string;
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  versionCode: 6,
  versionName: '1.3.8',
  releaseName: 'Squircle To-Do Open Source Edition',
  githubRepo: 'https://github.com/Air-0000/squircle-todo',
};
