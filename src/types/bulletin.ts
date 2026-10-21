/**
 * Bulletin & Announcement Type Definitions
 * Supports update logs, important notices, security alerts and feature tips
 */

export type BulletinCategory = 'update_log' | 'important' | 'security' | 'tip' | 'feature';
export type BulletinLevel = 'info' | 'important' | 'urgent';

export interface BulletinItem {
  id: string;
  title: string;
  category: BulletinCategory;
  level: BulletinLevel;
  publishedAt: string;
  author?: string;
  summary: string;
  content: string;
  tags?: string[];
  popupOnce?: boolean;
  pinned?: boolean;
  actionUrl?: string;
  actionText?: string;
  actionTab?: string;
}
