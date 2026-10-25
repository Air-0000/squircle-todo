/** Suggestions and bug notes the user records on this device. */
import { create } from 'zustand';
import { toDisplayDateTime } from '../domain/dates';
import { CURRENT_APP_VERSION } from '../constants/version';
import { persistSlice, readJSON, STORAGE_KEYS } from '../utils/storage';

export type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'other';

export interface FeedbackItem {
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

interface FeedbackState {
  feedbacks: FeedbackItem[];
  submit: (data: Pick<FeedbackItem, 'type' | 'title' | 'content' | 'contact'>) => FeedbackItem;
  clear: () => void;
}

function deviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown';
  return `${window.innerWidth}x${window.innerHeight} · ${navigator.userAgent.includes('Android') ? 'Android' : 'Web'}`;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: readJSON<FeedbackItem[]>(STORAGE_KEYS.feedback) ?? [],

  submit: data => {
    const item: FeedbackItem = {
      id: `fb-${Date.now().toString(36)}`,
      type: data.type,
      title: data.title.trim(),
      content: data.content.trim(),
      contact: data.contact?.trim() || undefined,
      createdAt: toDisplayDateTime(),
      appVersion: `v${CURRENT_APP_VERSION.versionName}`,
      deviceInfo: deviceInfo(),
      status: 'pending',
    };
    set({ feedbacks: [item, ...get().feedbacks] });
    return item;
  },
  clear: () => set({ feedbacks: [] }),
}));

persistSlice(useFeedbackStore, STORAGE_KEYS.feedback, s => s.feedbacks);
