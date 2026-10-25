import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'cycle_reset';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastState {
  toasts: ToastMessage[];
  confirmDialog: ConfirmOptions | null;
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  confirmDialog: null,

  showToast: (message, type = 'info', durationMs = 2500) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set(state => ({ toasts: [...state.toasts.slice(-(MAX_VISIBLE - 1)), { id, message, type }] }));
    if (durationMs > 0) setTimeout(() => get().removeToast(id), durationMs);
  },
  removeToast: id => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  showConfirm: confirmDialog => set({ confirmDialog }),
  closeConfirm: () => set({ confirmDialog: null }),
}));

const show = (type: ToastType) => (message: string, durationMs?: number) =>
  useToastStore.getState().showToast(message, type, durationMs);

export const toast = {
  success: show('success'),
  info: show('info'),
  warning: show('warning'),
  error: show('error'),
  cycleReset: show('cycle_reset'),
  confirm: (options: ConfirmOptions) => useToastStore.getState().showConfirm(options),
};
