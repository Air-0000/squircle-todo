import { create } from 'zustand';
import { UserFeedbackItem, FeedbackType } from '../types/feedback';
import { CURRENT_APP_VERSION } from '../constants/version';
import { toast } from './useToastStore';
import { nativeBridge } from '../utils/bridge';

const FEEDBACK_STORAGE_KEY = 'squircle_user_feedbacks_v1';

function getStoredFeedbacks(): UserFeedbackItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface FeedbackState {
  feedbacks: UserFeedbackItem[];
  isSubmitting: boolean;
  isFeedbackModalOpen: boolean;

  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;
  submitFeedback: (data: {
    type: FeedbackType;
    title: string;
    content: string;
    contact?: string;
  }) => Promise<boolean>;
  clearFeedbacks: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: getStoredFeedbacks(),
  isSubmitting: false,
  isFeedbackModalOpen: false,

  openFeedbackModal: () => {
    set({ isFeedbackModalOpen: true });
    nativeBridge.performHapticFeedback('light');
  },

  closeFeedbackModal: () => {
    set({ isFeedbackModalOpen: false });
  },

  submitFeedback: async (data) => {
    set({ isSubmitting: true });

    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const appVersion = CURRENT_APP_VERSION.versionName;
      
      const newFeedback: UserFeedbackItem = {
        id: `fb-${Date.now().toString(36)}`,
        type: data.type,
        title: data.title.trim(),
        content: data.content.trim(),
        contact: data.contact?.trim() || undefined,
        createdAt: dateStr,
        appVersion: `v${appVersion}`,
        deviceInfo: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} · ${navigator.userAgent.includes('Android') ? 'Android' : 'Web'}` : 'Unknown',
        status: 'pending',
      };

      const currentList = get().feedbacks;
      const updatedList = [newFeedback, ...currentList];
      set({ feedbacks: updatedList, isSubmitting: false, isFeedbackModalOpen: false });

      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {}

      nativeBridge.performHapticFeedback('success');
      toast.success('💡 您的建议已登记，感谢支持！可在 GitHub Issues 交流反馈');

      return true;
    } catch (err: any) {
      set({ isSubmitting: false });
      toast.error(`提交失败: ${err.message || '未知错误'}`);
      return false;
    }
  },

  clearFeedbacks: () => {
    set({ feedbacks: [] });
    try {
      localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    } catch {}
    toast.info('已清空本地反馈记录');
  }
}));
