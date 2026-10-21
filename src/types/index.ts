/**
 * Central TypeScript Type Definitions for Android Squircle To-Do Application
 */

export * from './bridge';
export * from './task';
export * from './bulletin';
export * from './feedback';

import type { PersonaType, TaskPriority, CustomFieldDefinition, TodoItem } from './task';

// ==========================================
// Theme Matrix & System Preferences
// ==========================================

export type ThemeMode = 'warm-morning' | 'cool-morning' | 'warm-evening' | 'cool-evening';

export type ToneLock = 'auto' | 'warm' | 'cool';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  tone: 'warm' | 'cool';
  timeOfDay: 'morning' | 'evening';
  appBg: string;
  cardSurface: string;
  cardBorder: string;
  primaryAccent: string;
  secondaryAccent: string;
  textPrimary: string;
  textMuted: string;
  tagPillBg: string;
  tagPillText: string;
  isDark: boolean;
}

export interface ThemeState {
  theme: ThemeMode;
  autoSwitch: boolean;
  toneLock: ToneLock;
}

// ==========================================
// Category & Workflow Templates
// ==========================================

export interface CategoryItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  persona?: PersonaType;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  persona: PersonaType;
  description?: string;
  defaultPriority?: TaskPriority;
  defaultTags?: string[];
  customFields?: CustomFieldDefinition[];
  defaultSubtasks?: string[];
}

// ==========================================
// Backup & Storage Payload Contracts
// ==========================================

export interface StoragePayload {
  schemaVersion: number;
  updatedAt?: string;
  tasks: TodoItem[];
  themeState?: {
    theme: string;
    autoSwitch: boolean;
    toneLock: string;
  };
}

export interface BackupPayload {
  app: string;
  schemaVersion: number;
  appVersion?: string;
  exportedAt: string;
  themeState?: {
    theme: string;
    autoSwitch: boolean;
    toneLock: string;
  };
  tasks: TodoItem[];
  categories?: CategoryItem[];
  customTemplates?: WorkflowTemplate[];
}
