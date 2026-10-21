import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'cycle_reset';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ConfirmDialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastStore {
  toasts: ToastMessage[];
  confirmDialog: ConfirmDialogConfig | null;

  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  showConfirm: (config: Omit<ConfirmDialogConfig, 'isOpen'>) => void;
  closeConfirm: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  confirmDialog: null,

  showToast: (message, type = 'info', duration = 2500) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts.slice(-2), newToast], // Keep at most 3 toasts on screen
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showConfirm: (config) => {
    set({
      confirmDialog: {
        ...config,
        isOpen: true,
      },
    });
  },

  closeConfirm: () => {
    set({ confirmDialog: null });
  },
}));

// Convenience helper methods
export const toast = {
  show: (message: string, type?: ToastType, duration?: number) =>
    useToastStore.getState().showToast(message, type, duration),
  success: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'success', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'info', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'warning', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'error', duration),
  cycleReset: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'cycle_reset', duration),
  confirm: (config: Omit<ConfirmDialogConfig, 'isOpen'>) =>
    useToastStore.getState().showConfirm(config),
};
