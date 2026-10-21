export type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'other';

export interface UserFeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  content: string;
  contact?: string;
  createdAt: string; // YYYY-MM-DD HH:mm
  appVersion: string;
  deviceInfo?: string;
  status: 'pending' | 'reviewing' | 'resolved';
}
